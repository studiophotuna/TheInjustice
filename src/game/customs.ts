// Player customs officers. Police and soldiers (rank 2 and up) can take a shift on the checkpoints
// out of their city. While anyone is on duty, drivers are stopped more often and searched by a real
// officer (sharp eyes find more), and the station watches passengers. The officer earns a bounty
// on every seizure, paid by the city, and the work counts toward their promotion.

import { addMerit, countryOf, inHospital, inJail } from "./engine";
import { sv } from "./stats";
import { GameError, type City, type CustomsPost, type GameEvent, type Player } from "./types";

export const CUSTOMS = {
  minRank: 2,
  shiftMs: 60 * 60_000,
  energy: 15,
  /** Extra chance a driver is stopped while anyone is on duty. */
  stopBoost: 0.25,
  maxStop: 0.85,
  /** Extra chance a passenger's bags are searched at the station. */
  stationBoost: 0.15,
  /** Officers keep this share of what a seizure was worth. */
  bountyShare: 0.25,
  merit: 2,
  shiftMerit: 0.5,
};

const canServe = (p: Player) => (p.path === "police" || p.path === "military") && p.rank >= CUSTOMS.minRank;

export function onDuty(c: City | null | undefined, now: number, exceptId?: string): CustomsPost[] {
  return (c?.customs ?? []).filter((x) => x.until > now && x.id !== exceptId);
}

export function customsBlock(c: City, p: Player, now: number): string | null {
  if (!canServe(p)) return "Customs shifts are for police and soldiers, rank 2 and up.";
  if (countryOf(p) !== c.country) return "You're not in this city.";
  if (p.travel) return "You're on the road.";
  if (inJail(p, now)) return "Not from a cell.";
  if (inHospital(p, now)) return "You're in the hospital.";
  if (onDuty(c, now).some((x) => x.id === p.id)) return "You're already on a shift.";
  if (p.energy < CUSTOMS.energy) return "You're too tired.";
  return null;
}

export function startShift(c: City, p: Player, now: number): GameEvent[] {
  const block = customsBlock(c, p, now);
  if (block) throw new GameError(block);
  p.energy -= CUSTOMS.energy;
  c.customs = [...onDuty(c, now), { id: p.id, name: p.name, until: now + CUSTOMS.shiftMs, eye: sv(p, "perception") }];
  p.jobCounts["customs:shift"] = (p.jobCounts["customs:shift"] ?? 0) + 1;
  const events: GameEvent[] = [{ tone: "good", text: "You take your post at the checkpoint. For the next hour, everything leaving this city goes past you." }];
  events.push(...addMerit(p, p.path!, CUSTOMS.shiftMerit));
  return events;
}

export function endShift(c: City, p: Player, now: number): GameEvent[] {
  if (!onDuty(c, now).some((x) => x.id === p.id)) throw new GameError("You're not on a shift.");
  c.customs = onDuty(c, now, p.id);
  return [{ tone: "info", text: "You hand over the checkpoint and go home." }];
}

/** The officer's cut of a seizure: paid by the city, counted toward promotion. */
export function creditSeizure(officer: Player, value: number, who: string, what: string, now: number): number {
  const bounty = Math.max(25, Math.round(value * CUSTOMS.bountyShare));
  officer.cash += bounty;
  officer.jobCounts["customs:seize"] = (officer.jobCounts["customs:seize"] ?? 0) + 1;
  if (officer.path) addMerit(officer, officer.path, CUSTOMS.merit);
  return bounty;
}

export function customsView(c: City, p: Player, now: number) {
  const posts = onDuty(c, now);
  const mine = posts.find((x) => x.id === p.id);
  return {
    onDuty: posts.length,
    officers: posts.map((x) => x.name),
    mine: mine ? mine.until : null,
    eligible: canServe(p),
    block: mine ? null : customsBlock(c, p, now),
    seizures: p.jobCounts["customs:seize"] ?? 0,
    shiftMinutes: CUSTOMS.shiftMs / 60_000,
    energy: CUSTOMS.energy,
    bountyPct: Math.round(CUSTOMS.bountyShare * 100),
  };
}
