// Leadership seats: in each city, one seat at the head of each career. Rank 6 and up can claim
// an empty seat or challenge the holder. A seat pays a daily stipend from the treasury and comes
// with one daily power that matters to the whole city.

import { BALANCE } from "./balance";
import { keyStatAvg, PATHS } from "./content/paths";
import { COUNTRY_BY_ID } from "./content/world";
import { countryOf, inHospital, inJail } from "./engine";
import { notify } from "./social";
import { GameError, type City, type GameEvent, type PathId, type Player, type Rng, type Seat } from "./types";

export const SEATS = {
  minRank: 6,
  stipend: 300,
  dayMs: 24 * 60 * 60_000,
  holderShieldMs: 48 * 60 * 60_000,
  challengeCooldownMs: 7 * 24 * 60 * 60_000,
  challengeLossRep: 5,
  winRep: 10,
};

export const SEAT_TITLES: Record<PathId, string> = {
  police: "Commissioner",
  enforcer: "Don of the City",
  courts: "Chief Justice",
  medicine: "Medical Director",
  banking: "Governor of the Exchange",
  military: "General of the Garrison",
  vigilante: "The Symbol",
};

/** One daily power per seat. `target` powers act on another player. */
export const SEAT_POWERS: Record<PathId, { name: string; text: string; target: boolean }> = {
  police: { name: "Most Wanted", text: "Name a player Most Wanted for a day: +20 heat and a red badge everyone can see.", target: true },
  enforcer: { name: "Call a truce", text: "No crew can declare a turf war in this city for 12 hours.", target: false },
  courts: { name: "Commute a sentence", text: "Release one prisoner serving a sentence.", target: true },
  medicine: { name: "Discharge a patient", text: "Send one patient home from the hospital, healed.", target: true },
  banking: { name: "Freeze the money", text: "Freeze one player's dirty money for a day: no laundering anywhere.", target: true },
  military: { name: "Deploy troops", text: "Three squads guard the banks for two hours. Bank jobs get much harder.", target: false },
  vigilante: { name: "Call them out", text: "Publicly name a player with a dirty record: +15 heat and a headline.", target: true },
};

const seatOf = (c: City, path: PathId): Seat | null => c.seats?.[path] ?? null;

/** Whether a player can hold their career's seat in this city right now. */
export function seatEligible(c: City, p: Player, now: number): string | null {
  if (!p.path) return "You need a career.";
  if (p.rank < SEATS.minRank) return `Only ${PATHS[p.path].ranks[SEATS.minRank - 1]} and up can sit at the head of the ${PATHS[p.path].name}.`;
  if (countryOf(p) !== c.country) return "You have to live in this city.";
  if (p.dead) return "You're dead.";
  if (inJail(p, now)) return "You're in a cell.";
  return null;
}

/** Strength in a contest for the seat: the career's key stats, rank and name on the street. */
export function seatScore(p: Player): number {
  if (!p.path) return 0;
  return keyStatAvg(p, p.path) + p.rank * 4 + Math.min(40, p.reputation / 5);
}

export function claimBlock(c: City, p: Player, now: number): string | null {
  const e = seatEligible(c, p, now);
  if (e) return e;
  const s = seatOf(c, p.path!);
  if (s && s.id === p.id) return "It's already yours.";
  if (s) return null; // a challenge
  return null;
}

/**
 * Claim an empty seat, or challenge the holder. A holder who no longer qualifies (left the
 * career, moved away, dropped rank) loses the seat without a contest.
 */
export function claimSeat(c: City, p: Player, holder: Player | null, now: number, rng: Rng): GameEvent[] {
  const block = claimBlock(c, p, now);
  if (block) throw new GameError(block);
  const path = p.path!;
  const title = SEAT_TITLES[path];
  const city = COUNTRY_BY_ID[c.country].capital;
  const s = seatOf(c, path);
  const take = () => {
    c.seats = { ...(c.seats ?? {}), [path]: { id: p.id, name: p.name, since: now, shieldUntil: now + SEATS.holderShieldMs, lastPowerAt: 0, lastPaidAt: 0 } };
    p.reputation += SEATS.winRep;
  };
  const stale = s && (!holder || holder.id !== s.id || holder.path !== path || !!seatEligible(c, holder, now));
  if (!s || stale) {
    take();
    c.log = [{ at: now, text: `${p.name} is now ${title} of ${city}.` }, ...c.log].slice(0, 20);
    return [{ tone: "good", text: `You take the seat: ${title} of ${city}.` }];
  }
  // A real challenge.
  if (now < s.shieldUntil) throw new GameError(`${s.name} only just took the seat. Give them time to settle in.`);
  if (now - (p.seatChallengeAt ?? 0) < SEATS.challengeCooldownMs) throw new GameError("You challenged for a seat this week already.");
  p.seatChallengeAt = now;
  const mine = seatScore(p) * (0.85 + rng() * 0.3);
  const theirs = seatScore(holder!) * (0.85 + rng() * 0.3) * 1.05; // a small edge to the incumbent
  if (mine > theirs) {
    take();
    notify(holder!, `${p.name} challenged you and took your seat as ${title}.`, "bad", p, now);
    c.log = [{ at: now, text: `${p.name} unseated ${s.name}. ${p.name} is the new ${title} of ${city}.` }, ...c.log].slice(0, 20);
    return [{ tone: "good", text: `You beat ${s.name}. You're the ${title} of ${city} now.` }];
  }
  p.reputation = Math.max(0, p.reputation - SEATS.challengeLossRep);
  holder!.reputation += 3;
  notify(holder!, `${p.name} challenged you for the seat of ${title}. You held it.`, "good", p, now);
  return [{ tone: "bad", text: `${s.name} holds the seat. The ${PATHS[path].name} isn't ready to follow you. -${SEATS.challengeLossRep} reputation.` }];
}

export function stepDown(c: City, p: Player, now: number): GameEvent[] {
  const path = p.path;
  const s = path ? seatOf(c, path) : null;
  if (!path || !s || s.id !== p.id) throw new GameError("You don't hold a seat.");
  delete c.seats![path];
  c.log = [{ at: now, text: `${p.name} stepped down as ${SEAT_TITLES[path]}.` }, ...c.log].slice(0, 20);
  return [{ tone: "info", text: "You step down. The seat is open." }];
}

function mySeat(c: City, p: Player, now: number): Seat {
  const s = p.path ? seatOf(c, p.path) : null;
  if (!s || s.id !== p.id) throw new GameError("You don't hold a seat.");
  const e = seatEligible(c, p, now);
  if (e) throw new GameError(e);
  return s;
}

export function collectStipend(c: City, p: Player, now: number): GameEvent[] {
  const s = mySeat(c, p, now);
  if (now - s.lastPaidAt < SEATS.dayMs) throw new GameError("The stipend is paid once a day.");
  const pay = Math.min(SEATS.stipend, c.treasury);
  if (pay <= 0) throw new GameError("The treasury is empty.");
  c.treasury -= pay;
  s.lastPaidAt = now;
  p.cash += pay;
  return [{ tone: "good", text: `Your stipend as ${SEAT_TITLES[p.path!]}: +$${pay}.` }];
}

export const truceOn = (c: City, now: number) => (c.truceUntil ?? 0) > now;

/** Uses the seat's daily power. `target` is required for the powers that act on a player. */
export function usePower(c: City, p: Player, target: Player | null, now: number): GameEvent[] {
  const s = mySeat(c, p, now);
  if (now - s.lastPowerAt < SEATS.dayMs) throw new GameError("Once a day.");
  const path = p.path!;
  const power = SEAT_POWERS[path];
  const city = COUNTRY_BY_ID[c.country].capital;
  if (power.target) {
    if (!target) throw new GameError("Choose someone.");
    if (target.id === p.id) throw new GameError("Not on yourself.");
    if (countryOf(target) !== c.country) throw new GameError("They're not in this city.");
  }
  let events: GameEvent[];
  switch (path) {
    case "police":
      target!.heat += 20;
      c.mostWanted = { id: target!.id, name: target!.name, until: now + SEATS.dayMs };
      notify(target!, `The Commissioner named you Most Wanted in ${city}. Every cop in the city has your face.`, "bad", p, now);
      c.log = [{ at: now, text: `Commissioner ${p.name} names ${target!.name} Most Wanted.` }, ...c.log].slice(0, 20);
      events = [{ tone: "good", text: `${target!.name} is Most Wanted for a day.` }];
      break;
    case "enforcer":
      c.truceUntil = now + 12 * 60 * 60_000;
      c.log = [{ at: now, text: `The Don calls a truce. No crew moves on anyone's turf for twelve hours.` }, ...c.log].slice(0, 20);
      events = [{ tone: "good", text: "A truce. For twelve hours, nobody starts a turf war in this city." }];
      break;
    case "courts":
      if (!inJail(target!, now) || target!.custodyCase) throw new GameError("They're not serving a sentence.");
      target!.jailUntil = now;
      target!.jailReason = null;
      notify(target!, `The Chief Justice commuted your sentence. You're free to go.`, "good", p, now);
      c.log = [{ at: now, text: `Chief Justice ${p.name} commutes ${target!.name}'s sentence.` }, ...c.log].slice(0, 20);
      events = [{ tone: "good", text: `${target!.name} walks out free.` }];
      break;
    case "medicine":
      if (!inHospital(target!, now)) throw new GameError("They're not in the hospital.");
      target!.hospitalUntil = 0;
      target!.hp = BALANCE.hp.max;
      if (target!.whacked) target!.whacked = null;
      notify(target!, `The Medical Director signed your discharge. You're healed.`, "good", p, now);
      events = [{ tone: "good", text: `${target!.name} is discharged, healed.` }];
      break;
    case "banking":
      target!.frozenUntil = now + SEATS.dayMs;
      notify(target!, `The Governor froze your dirty money. No one in the city will launder it for a day.`, "bad", p, now);
      events = [{ tone: "good", text: `${target!.name}'s dirty money is frozen for a day.` }];
      break;
    case "military":
      c.guards = [...(c.guards ?? []).filter((g) => g.until > now), ...[1, 2, 3].map((i) => ({ id: `troops-${i}`, name: "Garrison squad", until: now + 2 * 60 * 60_000 }))];
      c.log = [{ at: now, text: `General ${p.name} deploys troops to guard the banks.` }, ...c.log].slice(0, 20);
      events = [{ tone: "good", text: "Three squads take position at the banks for two hours." }];
      break;
    case "vigilante":
      if (target!.heat < BALANCE.cleanRecordHeat) throw new GameError("Their record is clean. Calling them out would only hurt you.");
      target!.heat += 15;
      notify(target!, `The Symbol called you out in public. People are watching you now.`, "bad", p, now);
      c.log = [{ at: now, text: `The Symbol names ${target!.name}: "Ask them where their money comes from."` }, ...c.log].slice(0, 20);
      events = [{ tone: "good", text: `${target!.name} is named in public.` }];
      break;
  }
  s.lastPowerAt = now;
  return events;
}

/** For City Hall: every seat, who holds it, and what the viewer can do. */
export function seatsView(c: City, viewer: Player, now: number) {
  return (Object.keys(SEAT_TITLES) as PathId[]).map((path) => {
    const s = seatOf(c, path);
    const mine = !!s && s.id === viewer.id;
    return {
      path,
      title: SEAT_TITLES[path],
      career: PATHS[path].name,
      holder: s ? { name: s.name, since: s.since, you: mine } : null,
      power: SEAT_POWERS[path],
      canClaim: viewer.path === path ? claimBlock(c, viewer, now) : `For the ${PATHS[path].name} only.`,
      challenge: !!s && !mine,
      canPower: mine ? (now - s!.lastPowerAt < SEATS.dayMs ? "Used today." : null) : null,
      canStipend: mine ? (now - s!.lastPaidAt < SEATS.dayMs ? "Paid today." : null) : null,
    };
  });
}
