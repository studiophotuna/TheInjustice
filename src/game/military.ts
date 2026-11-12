// The military in the city.
//
// - Guard duty: soldiers stand guard at the banks. Every soldier on guard (up to three) makes a
//   bank job in that city harder, and the city pays them for the shift.
// - Martial law: the mayor calls in the army for two hours. Soldiers can then march into a turf
//   war; if they outgun both sides, the war is broken up and everyone fighting is arrested.
// - Court-martial: soldiers convicted in court, caught with a dirty record, or caught selling army
//   gear are court-martialed: demoted two ranks, or dishonorably discharged from the bottom.
// - The black market: a corrupt soldier can sell stolen army gear to the Mafia. The sales stay on
//   a hidden ledger that internal affairs and court-martials can find.

import { assertNotAlt } from "./anticheat";
import { BALANCE } from "./balance";
import { playerFighter, power } from "./combat";
import { ITEM_BY_ID } from "./content/items";
import { PATHS } from "./content/paths";
import { addMerit, countryOf, inJail, issueGear } from "./engine";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { notify } from "./social";
import { GameError, type City, type DistrictId, type GameEvent, type Player } from "./types";

export const GUARD = { minRank: 2, energy: 15, shiftMs: 60 * 60_000, pay: 40, maxGuards: 3 };
export const MARTIAL = { cost: 300, ms: 2 * 60 * 60_000, cooldownMs: 24 * 60 * 60_000, minRank: 3, energy: 15, pay: 50, jailMs: 15 * 60_000, edge: 1.2 };
export const COURT_MARTIAL = { minRank: 5, cooldownMs: 6 * 60 * 60_000, energy: 10 };
export const BLACK_MARKET = { minPrice: 100, maxPrice: 5000, cooldownMs: 24 * 60 * 60_000 };

const isSoldier = (p: Player, rank = 1) => p.path === "military" && p.rank >= rank;

// ── Guard duty ─────────────────────────────────────────────────────────────

export const activeGuards = (c: City, now: number) => (c.guards ?? []).filter((g) => g.until > now);

export function guardBlock(c: City, p: Player, now: number): string | null {
  if (!isSoldier(p, GUARD.minRank)) return "Only soldiers who passed basic training stand guard.";
  if (countryOf(p) !== c.country) return "You have to be in the city.";
  if (inJail(p, now)) return "You're in a cell.";
  if (activeGuards(c, now).some((g) => g.id === p.id)) return "You're already on guard.";
  if (p.energy < GUARD.energy) return "You're too tired for a shift.";
  return null;
}

export function standGuard(c: City, p: Player, now: number): GameEvent[] {
  const block = guardBlock(c, p, now);
  if (block) throw new GameError(block);
  p.energy -= GUARD.energy;
  c.guards = [...activeGuards(c, now), { id: p.id, name: p.name, until: now + GUARD.shiftMs }].slice(-10);
  // Soldiers on guard are paid by the garrison (the state), not city hall.
  const pay = GUARD.pay;
  p.cash += pay;
  p.reputation += 1;
  const n = Math.min(GUARD.maxGuards, activeGuards(c, now).length);
  addMerit(p, "military", 1.5);
  return [{ tone: "good", text: `You take your post outside the bank for an hour.${pay ? ` The city pays $${pay}.` : ""} ${n} soldier${n === 1 ? "" : "s"} on guard now.` }];
}

// ── Martial law ────────────────────────────────────────────────────────────

export const martialOn = (c: City, now: number) => (c.martialUntil ?? 0) > now;

export function martialBlock(c: City, mayor: Player, now: number): string | null {
  if (c.mayor?.id !== mayor.id) return "Only the mayor can call in the army.";
  if (countryOf(mayor) !== c.country) return "You have to be in your city.";
  if (martialOn(c, now)) return "The army is already on the streets.";
  if (now - (c.lastMartialAt ?? 0) < MARTIAL.cooldownMs) return "The army won't come again so soon.";
  if (c.treasury < MARTIAL.cost) return `Calling in the army costs $${MARTIAL.cost} from the treasury.`;
  return null;
}

export function declareMartialLaw(c: City, mayor: Player, now: number): GameEvent[] {
  const block = martialBlock(c, mayor, now);
  if (block) throw new GameError(block);
  c.treasury -= MARTIAL.cost;
  c.martialUntil = now + MARTIAL.ms;
  c.lastMartialAt = now;
  c.log = [{ at: now, text: `Mayor ${mayor.name} declares martial law. Soldiers on every corner for two hours.` }, ...c.log].slice(0, 20);
  return [{ tone: "good", text: "Martial law. For two hours, soldiers can break up turf wars." }];
}

export function peaceBlock(c: City, p: Player, d: DistrictId, now: number): string | null {
  const war = c.turf?.[d]?.war;
  if (!war) return "There's no war there.";
  if (!martialOn(c, now)) return "The army needs martial law to step in. Only the mayor can declare it.";
  if (!isSoldier(p, MARTIAL.minRank)) return `Only soldiers (${PATHS.military.ranks[MARTIAL.minRank - 1]} and up) can break up a war.`;
  if (now >= war.endsAt) return "The fighting is over.";
  if (countryOf(p) !== c.country) return "You have to be in the city.";
  if (inJail(p, now)) return "You're in a cell.";
  if ((war.peacekeepers ?? []).some((x) => x.id === p.id)) return "You're already out there.";
  if ([...war.attackers, ...war.defenders].some((x) => x.id === p.id)) return "You're one of the fighters.";
  if (p.energy < MARTIAL.energy) return "You're too tired.";
  return null;
}

export function joinPeacekeepers(c: City, p: Player, d: DistrictId, now: number): GameEvent[] {
  const block = peaceBlock(c, p, d, now);
  if (block) throw new GameError(block);
  const war = c.turf![d]!.war!;
  p.energy -= MARTIAL.energy;
  war.peacekeepers = [...(war.peacekeepers ?? []), { id: p.id, name: p.name }];
  addMerit(p, "military", 1);
  return [{ tone: "good", text: "You move in with your squad. When the fighting's settled, the army will have its say." }];
}

const strength = (team: Player[]) => team.reduce((s, p) => s + power(playerFighter(p, 100)) * (0.5 + p.hp / 200), 0);

/**
 * Before a war is settled: do the soldiers outgun both sides? If so the war is called off, and
 * every fighter is arrested by military police. Returns events, or null if the war goes on.
 */
export function peaceSettle(c: City, d: DistrictId, attackers: Player[], defenders: Player[], soldiers: Player[], now: number): GameEvent[] | null {
  const h = c.turf?.[d];
  if (!h?.war || !soldiers.length) return null;
  const army = strength(soldiers) * MARTIAL.edge;
  if (army <= Math.max(strength(attackers), strength(defenders))) {
    for (const s of soldiers) {
      s.hp = Math.max(5, s.hp - 20);
      notify(s, "The crews were too many for your squad. The war went on without you.", "bad", undefined, now);
    }
    return null;
  }
  const where = h.war.name;
  for (const f of [...attackers, ...defenders]) {
    f.jailUntil = Math.max(f.jailUntil ?? 0, now + MARTIAL.jailMs);
    f.jailReason = "Arrested by military police during martial law.";
    f.heat += 5;
    notify(f, "Soldiers broke up the war and arrested everyone fighting.", "bad", undefined, now);
  }
  for (const s of soldiers) {
    // Soldiers breaking up a war are paid by the garrison; the city paid to call them in.
    const pay = MARTIAL.pay;
    s.cash += pay;
    s.reputation += 2;
    addMerit(s, "military", 3);
    notify(s, `Your squad broke up the war.${pay ? ` The city pays $${pay}.` : ""}`, "good", undefined, now);
  }
  h.war = null;
  h.lastWarAt = now;
  c.log = [{ at: now, text: `The army broke up the war between ${h.name} and ${where}. Everyone fighting was arrested.` }, ...c.log].slice(0, 20);
  return [{ tone: "good", text: "The army moves in. The war is over, and every fighter is in cuffs." }];
}

// ── Court-martial ──────────────────────────────────────────────────────────

/** Demotes two ranks, or discharges a soldier at the bottom. Takes back gear they no longer rate. */
export function courtMartial(s: Player, reason: string, now: number): string {
  if (s.path !== "military") return "";
  if (s.rank <= 2) {
    s.path = null;
    s.rank = 1;
    s.school = null;
    s.jobsSinceRank = 0;
    issueGear(s);
    s.reputation = Math.max(0, s.reputation - 5);
    notify(s, `Court-martial (${reason}). Dishonorably discharged. Hand in your rifle on the way out.`, "bad", undefined, now);
    return "dishonorably discharged";
  }
  s.rank -= 2;
  s.jobsSinceRank = 0;
  issueGear(s);
  s.reputation = Math.max(0, s.reputation - 5);
  const title = PATHS.military.ranks[s.rank - 1];
  notify(s, `Court-martial (${reason}). Busted down to ${title}.`, "bad", undefined, now);
  return `busted down to ${title}`;
}

export function courtMartialBlock(officer: Player, s: Player, now: number): string | null {
  if (!isSoldier(officer, COURT_MARTIAL.minRank)) return `Only officers (${PATHS.military.ranks[COURT_MARTIAL.minRank - 1]} and up) can call a court-martial.`;
  if (s.path !== "military") return "They're not a soldier.";
  if (s.id === officer.id) return "You can't court-martial yourself.";
  if (s.rank >= officer.rank) return "They outrank you, or match you.";
  if (countryOf(s) !== countryOf(officer)) return "They're posted somewhere else.";
  if (now - (officer.attackLog?.[`cm:${s.id}`] ?? 0) < COURT_MARTIAL.cooldownMs) return "You brought charges against them recently.";
  if (officer.energy < COURT_MARTIAL.energy) return "You're too tired.";
  return null;
}

/** An officer brings charges. It sticks if their record is dirty or they sold army gear. */
export function bringCharges(officer: Player, s: Player, now: number): GameEvent[] {
  const block = courtMartialBlock(officer, s, now);
  if (block) throw new GameError(block);
  officer.energy -= COURT_MARTIAL.energy;
  officer.attackLog = { ...(officer.attackLog ?? {}), [`cm:${s.id}`]: now };
  const sales = (s.gunSales ?? []).filter((x) => !x.exposed);
  const dirty = s.heat >= BALANCE.cleanRecordHeat;
  if (!sales.length && !dirty) {
    officer.reputation = Math.max(0, officer.reputation - 2);
    notify(s, `${officer.name} brought charges against you. The board threw them out.`, "good", officer, now);
    return [{ tone: "bad", text: `The board throws the charges out. ${s.name}'s record is clean. -2 reputation.` }];
  }
  for (const x of sales) x.exposed = true;
  const reason = sales.length ? "selling army weapons" : "conduct unbecoming";
  const outcome = courtMartial(s, reason, now);
  officer.reputation += 3;
  addMerit(officer, "military", 3);
  return [{ tone: "good", text: `Court-martial: ${s.name} is ${outcome} for ${reason}.` }];
}

// ── The black market ───────────────────────────────────────────────────────

/** Army gear this soldier could sell, by rank. */
export function sellableGear(p: Player) {
  if (p.path !== "military") return [];
  return Object.values(ITEM_BY_ID).filter((i) => i.contraband && p.rank >= i.contraband.minRank);
}

export function gunSaleBlock(seller: Player, buyer: Player, itemId: string, price: number, now: number): string | null {
  const item = ITEM_BY_ID[itemId];
  if (!item?.contraband) return "That's not army gear.";
  if (!sellableGear(seller).some((i) => i.id === itemId)) return "You don't have access to that in the armory.";
  if (buyer.path !== "enforcer") return "Only the Mafia buys army gear.";
  if (buyer.inventory[itemId]) return "They already have one.";
  if ((buyer.gunOffers ?? []).some((o) => o.sellerId === seller.id)) return "You already have an offer out to them.";
  if (countryOf(buyer) !== countryOf(seller)) return "They're in another country.";
  if (!Number.isFinite(price) || price < BLACK_MARKET.minPrice || price > BLACK_MARKET.maxPrice) return `Ask between $${BLACK_MARKET.minPrice} and $${BLACK_MARKET.maxPrice}.`;
  if (now - (seller.lastGunSaleAt ?? 0) < BLACK_MARKET.cooldownMs) return "The quartermaster counts the rifles. Wait a day.";
  return null;
}

export function offerGun(seller: Player, buyer: Player, itemId: string, price: number, now: number): GameEvent[] {
  assertNotAlt(seller, buyer);
  const block = gunSaleBlock(seller, buyer, itemId, price, now);
  if (block) throw new GameError(block);
  const item = ITEM_BY_ID[itemId];
  buyer.gunOffers = [...(buyer.gunOffers ?? []), { id: `${seller.id}:${now}`, sellerId: seller.id, sellerName: seller.name, itemId, price: Math.floor(price), at: now }].slice(-5);
  notify(buyer, `${seller.name} can get you a ${item.name.toLowerCase()} for $${Math.floor(price)}. No questions. Find it on the Street.`, "story", seller, now);
  return [{ tone: "good", text: `Offer made. If ${buyer.name} pays, you'll have $${Math.floor(price)} in dirty money.` }];
}

export function declineGun(buyer: Player, offerId: string): GameEvent[] {
  buyer.gunOffers = (buyer.gunOffers ?? []).filter((o) => o.id !== offerId);
  return [{ tone: "info", text: "You pass." }];
}

/** The buyer pays (dirty money first) and the gear changes hands. */
export function buyGun(buyer: Player, seller: Player, offerId: string, now: number): GameEvent[] {
  const offer = (buyer.gunOffers ?? []).find((o) => o.id === offerId);
  if (!offer || offer.sellerId !== seller.id) throw new GameError("That offer is gone.");
  buyer.gunOffers = (buyer.gunOffers ?? []).filter((o) => o.id !== offerId);
  const item = ITEM_BY_ID[offer.itemId];
  if (seller.path !== "military" || !sellableGear(seller).some((i) => i.id === offer.itemId)) throw new GameError(`${seller.name} can't get it anymore.`);
  if (buyer.inventory[offer.itemId]) throw new GameError("You already have one.");
  if (now - (seller.lastGunSaleAt ?? 0) < BLACK_MARKET.cooldownMs) throw new GameError(`${seller.name} already sold one today. Try tomorrow.`);
  if (!canPayIllegal(buyer, offer.price)) throw new GameError(`You need $${offer.price}.`);
  payIllegal(buyer, offer.price);
  earnDirty(seller, offer.price);
  buyer.inventory[offer.itemId] = 1;
  seller.lastGunSaleAt = now;
  seller.gunSales = [...(seller.gunSales ?? []), { at: now, amount: offer.price }].slice(-20);
  notify(seller, `${buyer.name} paid $${offer.price} for the ${item.name.toLowerCase()}. Dirty money.`, "good", buyer, now);
  return [{ tone: "good", text: `${item.icon} ${item.name} is yours. Don't let anyone read the serial number.` }];
}
