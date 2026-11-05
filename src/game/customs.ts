// Player customs officers. Police and soldiers (rank 2 and up) can take a shift on the checkpoints
// out of their city. While anyone is on duty, drivers are stopped more often and searched by a real
// officer (sharp eyes find more), and the station watches passengers. The officer earns a bounty
// on every seizure, paid by the city, and the work counts toward their promotion.

import { addMerit, countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { notify } from "./social";
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
  bribe: { min: 50, max: 20_000, integrity: -3 },
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

/** An officer on duty names a price to look the other way (or takes it back with null). */
export function setPrice(c: City, p: Player, price: number | null, now: number): GameEvent[] {
  const post = onDuty(c, now).find((x) => x.id === p.id);
  if (!post) throw new GameError("You're not on a shift.");
  if (price === null) {
    post.price = null;
    return [{ tone: "info", text: "You're clean again. Nobody gets waved through for money." }];
  }
  const v = Math.floor(price);
  if (!Number.isFinite(v) || v < CUSTOMS.bribe.min || v > CUSTOMS.bribe.max) throw new GameError(`Name a price between $${CUSTOMS.bribe.min} and $${CUSTOMS.bribe.max.toLocaleString()}.`);
  post.price = v;
  return [{ tone: "info", text: `Word gets around: for $${v.toLocaleString()}, you don't look in the trunk. Internal affairs listens to that kind of word too.` }];
}

/** A smuggler pays an officer to be waved through their lane for the rest of the shift. */
export function payOfficer(c: City, p: Player, officer: Player, now: number): GameEvent[] {
  const post = onDuty(c, now).find((x) => x.id === officer.id);
  if (!post || !post.price) throw new GameError("That officer isn't taking anything.");
  if (officer.id === p.id) throw new GameError("You can't bribe yourself.");
  if (countryOf(p) !== c.country) throw new GameError("You're not in this city.");
  if ((post.passes ?? []).includes(p.id)) throw new GameError("You've already paid. They'll wave you through.");
  if (!canPayIllegal(p, post.price)) throw new GameError(`That's $${post.price.toLocaleString()}. Dirty money or cash.`);
  payIllegal(p, post.price);
  earnDirty(officer, post.price);
  officer.customsTake = [...(officer.customsTake ?? []), { at: now, amount: post.price }].slice(-30);
  shiftIntegrity(officer, CUSTOMS.bribe.integrity);
  post.passes = [...(post.passes ?? []), p.id];
  notify(officer, `Someone slipped you $${post.price.toLocaleString()} to look the other way. Dirty money.`, "info", undefined, now);
  return [{ tone: "good", text: `An envelope changes hands. ${officer.name} won't look in your trunk, or your bags, until the shift ends at ${new Date(post.until).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.` }];
}

/** Officers on duty who'll actually search this player (those they paid off wave them through). */
export function searchingOfficers(c: City | null | undefined, now: number, playerId: string) {
  return onDuty(c, now, playerId).filter((x) => !(x.passes ?? []).includes(playerId));
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
    /** Officers on duty who can be persuaded (never yourself). */
    forSale: posts
      .filter((x) => x.price && x.id !== p.id)
      .map((x) => ({ id: x.id, name: x.name, price: x.price!, paid: (x.passes ?? []).includes(p.id), until: x.until })),
    mine: mine ? mine.until : null,
    myPrice: mine?.price ?? null,
    myPasses: mine ? (mine.passes ?? []).length : 0,
    eligible: canServe(p),
    block: mine ? null : customsBlock(c, p, now),
    seizures: p.jobCounts["customs:seize"] ?? 0,
    shiftMinutes: CUSTOMS.shiftMs / 60_000,
    energy: CUSTOMS.energy,
    bountyPct: Math.round(CUSTOMS.bountyShare * 100),
  };
}
