// Gun shops and armor outfitters carry limited stock, and every city sells different gear: to
// get the weapon you want, you may have to travel for it.
//
// Restocking is pure luck. Nothing a player has or does changes what arrives: a shipment can
// bring every piece the shop carries, or a single one. A shop with an owner restocks when the
// owner orders it (every few hours); a shop nobody runs restocks by itself now and then.
import { COUNTRY_BY_ID } from "./content/world";
import { ITEM_BY_ID, ITEMS } from "./content/items";
import { GameError, type City, type CountryId, type GameEvent, type Rng } from "./types";

export type GearShop = "guns" | "armor";

/** Where each piece of gear is sold. Grayhaven, where everyone starts, carries the cheapest pairs. */
export const GEAR_HOME: Record<string, CountryId> = {
  // Weapons
  bike_chain: "varrow", pipe: "varrow", knuckles: "varrow",
  baseball_bat: "solmarra", snub_pistol: "solmarra",
  hatchet: "kestrova", revolver: "kestrova", shotgun: "kestrova",
  switchblade: "meridian", machine_pistol: "meridian",
  // Armor
  jacket: "varrow", leathers: "varrow",
  vest: "solmarra", concealed_vest: "solmarra",
  riot_gear: "kestrova", steel_coat: "kestrova", tactical_plate: "kestrova",
  undersuit: "meridian",
};

export const STOCK = {
  /** A shop with an owner can order a shipment this often. */
  ownerEveryMs: 6 * 3_600_000,
  /** A shop nobody runs gets a shipment this often. */
  systemEveryMs: 4 * 3_600_000,
  /** An owner who hasn't ordered in this long gets one sent anyway, so shelves never die. */
  neglectMs: 48 * 3_600_000,
};

const shopOf = (id: string): GearShop | null => {
  const k = ITEM_BY_ID[id]?.kind;
  return k === "weapon" ? "guns" : k === "armor" ? "armor" : null;
};

export type Rarity = "common" | "uncommon" | "rare";

/**
 * How hard a piece is to find. It never changes what the piece does in a fight: only how many a
 * shop holds, how often a shipment brings it, and what it fetches on the black market.
 */
export const RARITY: Record<Rarity, { name: string; cap: number; arrives: number }> = {
  common: { name: "Common", cap: 6, arrives: 1 },
  uncommon: { name: "Uncommon", cap: 4, arrives: 0.7 },
  rare: { name: "Rare", cap: 2, arrives: 0.4 },
};

export function rarityOf(id: string): Rarity {
  const price = ITEM_BY_ID[id]?.price ?? 0;
  return price < 1_000 ? "common" : price < 10_000 ? "uncommon" : "rare";
}

/** The most of one piece a shop will hold: plenty of common gear, a couple of the rare. */
export function stockCap(id: string): number {
  return RARITY[rarityOf(id)].cap;
}

/** What this city's shop of this kind carries. */
export function carried(country: CountryId, shop: GearShop): string[] {
  return ITEMS.filter((i) => GEAR_HOME[i.id] === country && shopOf(i.id) === shop).map((i) => i.id);
}

/** Where a piece of gear is sold, by city name. */
export const soldIn = (id: string): string | null => (GEAR_HOME[id] ? COUNTRY_BY_ID[GEAR_HOME[id]].capital : null);

/**
 * One shipment, by luck alone: a random number of the shop's pieces (as few as one), each
 * topped up by a random amount, never past what the shop holds.
 */
export function rollShipment(c: City, shop: GearShop, rng: Rng): { id: string; added: number }[] {
  const list = carried(c.country, shop);
  if (!list.length) return [];
  c.stock = c.stock ?? {};
  const pool = [...list];
  const kinds = 1 + Math.floor(rng() * pool.length);
  const out: { id: string; added: number }[] = [];
  for (let k = 0; k < kinds; k++) {
    const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    // Rarer pieces miss more shipments.
    if (rng() >= RARITY[rarityOf(id)].arrives) continue;
    const cap = stockCap(id);
    const have = c.stock[id] ?? 0;
    const added = Math.min(cap - have, 1 + Math.floor(rng() * cap));
    if (added > 0) {
      c.stock[id] = have + added;
      out.push({ id, added });
    }
  }
  return out;
}

/**
 * Shops nobody runs restock by themselves. Every shop gets a first shipment when stock starts,
 * and an owner who hasn't ordered in two days gets one sent anyway.
 */
export function systemRestock(c: City, now: number, rng: Rng): boolean {
  let changed = false;
  for (const shop of ["guns", "armor"] as const) {
    const last = c.stockAt?.[shop];
    const owned = !!c.shops?.[shop];
    if (last !== undefined && now - last < (owned ? STOCK.neglectMs : STOCK.systemEveryMs)) continue;
    rollShipment(c, shop, rng);
    c.stockAt = { ...(c.stockAt ?? {}), [shop]: now };
    changed = true;
  }
  return changed;
}

/** The owner orders a shipment. What turns up is luck. */
export function ownerRestock(c: City, ownerId: string, shop: GearShop, now: number, rng: Rng): GameEvent[] {
  const h = c.shops?.[shop];
  if (!h || h.ownerId !== ownerId) throw new GameError("You don't run that shop.");
  const last = c.stockAt?.[shop] ?? 0;
  if (now - last < STOCK.ownerEveryMs) {
    const mins = Math.ceil((STOCK.ownerEveryMs - (now - last)) / 60_000);
    throw new GameError(`The next shipment can be ordered in ${mins >= 60 ? `${Math.ceil(mins / 60)} hours` : `${mins} minutes`}.`);
  }
  c.stockAt = { ...(c.stockAt ?? {}), [shop]: now };
  const got = rollShipment(c, shop, rng);
  if (!got.length) return [{ tone: "info", text: "The truck turns up with nothing you don't already have shelves full of." }];
  const what = got.map((g) => `${g.added} × ${ITEM_BY_ID[g.id].name}`).join(", ");
  return [{ tone: "good", text: `The shipment is in: ${what}.` }];
}

/** Takes one off the shelf. Throws if the city doesn't sell it or it's sold out. */
export function takeFromStock(c: City, id: string): void {
  if (!shopOf(id)) return;
  if (GEAR_HOME[id] !== c.country) throw new GameError(`That isn't sold here. Try ${soldIn(id) ?? "another city"}.`);
  const have = c.stock?.[id] ?? 0;
  if (have <= 0) throw new GameError("Sold out. Check back after the next shipment.");
  c.stock = { ...(c.stock ?? {}), [id]: have - 1 };
}

/** Puts one back (a sale that didn't go through). */
export function returnToStock(c: City, id: string): void {
  if (!shopOf(id)) return;
  c.stock = { ...(c.stock ?? {}), [id]: (c.stock?.[id] ?? 0) + 1 };
}

/** What the shop screen shows: how many are on the shelf here. */
export function stockView(c: City | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!c) return out;
  for (const shop of ["guns", "armor"] as const) for (const id of carried(c.country, shop)) out[id] = c.stock?.[id] ?? 0;
  return out;
}

/** When the owner can order next (for the owner's strip). */
export function nextOrderAt(c: City | null | undefined, shop: GearShop): number {
  return (c?.stockAt?.[shop] ?? 0) + STOCK.ownerEveryMs;
}

// ── The pound ────────────────────────────────────────────────────────────
// Dogs come from the city pound. Nobody owns it and no crime can touch it: city hall runs it,
// and its kennels fill by luck, like the gear shops' shelves.

/** Where each breed can be found. */
export const DOG_HOME: Record<string, CountryId> = {
  mutt: "varrow", junkyard: "varrow",
  labrador: "solmarra", pitbull: "solmarra",
  husky: "kestrova", shepherd: "kestrova", rottweiler: "kestrova",
  bulldog: "meridian", mastiff: "meridian",
};

export const POUND = {
  everyMs: 6 * 3_600_000,
  /** Most dogs of one breed waiting at once, by how much the breed costs. */
  cap: (price: number) => (price < 1_000 ? 3 : price < 3_000 ? 2 : 1),
};

const breedsIn = (country: CountryId) => Object.keys(DOG_HOME).filter((b) => DOG_HOME[b] === country);

/** A delivery to the pound, by luck: one breed or several, a dog or a few. */
export function poundShipment(c: City, prices: Record<string, number>, rng: Rng): void {
  const pool = breedsIn(c.country);
  if (!pool.length) return;
  c.pound = c.pound ?? {};
  const kinds = 1 + Math.floor(rng() * pool.length);
  for (let k = 0; k < kinds; k++) {
    const b = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    const cap = POUND.cap(prices[b] ?? 0);
    const have = c.pound[b] ?? 0;
    c.pound[b] = Math.min(cap, have + 1 + Math.floor(rng() * cap));
  }
}

/** The pound fills up on its own every few hours (and opens with a first delivery). */
export function poundRestock(c: City, now: number, prices: Record<string, number>, rng: Rng): boolean {
  if (c.poundAt !== undefined && now - c.poundAt < POUND.everyMs) return false;
  poundShipment(c, prices, rng);
  c.poundAt = now;
  return true;
}

export function takeDog(c: City, breed: string): void {
  if (DOG_HOME[breed] !== c.country) throw new GameError(`That breed isn't at this pound. Try ${COUNTRY_BY_ID[DOG_HOME[breed]]?.capital ?? "another city"}.`);
  const have = c.pound?.[breed] ?? 0;
  if (have <= 0) throw new GameError("None left. The pound gets new dogs every few hours.");
  c.pound = { ...(c.pound ?? {}), [breed]: have - 1 };
}

export function returnDog(c: City, breed: string): void {
  c.pound = { ...(c.pound ?? {}), [breed]: (c.pound?.[breed] ?? 0) + 1 };
}

/** Dogs waiting at this city's pound. */
export function poundView(c: City | null | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (!c) return out;
  for (const b of breedsIn(c.country)) out[b] = c.pound?.[b] ?? 0;
  return out;
}
