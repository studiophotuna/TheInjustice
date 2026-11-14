// Heists: a crew robs a bank together. The planner (crew leader) picks the job; members take
// roles. Each role succeeds or fails on its member's strengths:
//   driver (agility) gets everyone away, safecracker (wits) opens the vault,
//   lookout (perception) keeps the police slow, muscle (strength) handles the guards.
// The take is dirty money, split between the team.

import { BALANCE } from "./balance";
import { COUNTRY_BY_ID } from "./content/world";
import { addMerit, countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { crewJob } from "./family";
import { notify } from "./social";
import { sv } from "./stats";
import { GameError, type City, type Crew, type GameEvent, type HeistRole, type Player, type Rng, type StatKey } from "./types";
import { npcScrubFee } from "./incidents";
import { SCRUB } from "./firehack";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { caperEvent, type CaperStep } from "./caper";

const H = BALANCE.heist;
export const ROLES: { id: HeistRole; name: string; stat: StatKey; job: string }[] = [
  { id: "driver", name: "Driver", stat: "agility", job: "Gets everyone out." },
  { id: "safecracker", name: "Safecracker", stat: "wits", job: "Opens the vault." },
  { id: "lookout", name: "Lookout", stat: "perception", job: "Spots the police first." },
  { id: "muscle", name: "Muscle", stat: "strength", job: "Handles the guards." },
];

/** What each role does on a home job. */
const HOME_ROLE_JOB: Record<HeistRole, string> = {
  driver: "Gets everyone out.",
  safecracker: "Finds the hiding spot and opens it.",
  lookout: "Makes sure nobody walks in on you.",
  muscle: "Handles the owner if they do.",
};

const isMember = (c: Crew, id: string) => c.members.some((m) => m.id === id);

export function planHeistBlock(crew: Crew, p: Player, now: number): string | null {
  if (crew.leaderId !== p.id) return "Only the crew leader plans a heist.";
  if (crew.heist) return "There's already a job being planned.";
  if (now - (crew.lastHeistAt ?? 0) < H.cooldownMs) return "The banks are on alert after your last job. Lay low for a while.";
  if (inJail(p, now)) return "Not from a cell.";
  return null;
}

export function planHeist(crew: Crew, p: Player, now: number, target?: { id: string; name: string; home: string } | null): GameEvent[] {
  const block = planHeistBlock(crew, p, now);
  if (block) throw new GameError(block);
  crew.heist = { country: countryOf(p), plannerId: p.id, roles: {}, createdAt: now, target: target ?? null };
  const what = target ? `a job on ${target.name}'s ${target.home.toLowerCase()}` : "a bank job";
  crew.log = [{ at: now, text: `${p.name} is planning ${what} in ${COUNTRY_BY_ID[countryOf(p)].capital}. Driver, safecracker, lookout, muscle: who's in?` }, ...crew.log].slice(0, 30);
  return [{ tone: "good", text: "The job is on. Get your crew into the roles, then give the word." }];
}

export function roleBlock(crew: Crew, p: Player, role: HeistRole, now: number): string | null {
  const h = crew.heist;
  if (!h) return "There's no job planned.";
  if (!isMember(crew, p.id)) return "You're not in this crew.";
  if (h.roles[role]) return "Someone already has that role.";
  if (Object.values(h.roles).some((x) => x?.id === p.id)) return "You already have a role.";
  if (countryOf(p) !== h.country) return "The job is in another country.";
  if (inJail(p, now) || inHospital(p, now)) return "You're in no shape for it.";
  if (p.energy < H.energy) return "You're too tired.";
  return null;
}

export function takeRole(crew: Crew, p: Player, role: HeistRole, now: number): GameEvent[] {
  const block = roleBlock(crew, p, role, now);
  if (block) throw new GameError(block);
  p.energy -= H.energy;
  crew.heist!.roles[role] = { id: p.id, name: p.name };
  return [{ tone: "good", text: `You're the ${ROLES.find((r) => r.id === role)!.name.toLowerCase()} on this job.` }];
}

export function cancelHeist(crew: Crew, p: Player): GameEvent[] {
  if (!crew.heist) throw new GameError("There's no job planned.");
  if (crew.leaderId !== p.id) throw new GameError("Only the leader can call it off.");
  crew.heist = null;
  return [{ tone: "info", text: "The job is off." }];
}

/** Chance one role goes right. */
export function roleOdds(p: Player, role: HeistRole): number {
  const stat = ROLES.find((r) => r.id === role)!.stat;
  return Math.min(0.9, Math.max(0.1, 0.35 + (sv(p, stat) - 10) / 60));
}

/**
 * The leader gives the word. `team` maps role → player record. Needs a driver and a safecracker.
 */
export function runHeist(crew: Crew, leader: Player, team: Partial<Record<HeistRole, Player>>, city: City | null, now: number, rng: Rng): GameEvent[] {
  const h = crew.heist;
  if (!h) throw new GameError("There's no job planned.");
  if (crew.leaderId !== leader.id) throw new GameError("Only the leader gives the word.");
  if (!team.driver || !team.safecracker) throw new GameError("You need at least a driver and a safecracker.");
  const crackdown = !!city && city.crackdownUntil > now;
  // Soldiers standing guard at the bank make every part of the job harder.
  const guards = Math.min(3, (city?.guards ?? []).filter((g) => g.until > now).length);
  const roll = (role: HeistRole) => {
    const p = team[role];
    return !!p && rng() < roleOdds(p, role) * (crackdown ? 0.8 : 1) * (1 - 0.1 * guards);
  };
  const ok = { driver: roll("driver"), safecracker: roll("safecracker"), lookout: roll("lookout"), muscle: roll("muscle") };
  const members = Object.values(team).filter((x): x is Player => !!x);
  const heatMult = COUNTRY_BY_ID[h.country].heatMult;
  const capital = COUNTRY_BY_ID[h.country].capital;
  // The job as cards, in the order it happens.
  const title = `Bank job in ${capital}`;
  const steps: CaperStep[] = [];
  if (team.lookout) steps.push({ card: "lookout", ok: ok.lookout, who: team.lookout.name, line: ok.lookout ? "Eyes on every corner. No police." : "Nobody sees the police coming." });
  if (team.muscle) steps.push({ card: "guards", ok: ok.muscle, who: team.muscle.name, line: ok.muscle ? "The guards stay on the floor." : "The guards fight back." });
  steps.push({ card: "vault", ok: ok.safecracker, who: team.safecracker.name, line: ok.safecracker ? "The vault door swings open." : "The vault won't open." });
  steps.push({ card: "getaway", ok: ok.driver, who: team.driver.name, line: ok.driver ? "The engine's running. Everyone's in." : "The getaway car never comes." });
  crew.heist = null;
  crew.lastHeistAt = now;
  const events: GameEvent[] = [];
  if (guards) events.push({ tone: "info", text: `There were soldiers on guard at the bank (${guards}).` });

  // The take: only if the vault opened. More hands carry more out.
  const take = ok.safecracker
    ? Math.round(H.baseTake * COUNTRY_BY_ID[h.country].payMult * (1 + H.perRole * (members.length - 1)) * (ok.muscle ? 1 : 0.6))
    : 0;
  const share = members.length ? Math.floor(take / members.length) : 0;
  for (const p of members) crewJob(p, "heist", take > 0);
  for (const p of members) {
    p.heat += H.heat * heatMult * (ok.lookout ? 1 : 2);
    if (!ok.muscle) p.hp = Math.max(5, p.hp - 30);
  }

  if (!ok.driver) {
    // No getaway: everyone is caught, and the money goes back.
    for (const p of members) {
      p.jailUntil = Math.max(p.jailUntil ?? 0, now + Math.round(H.caughtMs * heatMult));
      p.jailReason = `Caught after the bank job in ${capital}.`;
      if (p.id !== leader.id) notify(p, "The getaway car never came. Everyone on the bank job got caught.", "bad", undefined, now);
    }
    crew.log = [{ at: now, text: `The bank job in ${capital} went wrong. Everyone got caught.` }, ...crew.log].slice(0, 30);
    if (city) city.log = [{ at: now, text: `Bank robbery foiled in ${capital}: the robbers were caught at the scene.` }, ...city.log].slice(0, 20);
    return [caperEvent(title, steps, "busted"), { tone: "bad", text: "The getaway car never came. You're all caught." }, ...events];
  }

  for (const p of members) {
    earnDirty(p, share);
    p.reputation += take ? 3 : 0;
    addMerit(p, "enforcer", take ? 3 : 1);
    if (p.id !== leader.id) notify(p, take ? `The bank job worked. Your share: $${share}, dirty.` : "You got away, but the vault wouldn't open.", take ? "good" : "info", undefined, now);
  }
  crew.log = [{ at: now, text: take ? `Bank job in ${capital}: $${take} split ${members.length} ways.` : `Bank job in ${capital}: away clean, vault shut.` }, ...crew.log].slice(0, 30);
  if (city) city.log = [{ at: now, text: take ? `Bank robbery in ${capital}: $${take} taken. The robbers got away.` : `Attempted bank robbery in ${capital}. Nothing taken.` }, ...city.log].slice(0, 20);
  if (!ok.muscle) events.push({ tone: "bad", text: "The guards put up a fight. Everyone took a beating." });
  if (!ok.lookout) events.push({ tone: "bad", text: "Nobody saw the police coming. Every cop in the city knows your faces now." });
  events.unshift(take ? { tone: "good", text: `The vault opens. $${take} taken; your share is $${share}, dirty.` } : { tone: "info", text: "The vault won't open. You get away with nothing." });
  events.unshift(caperEvent(title, steps, take ? (ok.lookout ? "clean" : "seen") : "empty"));
  return events;
}

export function heistView(crew: Crew, viewer: Player, now: number) {
  const h = crew.heist;
  return {
    canPlan: planHeistBlock(crew, viewer, now),
    plan: h
      ? {
          city: COUNTRY_BY_ID[h.country].capital,
          target: h.target ? `${h.target.name}'s ${h.target.home.toLowerCase()}` : null,
          isLeader: crew.leaderId === viewer.id,
          roles: ROLES.map((r) => ({ id: r.id, name: r.name, job: h.target ? HOME_ROLE_JOB[r.id] : r.job, who: h.roles[r.id]?.name ?? null, canTake: roleBlock(crew, viewer, r.id, now) })),
          ready: !!h.roles.driver && !!h.roles.safecracker,
          hacker: h.hacker?.name ?? null,
        }
      : null,
  };
}

// ── A hacker for the alarm (home jobs) ─────────────────────────────────────

/** What a hacker charges to cut an alarm: a player's own scrub fee, or a regular's going rate. */
export const alarmFee = (h: Player) => (h.regular ? npcScrubFee(h) : h.scrubService?.fee ?? SCRUB.minFee);
/** Chance the hacker gets the alarm off: better hackers, better odds (never shown to players). */
export const alarmOdds = (rank: number) => Math.min(0.9, 0.45 + 0.07 * rank);

export function hireHackerBlock(crew: Crew, leader: Player, h: Player | null, now: number): string | null {
  const plan = crew.heist;
  if (!plan?.target) return "There's no home job planned.";
  if (crew.leaderId !== leader.id) return "Only the leader hires outside help.";
  if (plan.hacker) return "You already have a hacker on it.";
  if (!h || h.dead) return "They're not around anymore.";
  if (h.path !== "hacker" || h.rank < SCRUB.minRank) return "They're not a hacker who takes this kind of work.";
  if (!h.regular && !h.scrubService?.open) return "They're not taking clients.";
  if (countryOf(h) !== plan.country) return "They work in another city.";
  if (inJail(h, now) || inHospital(h, now)) return "They're in no shape for it.";
  if (h.id === plan.target.id) return "That's the person you're robbing.";
  if (!canPayIllegal(leader, alarmFee(h))) return `They want $${alarmFee(h).toLocaleString()}, dirty money or cash.`;
  return null;
}

/** The leader pays a hacker to cut the target's alarm when the crew goes in. */
export function hireHacker(crew: Crew, leader: Player, h: Player, now: number): GameEvent[] {
  const block = hireHackerBlock(crew, leader, h, now);
  if (block) throw new GameError(block);
  const fee = alarmFee(h);
  payIllegal(leader, fee);
  earnDirty(h, fee);
  crew.heist!.hacker = { id: h.id, name: h.name, rank: h.rank };
  crew.log = [{ at: now, text: `${leader.name} hired ${h.name} to take care of the alarm.` }, ...crew.log].slice(0, 30);
  if (!h.regular) {
    shiftIntegrity(h, -1);
    addMerit(h, "hacker", SCRUB.merit);
    notify(h, `${leader.name} paid you $${fee.toLocaleString()} to cut an alarm on a job. Dirty money.`, "good", leader, now);
  }
  return [{ tone: "good", text: `${h.name} will take care of the alarm when you go in. -$${fee.toLocaleString()}` }];
}
