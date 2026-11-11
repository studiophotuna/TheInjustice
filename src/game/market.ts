// The black market: a back room on The Street in every city where weapons and armor change hands
// for dirty money. Shops only sell their own city's gear, in limited stock; here you can sell
// your spares to whoever wants them, including gear carried in from another city. That is what
// makes hauling gear between cities worth the trip.
//
// Nobody owns it and it can't be robbed. The house (the fence) takes a cut of every sale, and
// keeps a couple of out-of-town pieces of its own on offer so the room is never empty.
// The city's regulars buy here too, within limits, so sellers have customers.

import { ALT_BLOCK, sameOwner } from "./anticheat";
import { ITEM_BY_ID, ITEMS } from "./content/items";
import { COUNTRY_BY_ID } from "./content/world";
import { countryOf, inHospital, inJail } from "./engine";
import { ensureEquipped, equippedId, GEAR, gearPower, ownedCount, usesLeft } from "./gear";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { notify } from "./social";
import { GEAR_HOME, RARITY, rarityOf } from "./stock";
import { GameError, type City, type GameEvent, type MarketListing, type Player, type Rng } from "./types";

export const MARKET = {
  /** Most pieces one seller can have on offer in a city. */
  maxPerSeller: 5,
  /** Most listings a city's back room holds. */
  maxListings: 30,
  /** The house's cut of every sale between people. */
  cut: 0.1,
  /** Asking price, as a multiple of the piece's usual shop price. */
  minMult: 0.5,
  maxMult: 3,
  /** Buying here goes on your record a little. */
  heat: 3,
  /** The fence's own stock: out-of-town pieces at a premium, refreshed now and then. */
  fence: { everyMs: 8 * 60 * 60_000, keep: 2, mult: { common: 1.6, uncommon: 1.8, rare: 2.1 }, name: "The fence" },
  /** Regulars: at most one buy a day each, and never above this multiple of the shop price. */
  regular: { everyMs: 20 * 60 * 60_000, maxMult: 1.4, reserve: 40 },
};

const isGear = (id: string) => {
  const d = ITEM_BY_ID[id];
  return !!d && (d.kind === "weapon" || d.kind === "armor");
};
const full = (id: string) => ITEM_BY_ID[id]?.durability ?? 0;
const here = (c: City) => COUNTRY_BY_ID[c.country].capital;
const active = (c: City) => c.market ?? [];

/** Why this player can't put this piece up for sale (null if they can). */
export function listBlock(c: City, p: Player, itemId: string, price: number, now: number): string | null {
  const d = ITEM_BY_ID[itemId];
  if (!d || !isGear(itemId)) return "Only weapons and armor change hands here.";
  if (d.issued) return "That's issued gear. The fence won't touch it.";
  if (countryOf(p) !== c.country) return "You have to be in the city.";
  if (inJail(p, now) || inHospital(p, now)) return "You're in no shape for it.";
  const have = ownedCount(p, itemId);
  if (!have) return "You don't have one.";
  // A spare is always new. Your only one has to be unused: nobody pays for a worn piece.
  if (have === 1 && usesLeft(p, itemId) < full(itemId)) return "Nobody buys a worn one. Only spares and unused pieces sell.";
  const a = Math.floor(price);
  if (!Number.isFinite(a) || a < Math.ceil(d.price * MARKET.minMult) || a > Math.floor(d.price * MARKET.maxMult)) {
    return `Ask between $${Math.ceil(d.price * MARKET.minMult).toLocaleString()} and $${Math.floor(d.price * MARKET.maxMult).toLocaleString()}.`;
  }
  if (active(c).filter((l) => l.sellerId === p.id).length >= MARKET.maxPerSeller) return `You can have ${MARKET.maxPerSeller} pieces on offer here at most.`;
  if (active(c).length >= MARKET.maxListings) return "The back room is full. Try later.";
  return null;
}

function takeOne(p: Player, itemId: string) {
  p.inventory[itemId] = ownedCount(p, itemId) - 1;
  if (p.inventory[itemId] <= 0) {
    delete p.inventory[itemId];
    if (p.wear) delete p.wear[itemId];
    ensureEquipped(p);
  }
}

function giveOne(p: Player, itemId: string) {
  const have = ownedCount(p, itemId);
  p.inventory[itemId] = have + 1;
  if (!have && p.wear) delete p.wear[itemId];
  ensureEquipped(p);
  const slot = ITEM_BY_ID[itemId].kind as "weapon" | "armor";
  if (!equippedId(p, slot)) p.equipped = { ...p.equipped, [slot]: itemId };
}

/** Puts a spare (or an unused piece) on offer. It leaves your hands until it sells or you take it back. */
export function listItem(c: City, p: Player, itemId: string, price: number, now: number, rng: Rng): GameEvent[] {
  const block = listBlock(c, p, itemId, price, now);
  if (block) throw new GameError(block);
  takeOne(p, itemId);
  const listing: MarketListing = { id: `m${now.toString(36)}${Math.floor(rng() * 1e5).toString(36)}`, itemId, price: Math.floor(price), sellerId: p.id, sellerName: p.name, at: now };
  c.market = [listing, ...active(c)];
  return [{ tone: "good", text: `Your ${ITEM_BY_ID[itemId].name.toLowerCase()} is on offer in ${here(c)} for $${listing.price.toLocaleString()}. The fence keeps ${Math.round(MARKET.cut * 100)}% when it sells.` }];
}

/** Takes your own piece back off the table. */
export function unlistItem(c: City, p: Player, listingId: string): GameEvent[] {
  const l = active(c).find((x) => x.id === listingId);
  if (!l || l.sellerId !== p.id) throw new GameError("That isn't yours to take back.");
  if (countryOf(p) !== c.country) throw new GameError("You have to be in the city.");
  if (ownedCount(p, l.itemId) >= GEAR.maxOwned) throw new GameError(`You already own ${GEAR.maxOwned} of those. Sell or use one first.`);
  c.market = active(c).filter((x) => x.id !== listingId);
  giveOne(p, l.itemId);
  return [{ tone: "info", text: `You take your ${ITEM_BY_ID[l.itemId].name.toLowerCase()} back.` }];
}

export function buyBlock(c: City, buyer: Player, l: MarketListing | undefined, seller: Player | null, now: number): string | null {
  if (!l) return "Someone else got there first.";
  if (countryOf(buyer) !== c.country) return "You have to be in the city.";
  if (inJail(buyer, now) || inHospital(buyer, now)) return "You're in no shape for it.";
  if (l.sellerId === buyer.id) return "That's your own.";
  if (seller && sameOwner(buyer, seller)) return ALT_BLOCK;
  if (ownedCount(buyer, l.itemId) >= GEAR.maxOwned) return `You can own up to ${GEAR.maxOwned} of those.`;
  if (!canPayIllegal(buyer, l.price)) return `It's $${l.price.toLocaleString()}, cash or dirty money.`;
  return null;
}

/** What the seller receives from a sale. */
export const sellerTake = (price: number) => price - Math.ceil(price * MARKET.cut);

/**
 * A sale. The buyer pays (dirty money first), the seller gets dirty money minus the house's cut,
 * and the piece changes hands new. `seller` is null for the fence's own stock.
 */
export function buyListing(c: City, buyer: Player, seller: Player | null, listingId: string, now: number): GameEvent[] {
  const l = active(c).find((x) => x.id === listingId);
  const block = buyBlock(c, buyer, l, seller, now);
  if (block) throw new GameError(block);
  payIllegal(buyer, l!.price);
  buyer.heat += MARKET.heat;
  giveOne(buyer, l!.itemId);
  c.market = active(c).filter((x) => x.id !== listingId);
  const name = ITEM_BY_ID[l!.itemId].name.toLowerCase();
  if (seller && !l!.fence) {
    const take = sellerTake(l!.price);
    earnDirty(seller, take);
    seller.jobCounts["market:sold"] = (seller.jobCounts["market:sold"] ?? 0) + 1;
    if (!seller.regular) notify(seller, `Your ${name} sold on the black market in ${here(c)}: +$${take.toLocaleString()}, dirty.`, "good", undefined, now);
  }
  buyer.jobCounts["market:bought"] = (buyer.jobCounts["market:bought"] ?? 0) + 1;
  return [{ tone: "good", text: `The ${name} is yours. $${l!.price.toLocaleString()}, no receipt.` }];
}

/** The fence keeps a couple of out-of-town pieces on offer; stale ones are swapped out. */
export function fenceRestock(c: City, now: number, rng: Rng): boolean {
  if (now - (c.fenceAt ?? 0) < MARKET.fence.everyMs) return false;
  c.fenceAt = now;
  const others = active(c).filter((l) => !l.fence);
  const exotic = ITEMS.filter((i) => isGear(i.id) && !i.issued && !i.contraband && GEAR_HOME[i.id] && GEAR_HOME[i.id] !== c.country);
  const fresh: MarketListing[] = [];
  const pool = [...exotic];
  while (fresh.length < MARKET.fence.keep && pool.length) {
    const item = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    // Rare pieces turn up less often here too.
    if (rng() >= RARITY[rarityOf(item.id)].arrives) continue;
    const price = Math.round((item.price * MARKET.fence.mult[rarityOf(item.id)]) / 10) * 10;
    fresh.push({ id: `f${now.toString(36)}${fresh.length}`, itemId: item.id, price, sellerId: "fence", sellerName: MARKET.fence.name, at: now, fence: true });
  }
  c.market = [...fresh, ...others];
  return true;
}

/**
 * The listing a regular would buy now, if any: a piece for a slot where they have nothing that
 * works, or a clear step up from what they carry, at a price they'd pay. One buy a day each.
 */
export function regularPick(c: City, r: Player, now: number): MarketListing | null {
  if (!r.regular || r.dead || inJail(r, now) || inHospital(r, now)) return null;
  if (now - (r.regular.marketAt ?? 0) < MARKET.regular.everyMs) return null;
  const budget = r.cash + (r.dirty ?? 0) - MARKET.regular.reserve;
  const wanted = active(c)
    .filter((l) => !l.fence && l.sellerId !== r.id && l.price <= budget && l.price <= ITEM_BY_ID[l.itemId].price * MARKET.regular.maxMult && ownedCount(r, l.itemId) === 0)
    .filter((l) => {
      const slot = ITEM_BY_ID[l.itemId].kind as "weapon" | "armor";
      const cur = equippedId(r, slot);
      const working = cur && usesLeft(r, cur) > 0;
      return !working || (ITEM_BY_ID[l.itemId].power ?? 0) > gearPower(r, slot) * 1.15;
    })
    // The best piece they can get, then the cheapest ask for it.
    .sort((a, b) => (ITEM_BY_ID[b.itemId].power ?? 0) - (ITEM_BY_ID[a.itemId].power ?? 0) || a.price - b.price);
  return wanted[0] ?? null;
}

/** What the back room shows a player. */
export function marketView(c: City, p: Player, sellers: Record<string, Player | null>, now: number) {
  return {
    city: here(c),
    cut: MARKET.cut,
    listings: active(c).map((l) => {
      const d = ITEM_BY_ID[l.itemId];
      return {
        id: l.id,
        itemId: l.itemId,
        name: d.name,
        icon: d.icon,
        slot: d.kind,
        rarity: rarityOf(l.itemId),
        from: GEAR_HOME[l.itemId] ? COUNTRY_BY_ID[GEAR_HOME[l.itemId]].capital : null,
        price: l.price,
        seller: l.sellerName,
        mine: l.sellerId === p.id,
        block: l.sellerId === p.id ? null : buyBlock(c, p, l, sellers[l.sellerId] ?? null, now),
      };
    }),
    // What you could put on the table: spares and unused pieces.
    sellable: Object.keys(p.inventory)
      .filter((id) => isGear(id) && !ITEM_BY_ID[id].issued && (ownedCount(p, id) > 1 || usesLeft(p, id) >= full(id)))
      .map((id) => {
        const d = ITEM_BY_ID[id];
        return { id, name: d.name, rarity: rarityOf(id), spares: Math.max(0, ownedCount(p, id) - 1), shopPrice: d.price, min: Math.ceil(d.price * MARKET.minMult), max: Math.floor(d.price * MARKET.maxMult) };
      }),
    mine: active(c).filter((l) => l.sellerId === p.id).length,
    maxMine: MARKET.maxPerSeller,
  };
}
