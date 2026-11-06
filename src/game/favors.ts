// Favors: the game's premium currency. Bought with real money (once a payment provider is
// connected) or granted by a moderator, and spent only on looks: frames around your face, the
// colour of your name, the banner behind your profile. Favors never buy power: no energy, stats,
// gear, money, property, rank or time off a sentence. They never turn back into real money.

import { GameError, type GameEvent, type Player } from "./types";

export type CosmeticKind = "frame" | "color" | "banner";
export interface Cosmetic { id: string; kind: CosmeticKind; name: string; price: number }

export const FAVORS = {
  /** Packs for sale. Prices are placeholders until the store opens. */
  packs: [
    { id: "pack_100", favors: 100, price: "$1.99" },
    { id: "pack_550", favors: 550, price: "$9.99", bonus: "10% extra" },
    { id: "pack_1200", favors: 1200, price: "$19.99", bonus: "20% extra" },
    { id: "pack_3200", favors: 3200, price: "$49.99", bonus: "28% extra" },
  ],
  /** Moderators can grant at most this many at once (testing and support). */
  grantMax: 10_000,
  logMax: 40,
};

const C = (kind: CosmeticKind, id: string, name: string, price: number): Cosmetic => ({ id: `${kind}:${id}`, kind, name, price });

export const COSMETICS: Cosmetic[] = [
  C("frame", "gilded", "Gilded", 120),
  C("frame", "blood", "Blood oath", 120),
  C("frame", "harbor", "Harbor light", 120),
  C("frame", "velvet", "Velvet", 120),
  C("frame", "steel", "Steel", 80),
  C("frame", "neon", "Night sign", 200),
  C("color", "gold", "Gold", 60),
  C("color", "crimson", "Crimson", 60),
  C("color", "teal", "Teal", 60),
  C("color", "violet", "Violet", 60),
  C("color", "ice", "Ice", 60),
  C("color", "rose", "Rose", 60),
  C("banner", "marina", "The Marina", 150),
  C("banner", "casino", "Casino Strip", 150),
  C("banner", "highrise", "The High Rises", 150),
  C("banner", "ironrow", "Iron Row", 150),
  C("banner", "cityhall", "City Hall", 150),
  C("banner", "boardwalk", "The Boardwalk", 150),
  C("banner", "foundry", "The Foundry", 150),
  C("banner", "undercity", "The Undercity", 150),
];
export const COSMETIC_BY_ID: Record<string, Cosmetic> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

/** What others see: the frame, name colour and banner you have on (only the short names). */
export interface Look { frame: string | null; color: string | null; banner: string | null }

const short = (id: string | null | undefined) => (id ? id.split(":")[1] ?? null : null);

export function lookOf(p: Player): Look | null {
  const c = p.cosmetics;
  if (!c || (!c.frame && !c.color && !c.banner)) return null;
  return { frame: short(c.frame), color: short(c.color), banner: short(c.banner) };
}

function log(p: Player, delta: number, what: string, now: number, ref?: string) {
  p.favorLog = [{ at: now, delta, what, ...(ref ? { ref } : {}) }, ...(p.favorLog ?? [])].slice(0, FAVORS.logMax);
}

/**
 * Adds Favors from a purchase or a grant. `ref` is the payment or grant id: the same ref is
 * never credited twice, so a payment provider can retry its notice safely.
 */
export function creditFavors(p: Player, amount: number, what: string, now: number, ref?: string): boolean {
  if (!Number.isInteger(amount) || amount <= 0) throw new GameError("That amount won't work.");
  if (ref && (p.favorRefs ?? []).includes(ref)) return false;
  p.favors = (p.favors ?? 0) + amount;
  if (ref) p.favorRefs = [ref, ...(p.favorRefs ?? [])].slice(0, 200);
  log(p, amount, what, now, ref);
  return true;
}

export function buyCosmetic(p: Player, id: string, now: number): GameEvent[] {
  const item = COSMETIC_BY_ID[id];
  if (!item) throw new GameError("That isn't for sale.");
  const owned = p.cosmetics?.owned ?? [];
  if (owned.includes(id)) throw new GameError("You already have it.");
  if ((p.favors ?? 0) < item.price) throw new GameError("You don't have enough Favors.");
  p.favors = (p.favors ?? 0) - item.price;
  p.cosmetics = { ...(p.cosmetics ?? { owned: [] }), owned: [...owned, id], [item.kind]: id };
  log(p, -item.price, item.name, now);
  return [{ tone: "good", text: `${item.name} is yours, and you're wearing it.` }];
}

export function equipCosmetic(p: Player, kind: CosmeticKind, id: string | null): GameEvent[] {
  if (!["frame", "color", "banner"].includes(kind)) throw new GameError("Bad request.");
  if (id !== null) {
    const item = COSMETIC_BY_ID[id];
    if (!item || item.kind !== kind) throw new GameError("That doesn't go there.");
    if (!(p.cosmetics?.owned ?? []).includes(id)) throw new GameError("You don't own that yet.");
  }
  p.cosmetics = { ...(p.cosmetics ?? { owned: [] }), [kind]: id };
  return [{ tone: "good", text: id ? `Now wearing ${COSMETIC_BY_ID[id].name}.` : "Taken off." }];
}

/** Your own Favors screen. */
export function favorsView(p: Player) {
  return {
    balance: p.favors ?? 0,
    owned: p.cosmetics?.owned ?? [],
    equipped: { frame: p.cosmetics?.frame ?? null, color: p.cosmetics?.color ?? null, banner: p.cosmetics?.banner ?? null },
    log: (p.favorLog ?? []).slice(0, 10).map((l) => ({ at: l.at, delta: l.delta, what: l.what })),
  };
}
