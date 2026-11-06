// Crew prison breaks: when a crew member is serving a sentence, the crew can plan to break
// them out. Members join the plan; the planner gives the signal. The odds depend on who's in:
// more people and sharper, bolder, quicker, stronger crews do better. Strict countries and
// mayoral crackdowns make it harder. Fail and everyone in on it lands in a cell too.

import { crewJob } from "./family";
import { BALANCE } from "./balance";
import { COUNTRY_BY_ID } from "./content/world";
import { addMerit, countryOf, inJail } from "./engine";
import { notify } from "./social";
import { sv } from "./stats";
import { GameError, type Crew, type CountryId, type GameEvent, type Player, type Rng } from "./types";

const B = BALANCE.breakout;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Serving a sentence (not held for trial: that's a matter for the court and bail). */
export function serving(p: Player, now: number): boolean {
  return !p.custodyCase && inJail(p, now);
}

const isMember = (c: Crew, id: string) => c.members.some((m) => m.id === id);

/** One person's contribution: nerve, agility, wits and strength. */
function skill(p: Player): number {
  const avg = (sv(p, "nerve") + sv(p, "agility") + sv(p, "wits") + sv(p, "strength")) / 4;
  return Math.max(0, (avg - 10) / 150);
}

/** Chance the break works with this team, here, now. */
export function breakoutOdds(team: Player[], country: CountryId, crackdown: boolean): number {
  const security = (COUNTRY_BY_ID[country].heatMult - 1) * 0.3 + (crackdown ? B.crackdownPenalty : 0);
  const odds = B.base + team.reduce((s, p) => s + skill(p), 0) + B.perMember * Math.max(0, team.length - 1) - security;
  return clamp(odds, 0.05, B.maxOdds);
}

/** How the crew talks about its chances (never a number). */
export function oddsWord(odds: number): string {
  return odds < 0.3 ? "slim" : odds < 0.5 ? "a coin toss" : odds < 0.7 ? "decent" : "good";
}

export function planBlock(c: Crew, planner: Player, target: Player | null, now: number): string | null {
  if (!isMember(c, planner.id)) return "You're not in this crew.";
  if (c.breakout) return "There's already a plan in motion.";
  if (!target || !isMember(c, target.id)) return "They're not in your crew.";
  if (target.id === planner.id) return "You can't break yourself out.";
  if (!serving(target, now)) return "They're not serving time.";
  if (countryOf(target) !== countryOf(planner)) return "They're locked up in another country.";
  if (inJail(planner, now)) return "You're in a cell yourself.";
  if (planner.energy < B.joinEnergy) return "You're too tired to plan anything.";
  return null;
}

export function planBreakout(c: Crew, planner: Player, prisoner: Player | null, now: number): GameEvent[] {
  const block = planBlock(c, planner, prisoner, now);
  if (block) throw new GameError(block);
  const target = prisoner!;
  planner.energy -= B.joinEnergy;
  c.breakout = {
    targetId: target.id,
    targetName: target.name,
    country: countryOf(target),
    plannerId: planner.id,
    team: [{ id: planner.id, name: planner.name }],
    createdAt: now,
  };
  c.log = [{ at: now, text: `${planner.name} is planning to break ${target.name} out. Get in on it.` }, ...c.log].slice(0, 30);
  return [{ tone: "good", text: `You start planning ${target.name}'s breakout. Get your crew in on it, then give the signal.` }];
}

export function joinBlock(c: Crew, p: Player, now: number): string | null {
  const b = c.breakout;
  if (!b) return "There's no plan.";
  if (!isMember(c, p.id)) return "You're not in this crew.";
  if (b.team.some((m) => m.id === p.id)) return "You're already in.";
  if (b.targetId === p.id) return "Sit tight. They're coming for you.";
  if (b.team.length >= B.maxTeam) return "The team is full.";
  if (countryOf(p) !== b.country) return "You're in another country.";
  if (inJail(p, now)) return "You're in a cell yourself.";
  if (p.energy < B.joinEnergy) return "You're too tired.";
  return null;
}

export function joinBreakout(c: Crew, p: Player, now: number): GameEvent[] {
  const block = joinBlock(c, p, now);
  if (block) throw new GameError(block);
  p.energy -= B.joinEnergy;
  c.breakout!.team.push({ id: p.id, name: p.name });
  return [{ tone: "good", text: `You're in on ${c.breakout!.targetName}'s breakout.` }];
}

export function cancelBreakout(c: Crew, p: Player, now: number): GameEvent[] {
  const b = c.breakout;
  if (!b) throw new GameError("There's no plan.");
  if (b.plannerId !== p.id && c.leaderId !== p.id) throw new GameError("Only the planner or the crew leader can call it off.");
  c.breakout = null;
  c.log = [{ at: now, text: `${p.name} called off ${b.targetName}'s breakout.` }, ...c.log].slice(0, 30);
  return [{ tone: "info", text: "The plan is off." }];
}

/**
 * The planner gives the signal. `team` are the members' player records (planner included),
 * `target` the prisoner. Clears the plan either way.
 */
export function executeBreakout(c: Crew, planner: Player, team: Player[], target: Player, now: number, rng: Rng, crackdown: boolean): GameEvent[] {
  const b = c.breakout;
  if (!b) throw new GameError("There's no plan.");
  if (b.plannerId !== planner.id) throw new GameError("Only the planner gives the signal.");
  c.breakout = null;
  if (!serving(target, now)) {
    c.log = [{ at: now, text: `${b.targetName} is already out. The plan is off.` }, ...c.log].slice(0, 30);
    return [{ tone: "info", text: `${b.targetName} is already out. No need.` }];
  }
  const crew = team.filter((p) => !p.dead && !inJail(p, now) && countryOf(p) === b.country);
  if (!crew.length) throw new GameError("Nobody is in position.");
  const odds = breakoutOdds(crew, b.country, crackdown);
  const heatMult = COUNTRY_BY_ID[b.country].heatMult;
  const names = crew.map((p) => p.name).join(", ");
  for (const p of crew) crewJob(p, "breakout");

  if (rng() < odds) {
    target.jailUntil = now;
    target.jailReason = null;
    target.heat += B.heat * heatMult;
    notify(target, `A truck through the yard wall, and ${names} waiting outside. You're out.`, "story", planner, now);
    for (const p of crew) {
      p.heat += B.heat * heatMult;
      p.reputation += 2;
      p.stats.nerve += 0.5;
      addMerit(p, "enforcer", 2);
      if (p.id !== planner.id) notify(p, `The breakout worked. ${target.name} is free.`, "good", undefined, now);
    }
    c.log = [{ at: now, text: `Breakout! ${names} got ${target.name} out.` }, ...c.log].slice(0, 30);
    return [{ tone: "good", text: `It works. ${target.name} climbs into the truck and you're gone before the sirens start.` }];
  }

  const caughtFor = Math.round(B.failJailMs * heatMult);
  for (const p of crew) {
    p.jailUntil = Math.max(p.jailUntil ?? 0, now + caughtFor);
    p.jailReason = `Caught trying to break ${target.name} out.`;
    p.heat += B.heat * heatMult;
    if (p.id !== planner.id) notify(p, `The breakout went wrong. The guards were waiting. You're in a cell.`, "bad", undefined, now);
  }
  target.jailUntil = Math.max(target.jailUntil ?? now, now) + B.failExtraMs;
  notify(target, `Your crew tried to break you out. It failed, and they added time to your sentence.`, "bad", undefined, now);
  c.log = [{ at: now, text: `The breakout for ${target.name} failed. ${names} got caught.` }, ...c.log].slice(0, 30);
  return [{ tone: "bad", text: `The guards were waiting. You're caught, and ${target.name} gets more time.` }];
}

/** What crew members see about the plan. */
export function breakoutView(c: Crew, viewer: Player, team: Player[], now: number, crackdown: boolean) {
  const b = c.breakout;
  if (!b) return null;
  return {
    targetName: b.targetName,
    plannerName: b.team[0]?.name ?? "",
    team: b.team.map((m) => m.name),
    isPlanner: b.plannerId === viewer.id,
    canJoin: joinBlock(c, viewer, now),
    canCancel: b.plannerId === viewer.id || c.leaderId === viewer.id,
  };
}
