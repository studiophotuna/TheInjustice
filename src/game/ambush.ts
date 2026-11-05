// Crew ambushes: a crew leader plans to jump one player, and members take roles.
//
// - Attackers (1–3): their strength counts with diminishing weight (100%, +70%, +50%), so a
//   crew can take down someone far stronger than any one of them, but not someone in a league of
//   their own.
// - Driver (agility): a clean getaway. Nobody is left behind for the police, and if the ambush
//   goes wrong the attackers are pulled out early (half the damage).
// - Lookout (perception): no witnesses, the target's crewmates aren't warned in time to help, and
//   everyone's heat is halved.
//
// The target's bodyguards and (without a lookout) up to two of their online crewmates in the city
// fight back. A successful ambush puts the target in hospital with an old wound and splits what
// they were carrying; it opens an assault case, and the target gets a three-day vendetta on the
// attackers.

import { roleBonus } from "./specialties";
import { assertNotAlt } from "./anticheat";
import { BALANCE } from "./balance";
import { playerFighter, power } from "./combat";
import { addTip, crimeDistrict, eyeAccuracy, suspectProfile } from "./crime";
import { COUNTRY_BY_ID } from "./content/world";
import { countryOf, inHospital, inJail } from "./engine";
import { crewJob } from "./family";
import { bodyguarded, lyingLow } from "./hit";
import { earnDirty, takeCarried } from "./money";
import { notify, protectedUntil } from "./social";
import { sv } from "./stats";
import { GameError, type Ambush, type AmbushRole, type CaseFile, type City, type Crew, type GameEvent, type Player, type Rng } from "./types";
import { addWound, playerMaxHp } from "./wounds";

export const AMBUSH = {
  windowMs: 2 * 60 * 60_000,
  maxAttackers: 3,
  weights: [1, 0.7, 0.5],
  defenderWeights: [0.7, 0.5],
  energy: 15,
  crewCooldownMs: 12 * 60 * 60_000,
  targetCooldownMs: 24 * 60 * 60_000,
  bodyguardMult: 1.3,
  heat: 10,
  failDamage: 30,
  leftBehindChance: 0.4,
  leftBehindJailMs: 20 * 60_000,
  hospitalMs: [60 * 60_000, 3 * 60 * 60_000] as [number, number],
  rep: 3,
  vendettaMs: 3 * 24 * 60 * 60_000,
};

const strength = (p: Player) => power(playerFighter(p, playerMaxHp(p))) * (0.5 + p.hp / 200);

/** Strength of a side, strongest first, each extra fighter counting for less. */
export function sideStrength(team: Player[], weights: number[]): number {
  return [...team]
    .sort((a, b) => strength(b) - strength(a))
    .slice(0, weights.length)
    .reduce((s, p, i) => s + strength(p) * weights[i], 0);
}

const roleOdds = (p: Player, stat: "agility" | "perception") => Math.max(0.2, Math.min(0.95, 0.45 + (sv(p, stat) - 30) / 40));

function targetBlock(crew: Crew, planner: Player, t: Player, now: number): string | null {
  if (t.dead) return "They're dead.";
  if (t.crewId === crew.id) return "Not one of your own.";
  if (crew.allies?.some((a) => a.id === t.crewId)) return "They're with an allied crew.";
  if (now < protectedUntil(t)) return "They're new in town. The street protects newcomers.";
  if (inJail(t, now) || inHospital(t, now) || t.travel) return "You can't get to them right now.";
  if (lyingLow(t, now)) return "They've gone to ground. Nobody knows where they are.";
  if (countryOf(t) !== countryOf(planner)) return "They're in another country.";
  if (now - (t.ambushedAt ?? 0) < AMBUSH.targetCooldownMs) return "They were jumped recently. Even the street has limits.";
  return null;
}

export function planBlock(crew: Crew, planner: Player, t: Player, now: number): string | null {
  if (crew.leaderId !== planner.id) return "Only the crew leader plans an ambush.";
  if (crew.ambush && crew.ambush.expiresAt > now) return "The crew already has an ambush planned.";
  if (now - (crew.lastAmbushAt ?? 0) < AMBUSH.crewCooldownMs) return "The crew jumped someone recently. Lie low for a while.";
  return targetBlock(crew, planner, t, now);
}

export function planAmbush(crew: Crew, planner: Player, t: Player, now: number): GameEvent[] {
  const block = planBlock(crew, planner, t, now);
  if (block) throw new GameError(block);
  assertNotAlt(planner, t);
  crew.ambush = {
    targetId: t.id,
    targetName: t.name,
    plannerId: planner.id,
    country: countryOf(planner),
    createdAt: now,
    expiresAt: now + AMBUSH.windowMs,
    attackers: [],
    driver: null,
    lookout: null,
  };
  crew.log = [{ at: now, text: `${planner.name} is planning to jump ${t.name}. Attackers, a driver and a lookout wanted.` }, ...crew.log].slice(0, 30);
  return [{ tone: "good", text: `Ambush planned on ${t.name}. Your crew has two hours to take their places.` }];
}

const inPlan = (a: Ambush, id: string) => a.attackers.some((x) => x.id === id) || a.driver?.id === id || a.lookout?.id === id;

export function roleBlock(crew: Crew, p: Player, role: AmbushRole, now: number): string | null {
  const a = crew.ambush;
  if (!a || a.expiresAt <= now) return "There's no ambush planned.";
  if (p.crewId !== crew.id) return "You're not in the crew.";
  if (inPlan(a, p.id)) return "You already have a role.";
  if (p.id === a.targetId) return "That's you.";
  if (countryOf(p) !== a.country) return "You have to be in the city.";
  if (inJail(p, now) || inHospital(p, now)) return "You're in no shape to take part.";
  if (p.energy < AMBUSH.energy) return "You're too tired.";
  if (role === "attacker" && a.attackers.length >= AMBUSH.maxAttackers) return "Three attackers is plenty.";
  if (role === "driver" && a.driver) return "There's already a driver.";
  if (role === "lookout" && a.lookout) return "There's already a lookout.";
  return null;
}

export function takeRole(crew: Crew, p: Player, role: AmbushRole, now: number): GameEvent[] {
  const block = roleBlock(crew, p, role, now);
  if (block) throw new GameError(block);
  const a = crew.ambush!;
  const me = { id: p.id, name: p.name };
  if (role === "attacker") a.attackers.push(me);
  else if (role === "driver") a.driver = me;
  else a.lookout = me;
  const what = { attacker: "You're one of the attackers.", driver: "You'll have the car running.", lookout: "You'll be watching the street." }[role];
  return [{ tone: "good", text: what }];
}

/** The leader hires a street regular for one role. They take an equal cut. One per ambush. */
export function hireBlock(crew: Crew, leader: Player, reg: Player, role: AmbushRole, now: number): string | null {
  const a = crew.ambush;
  if (!reg.regular) return "Only street regulars are for hire.";
  if (!a || a.expiresAt <= now) return "There's no ambush planned.";
  if (crew.leaderId !== leader.id) return "Only the leader hires help.";
  if ([...a.attackers, a.driver, a.lookout].some((x) => x?.hired)) return "You already hired someone for this one.";
  if (inPlan(a, reg.id)) return "They're already in.";
  if (countryOf(reg) !== a.country) return "They're not in the city.";
  if (inJail(reg, now) || inHospital(reg, now)) return "They're in no shape for it.";
  if (role === "attacker" && a.attackers.length >= AMBUSH.maxAttackers) return "Three attackers is plenty.";
  if (role === "driver" && a.driver) return "There's already a driver.";
  if (role === "lookout" && a.lookout) return "There's already a lookout.";
  return null;
}

export function hireRegular(crew: Crew, leader: Player, reg: Player, role: AmbushRole, now: number): GameEvent[] {
  const block = hireBlock(crew, leader, reg, role, now);
  if (block) throw new GameError(block);
  const a = crew.ambush!;
  const who = { id: reg.id, name: reg.name, hired: true };
  if (role === "attacker") a.attackers.push(who);
  else if (role === "driver") a.driver = who;
  else a.lookout = who;
  crew.log = [{ at: now, text: `${leader.name} hired ${reg.name} as ${role === "attacker" ? "an attacker" : `the ${role}`}.` }, ...crew.log].slice(0, 30);
  return [{ tone: "good", text: `${reg.name} is in, for an equal cut.` }];
}

export function leaveRole(crew: Crew, p: Player): GameEvent[] {
  const a = crew.ambush;
  if (!a || !inPlan(a, p.id)) throw new GameError("You don't have a role.");
  a.attackers = a.attackers.filter((x) => x.id !== p.id);
  if (a.driver?.id === p.id) a.driver = null;
  if (a.lookout?.id === p.id) a.lookout = null;
  return [{ tone: "info", text: "You're out of it." }];
}

export function cancelAmbush(crew: Crew, p: Player, now: number): GameEvent[] {
  if (crew.leaderId !== p.id) throw new GameError("Only the leader can call it off.");
  if (!crew.ambush) throw new GameError("There's nothing planned.");
  crew.ambush = null;
  crew.log = [{ at: now, text: `${p.name} called off the ambush.` }, ...crew.log].slice(0, 30);
  return [{ tone: "info", text: "Called off." }];
}

export interface AmbushContext {
  caseId: string;
  crewTag: string | null;
  /** The target's crewmates who are online in the city (they may come to help). */
  backup: Player[];
  /** Bystanders who might see it. */
  witnesses: Player[];
}

/** Springs the ambush. All role players and the target must already be ticked. */
export function executeAmbush(
  crew: Crew,
  leader: Player,
  attackers: Player[],
  driver: Player | null,
  lookout: Player | null,
  target: Player,
  city: City | null,
  now: number,
  rng: Rng,
  ctx: AmbushContext,
): { events: GameEvent[]; caseFile: CaseFile | null } {
  const a = crew.ambush;
  if (crew.leaderId !== leader.id) throw new GameError("Only the leader gives the signal.");
  if (!a || a.expiresAt <= now) throw new GameError("There's no ambush planned, or it's too late.");
  const tb = targetBlock(crew, leader, target, now);
  if (tb) throw new GameError(tb);
  const crewHere = [...attackers, ...(driver ? [driver] : []), ...(lookout ? [lookout] : [])].filter((p) => countryOf(p) === a.country && !inJail(p, now));
  const atk = attackers.filter((p) => crewHere.includes(p));
  if (!atk.length) throw new GameError("You need at least one attacker in position.");
  for (const p of crewHere) {
    assertNotAlt(p, target);
    p.energy = Math.max(0, p.energy - AMBUSH.energy);
    crewJob(p, "war");
  }
  crew.ambush = null;
  crew.lastAmbushAt = now;
  target.ambushedAt = now;

  // A Wheelman drives cleaner; a Private eye misses less.
  const driverOk = !!driver && crewHere.includes(driver) && rng() < Math.min(0.97, roleOdds(driver, "agility") + roleBonus(driver, "wheelman"));
  const lookoutOk = !!lookout && crewHere.includes(lookout) && rng() < Math.min(0.97, roleOdds(lookout, "perception") + roleBonus(lookout, "private_eye"));
  const backup = lookoutOk ? [] : ctx.backup.filter((b) => b.id !== target.id && countryOf(b) === a.country && !inJail(b, now) && !inHospital(b, now));
  const attack = sideStrength(atk, AMBUSH.weights) * (0.85 + rng() * 0.3);
  const defense =
    (strength(target) * (bodyguarded(target, now) ? AMBUSH.bodyguardMult : 1) + sideStrength(backup, AMBUSH.defenderWeights)) * (0.85 + rng() * 0.3);
  const heatMult = COUNTRY_BY_ID[a.country].heatMult * (lookoutOk ? 0.5 : 1);
  for (const p of crewHere) p.heat += AMBUSH.heat * heatMult;
  const names = atk.map((p) => p.name).join(", ");
  const district = crimeDistrict(leader, rng);
  const events: GameEvent[] = [];
  if (driver) events.push(driverOk ? { tone: "good", text: `${driver.name} has the car right there.` } : { tone: "bad", text: `${driver.name} is nowhere to be seen when it's time to go.` });
  if (lookout) events.push(lookoutOk ? { tone: "good", text: `${lookout.name} keeps the street clear: no witnesses.` } : { tone: "bad", text: `${lookout.name} missed someone watching.` });
  if (backup.length) events.push({ tone: "bad", text: `${backup.map((b) => b.name).join(" and ")} came running to help ${target.name}.` });

  // Without a clean getaway, someone may be left behind for the police.
  if (!driverOk && rng() < AMBUSH.leftBehindChance) {
    const caught = atk[Math.floor(rng() * atk.length)];
    caught.jailUntil = Math.max(caught.jailUntil ?? 0, now + AMBUSH.leftBehindJailMs);
    caught.jailReason = `Left behind after jumping ${target.name}.`;
    events.push({ tone: "bad", text: `${caught.name} gets left behind. The police pick them up.` });
  }

  if (attack <= defense) {
    for (const p of atk) {
      p.hp = Math.max(5, p.hp - AMBUSH.failDamage * (driverOk ? 0.5 : 1));
    }
    target.reputation += 3;
    for (const b of backup) b.reputation += 2;
    notify(target, `${names} tried to jump you in ${district}. You fought them off.${backup.length ? " Your crew had your back." : ""}`, "good", undefined, now);
    crew.log = [{ at: now, text: `The ambush on ${target.name} failed.` }, ...crew.log].slice(0, 30);
    events.unshift({ tone: "bad", text: `${target.name} is too much for you.${driverOk ? " The car gets you out before it gets worse." : ""}` });
    return { events, caseFile: null };
  }

  // It works.
  target.hp = 1;
  const [lo, hi] = AMBUSH.hospitalMs;
  target.hospitalUntil = now + lo + Math.round(rng() * (hi - lo));
  addWound(target, now);
  const taken = takeCarried(target, Math.floor(target.cash + (target.dirty ?? 0)));
  const share = Math.floor(taken / crewHere.length);
  for (const p of crewHere) {
    earnDirty(p, share);
    p.reputation += AMBUSH.rep;
    p.vendetta = { victimId: target.id, crewId: target.crewId ?? null, until: now + AMBUSH.vendettaMs };
  }
  for (const p of crewHere) if (p.id !== leader.id) notify(p, `You jumped ${target.name}. Your cut: $${share}, dirty.`, "good", undefined, now);
  notify(target, `${names} jumped you in ${district}. You wake up in the hospital${taken ? `, $${taken} lighter` : ""}. For three days, you and your crew can go after every one of them.`, "bad", undefined, now);
  crew.log = [{ at: now, text: `${names} jumped ${target.name} in ${district}.` }, ...crew.log].slice(0, 30);
  if (city) city.log = [{ at: now, text: `A gang jumped ${target.name} in ${district}.` }, ...city.log].slice(0, 20);

  const first = atk[0];
  const c: CaseFile = {
    id: ctx.caseId,
    country: a.country,
    district,
    kind: "assault",
    at: now,
    victimId: target.id,
    victimName: target.name,
    amount: taken,
    culpritId: first.id,
    suspect: suspectProfile(first, ctx.crewTag),
    tips: [],
    witnesses: lookoutOk ? [] : ctx.witnesses.map((w) => w.id),
    investigatedBy: [],
  };
  addTip(c, "victim", eyeAccuracy(target), now, rng, target.id, "Victim");
  if (!lookoutOk) {
    addTip(c, "bystander", 0.6, now, rng, undefined, "A shopkeeper");
    for (const w of ctx.witnesses) {
      w.sightings = [{ caseId: c.id, text: `You saw a gang jump ${target.name} in ${district}.`, at: now, until: now + BALANCE.crime.sightingMs }, ...(w.sightings ?? []).filter((s) => s.until > now)].slice(0, 5);
    }
  }
  events.unshift({ tone: "good", text: `You jump ${target.name}. They won't be walking for a while. Each of you takes $${share}, dirty.` });
  return { events, caseFile: c };
}

const label = (x: { name: string; hired?: boolean }) => (x.hired ? `${x.name} (hired)` : x.name);

export function ambushView(crew: Crew, viewer: Player, now: number) {
  const a = crew.ambush;
  if (!a || a.expiresAt <= now) return null;
  return {
    targetName: a.targetName,
    expiresAt: a.expiresAt,
    attackers: a.attackers.map(label),
    driver: a.driver ? label(a.driver) : null,
    lookout: a.lookout ? label(a.lookout) : null,
    mine: inPlan(a, viewer.id),
    isLeader: crew.leaderId === viewer.id,
    canAttack: roleBlock(crew, viewer, "attacker", now),
    canDrive: roleBlock(crew, viewer, "driver", now),
    canLook: roleBlock(crew, viewer, "lookout", now),
  };
}
