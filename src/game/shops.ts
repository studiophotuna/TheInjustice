import { COUNTRY_BY_ID } from "./content/world";
import type { ItemKind } from "./content/items";
import { GameError, type City, type CountryId, type GameEvent, type Player, type ShopHold, type ShopKind } from "./types";

/** Player-run storefronts: one of each per city. Whoever holds the licence sets the prices and keeps the margin. */
export const SHOP = {
  kinds: {
    guns: { name: "Gun shop", icon: "🔫", sells: "weapon", license: 25_000 },
    armor: { name: "Armor outfitter", icon: "🦺", sells: "armor", license: 20_000 },
    diner: { name: "Diner", icon: "🍲", sells: "food", license: 6_000 },
    pharmacy: { name: "Pharmacy", icon: "🩹", sells: "medical", license: 8_000 },
    realty: { name: "Real estate office", icon: "🏠", sells: "housing", license: 40_000 },
  } satisfies Record<ShopKind, { name: string; icon: string; sells: ItemKind; license: number }>,
  minMarkup: 0.85,
  maxMarkup: 1.5,
  /** What the stock costs the shop, as a share of the usual local price. The rest of a sale is the owner's. */
  costShare: 0.8,
  /** Most shops one person can run, across every city. */
  maxOwned: 2,
  /** An owner gone this long loses the licence to anyone who pays the city for it. */
  idleMs: 7 * 24 * 3_600_000,
  offerTtlMs: 48 * 3_600_000,
  maxOffers: 5,
  /** City hall buys a licence back at this share of the price. */
  buyback: 0.5,
  minOffer: 1_000,
} as const;

export const SHOP_KINDS = Object.keys(SHOP.kinds) as ShopKind[];

export function shopKindFor(kind: ItemKind): ShopKind {
  return SHOP_KINDS.find((k) => SHOP.kinds[k].sells === kind)!;
}

export function licensePrice(country: CountryId, kind: ShopKind): number {
  return Math.round(SHOP.kinds[kind].license * COUNTRY_BY_ID[country].priceMult);
}

/** Shelf price at a player-run shop. `local` is the usual price in this city. */
export function shopPrice(local: number, markup: number): number {
  return Math.round(local * markup);
}

/** What the owner keeps from a sale (never negative: a discount can't cost them more than their margin). */
export function ownerCut(local: number, paid: number): number {
  return Math.max(0, paid - Math.floor(local * SHOP.costShare));
}

/** What the buy action needs to know about each shop in the city. */
export type ShopMarkups = Partial<Record<ShopKind, { markup: number; ownerId: string }>>;

export function shopMarkups(c: City | null | undefined): ShopMarkups {
  const out: ShopMarkups = {};
  for (const k of SHOP_KINDS) {
    const h = c?.shops?.[k];
    if (h) out[k] = { markup: h.markup, ownerId: h.ownerId };
  }
  return out;
}

/** The till fills after a sale is saved. */
export function creditSale(c: City, kind: ShopKind, amount: number, now: number) {
  const h = c.shops?.[kind];
  if (!h || amount <= 0) return;
  h.till += amount;
  h.earned += amount;
  h.sales += 1;
  h.lastSaleAt = now;
}

export function isIdle(owner: Pick<Player, "seenAt" | "tickAt"> | null | undefined, now: number): boolean {
  if (!owner) return true;
  return now - (owner.seenAt ?? owner.tickAt ?? 0) > SHOP.idleMs;
}

function hold(c: City, kind: ShopKind): ShopHold | null {
  if (!SHOP.kinds[kind]) throw new GameError("No such shop.");
  return c.shops?.[kind] ?? null;
}

function mine(c: City, p: Player, kind: ShopKind): ShopHold {
  const h = hold(c, kind);
  if (!h || h.ownerId !== p.id) throw new GameError("You don't run that shop.");
  return h;
}

function announce(c: City, text: string, now: number) {
  c.log = [{ at: now, text }, ...(c.log ?? [])].slice(0, 20);
}

function dropOffers(h: ShopHold, now: number) {
  h.offers = (h.offers ?? []).filter((o) => now - o.at < SHOP.offerTtlMs);
}

/** Empties the till into the owner's pocket; the city takes its usual tax. */
export function collectTill(c: City, owner: Player, kind: ShopKind): GameEvent[] {
  const h = mine(c, owner, kind);
  return payOut(c, owner, h, kind);
}

function payOut(c: City, owner: Player, h: ShopHold, kind: ShopKind): GameEvent[] {
  if (h.till <= 0) return [];
  const tax = Math.floor(h.till * (c.taxRate ?? 0));
  const net = h.till - tax;
  c.treasury += tax;
  owner.cash += net;
  h.till = 0;
  return [{ tone: "good", text: `Takings from the ${SHOP.kinds[kind].name.toLowerCase()}: +$${net.toLocaleString()}${tax ? ` (city tax $${tax.toLocaleString()})` : ""}.` }];
}

/**
 * Buys the licence from city hall (paid from the bank). Works on a shop nobody runs,
 * or one whose owner hasn't been seen in a week; their takings go to their bank.
 */
export function takeLicense(c: City, p: Player, kind: ShopKind, owned: number, now: number, prev?: Player | null): GameEvent[] {
  const h = hold(c, kind);
  if (h?.ownerId === p.id) throw new GameError("You already run it.");
  if (h && !isIdle(prev, now)) throw new GameError(`${h.ownerName} runs it. Make them an offer instead.`);
  if (owned >= SHOP.maxOwned) throw new GameError(`You can run ${SHOP.maxOwned} shops at most. Sell one first.`);
  const price = licensePrice(c.country, kind);
  if (!p.hasBankAccount) throw new GameError("Licences are paid from a bank account. Open one first.");
  if (p.bank < price) throw new GameError(`The licence costs $${price.toLocaleString()} from your bank.`);
  if (h && prev) {
    prev.bank += h.till;
    if (!prev.hasBankAccount) prev.hasBankAccount = true;
  }
  p.bank -= price;
  c.treasury += price;
  c.shops = { ...(c.shops ?? {}), [kind]: { ownerId: p.id, ownerName: p.name, markup: 1, since: now, till: 0, sales: 0, earned: 0, offers: [] } };
  const name = SHOP.kinds[kind].name.toLowerCase();
  announce(c, `${p.name} took over the ${name}.`, now);
  return [{ tone: "good", text: `The ${name} is yours. Set your prices and the takings start with the next sale.` }];
}

export function setMarkup(c: City, p: Player, kind: ShopKind, markup: number): GameEvent[] {
  const h = mine(c, p, kind);
  if (!Number.isFinite(markup)) throw new GameError("Pick a price level.");
  const m = Math.round(Math.min(SHOP.maxMarkup, Math.max(SHOP.minMarkup, markup)) * 100) / 100;
  h.markup = m;
  const pct = Math.round((m - 1) * 100);
  return [{ tone: "info", text: pct === 0 ? "Prices back to the usual." : `Prices ${pct > 0 ? "+" : ""}${pct}% from now on.` }];
}

/** An offer to buy someone's shop. The money only moves if they accept. */
export function makeOffer(c: City, p: Player, kind: ShopKind, amount: number, now: number): GameEvent[] {
  const h = hold(c, kind);
  if (!h) throw new GameError("Nobody runs it. Buy the licence from city hall.");
  if (h.ownerId === p.id) throw new GameError("It's already yours.");
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a < SHOP.minOffer) throw new GameError(`Offers start at $${SHOP.minOffer.toLocaleString()}.`);
  if (!p.hasBankAccount || p.bank < a) throw new GameError("You need that much in the bank to make the offer.");
  dropOffers(h, now);
  const others = h.offers.filter((o) => o.fromId !== p.id);
  if (others.length >= SHOP.maxOffers) throw new GameError("The owner has a pile of offers already. Try again later.");
  h.offers = [{ fromId: p.id, fromName: p.name, amount: a, at: now }, ...others];
  return [{ tone: "info", text: `Offer of $${a.toLocaleString()} sent to ${h.ownerName}. The money stays in your bank until they accept.` }];
}

export function withdrawOffer(c: City, p: Player, kind: ShopKind): GameEvent[] {
  const h = hold(c, kind);
  if (!h) throw new GameError("No such offer.");
  h.offers = (h.offers ?? []).filter((o) => o.fromId !== p.id);
  return [{ tone: "info", text: "Offer withdrawn." }];
}

export function declineOffer(c: City, owner: Player, kind: ShopKind, fromId: string): GameEvent[] {
  const h = mine(c, owner, kind);
  h.offers = (h.offers ?? []).filter((o) => o.fromId !== fromId);
  return [{ tone: "info", text: "Offer turned down." }];
}

/** The owner sells: the buyer's bank pays the owner's bank, takings are paid out first. */
export function acceptOffer(c: City, owner: Player, buyer: Player, kind: ShopKind, buyerOwned: number, now: number): GameEvent[] {
  const h = mine(c, owner, kind);
  dropOffers(h, now);
  const offer = h.offers.find((o) => o.fromId === buyer.id);
  if (!offer) throw new GameError("That offer has expired.");
  if (buyer.dead) throw new GameError("They're not around anymore.");
  if (buyerOwned >= SHOP.maxOwned) throw new GameError(`${buyer.name} already runs ${SHOP.maxOwned} shops.`);
  if (!buyer.hasBankAccount || buyer.bank < offer.amount) {
    h.offers = h.offers.filter((o) => o !== offer);
    throw new GameError(`${buyer.name} can't cover the offer anymore. It's been dropped.`);
  }
  const events = payOut(c, owner, h, kind);
  buyer.bank -= offer.amount;
  if (!owner.hasBankAccount) owner.hasBankAccount = true;
  owner.bank += offer.amount;
  c.shops = { ...(c.shops ?? {}), [kind]: { ...h, ownerId: buyer.id, ownerName: buyer.name, since: now, till: 0, sales: 0, earned: 0, offers: [], lastSaleAt: undefined } };
  const name = SHOP.kinds[kind].name.toLowerCase();
  announce(c, `${buyer.name} bought the ${name} from ${owner.name}.`, now);
  events.push({ tone: "good", text: `Sold the ${name} to ${buyer.name} for $${offer.amount.toLocaleString()} (to your bank).` });
  return events;
}

/** City hall buys the licence back at half price (out of the treasury). */
export function sellBack(c: City, p: Player, kind: ShopKind, now: number): GameEvent[] {
  const h = mine(c, p, kind);
  const back = Math.floor(licensePrice(c.country, kind) * SHOP.buyback);
  if (c.treasury < back) throw new GameError("City hall can't afford to buy it back right now. Find a buyer instead.");
  const events = payOut(c, p, h, kind);
  c.treasury -= back;
  p.bank += back;
  if (!p.hasBankAccount) p.hasBankAccount = true;
  const shops = { ...(c.shops ?? {}) };
  delete shops[kind];
  c.shops = shops;
  const name = SHOP.kinds[kind].name.toLowerCase();
  announce(c, `The ${name} is back with city hall. The licence is up for grabs.`, now);
  events.push({ tone: "info", text: `City hall bought the licence back: +$${back.toLocaleString()} to your bank.` });
  return events;
}

/** Shops someone runs across every city. */
export function shopsOwnedBy(cities: (City | null | undefined)[], id: string): { country: CountryId; kind: ShopKind }[] {
  const out: { country: CountryId; kind: ShopKind }[] = [];
  for (const c of cities) {
    if (!c) continue;
    for (const k of SHOP_KINDS) if (c.shops?.[k]?.ownerId === id) out.push({ country: c.country, kind: k });
  }
  return out;
}

/** What a player sees on the city's shop row. Offers and takings only show to the owner. */
export function shopsView(c: City, me: Player, owners: Record<string, Pick<Player, "seenAt" | "tickAt"> | null>, now: number) {
  return SHOP_KINDS.map((k) => {
    const h = c.shops?.[k] ?? null;
    const def = SHOP.kinds[k];
    const mineHere = h?.ownerId === me.id;
    const offers = h ? (h.offers ?? []).filter((o) => now - o.at < SHOP.offerTtlMs) : [];
    return {
      kind: k,
      name: def.name,
      icon: def.icon,
      sells: def.sells,
      license: licensePrice(c.country, k),
      owner: h ? { id: h.ownerId, name: h.ownerName, idle: isIdle(owners[h.ownerId], now), since: h.since } : null,
      markup: h?.markup ?? 1,
      mine: mineHere,
      till: mineHere ? h!.till : null,
      sales: mineHere ? h!.sales : null,
      earned: mineHere ? h!.earned : null,
      lastSaleAt: mineHere ? (h!.lastSaleAt ?? null) : null,
      offers: mineHere ? offers.map((o) => ({ fromId: o.fromId, fromName: o.fromName, amount: o.amount, at: o.at })) : [],
      myOffer: !mineHere && h ? (offers.find((o) => o.fromId === me.id)?.amount ?? null) : null,
      buyback: Math.floor(licensePrice(c.country, k) * SHOP.buyback),
    };
  });
}
