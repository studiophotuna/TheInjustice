// Favors: the game's premium currency. Bought with real money (once a payment provider is
// connected) or granted by a moderator, and spent only on looks: frames around your face, the
// colour of your name, the banner behind your profile. Favors never buy power: no energy, stats,
// gear, money, property, rank or time off a sentence. They never turn back into real money.

import { GameError, type GameEvent, type Player } from "./types";

export type CosmeticKind = "frame" | "color" | "banner" | "paint" | "decor" | "item";
export interface Cosmetic { id: string; kind: CosmeticKind; name: string; price: number; /** Animated, premium. */ fx?: boolean; /** Only the season pass gives it out; never sold. */ pass?: boolean }

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
const FX = (kind: CosmeticKind, id: string, name: string, price: number): Cosmetic => ({ ...C(kind, id, name, price), fx: true });
const P = (kind: CosmeticKind, id: string, name: string): Cosmetic => ({ ...C(kind, id, name, 0), pass: true });

export const COSMETICS: Cosmetic[] = [
  C("item", "mic", "Microphone", 400),
  FX("frame", "goldrush", "Gold rush", 500),
  FX("frame", "wildfire", "Wildfire", 500),
  FX("frame", "livewire", "Live wire", 450),
  FX("frame", "frostbite", "Frostbite", 450),
  FX("frame", "bloodmoon", "Blood moon", 400),
  FX("frame", "aurora", "Aurora", 600),
  FX("color", "goldrush", "Gold rush", 300),
  FX("color", "wildfire", "Wildfire", 300),
  FX("color", "neon", "Neon", 250),
  FX("color", "chrome", "Chrome", 250),
  FX("color", "frost", "Frost", 250),
  FX("color", "aurora", "Aurora", 350),
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
  C("paint", "midnight", "Midnight blue", 150),
  C("paint", "candy", "Candy red", 150),
  C("paint", "lime", "Acid lime", 150),
  C("paint", "pearl", "Pearl white", 150),
  C("paint", "gold", "Gold flake", 250),
  C("paint", "matte", "Matte black", 200),
  C("paint", "teal", "Harbor teal", 150),
  C("paint", "violet", "Violet", 150),
  C("decor", "loft", "Warm loft", 250),
  C("decor", "boutique", "White boutique", 250),
  C("decor", "minimal", "Clean lines", 250),
  C("decor", "sunroom", "Sunroom", 250),
  C("decor", "classic", "Old-school classic", 250),
  C("decor", "marble", "Marble staircase", 400),
  // Season pass only.
  P("color", "ember", "Ember"),
  P("color", "jade", "Jade"),
  P("color", "smoke", "Smoke"),
  P("color", "sunset", "Sunset"),
  P("frame", "brass", "Brass knuckle"),
  P("frame", "onyx", "Onyx"),
  P("frame", "halo", "Halo"),
  P("banner", "railyards", "Rail Yards"),
  P("banner", "oldmarket", "Old Market"),
  P("banner", "halcyon", "Halcyon"),
  P("banner", "ironmoor", "Ironmoor"),
];
export const COSMETIC_BY_ID: Record<string, Cosmetic> = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

/** What others see: the frame, name colour and banner you have on (only the short names). */
export interface Look { frame: string | null; color: string | null; banner: string | null }

/** "frame:gilded" → "gilded"; an uploaded look "upload:<id>" → "u-<id>". */
const short = (id: string | null | undefined) => (!id ? null : id.startsWith("upload:") ? `u-${id.slice(7)}` : id.split(":")[1] ?? null);

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
export function creditFavors(
  p: Player,
  amount: number,
  what: string,
  now: number,
  ref?: string,
  /** "locked": spend only, never sell (grants, free rewards). "hold": sellable after a week
   *  (bought with money or on the exchange). */
  how: "locked" | "hold" = "locked",
): boolean {
  if (!Number.isInteger(amount) || amount <= 0) throw new GameError("That amount won't work.");
  if (ref && (p.favorRefs ?? []).includes(ref)) return false;
  p.favors = (p.favors ?? 0) + amount;
  if (how === "locked") p.favorsLocked = (p.favorsLocked ?? 0) + amount;
  else p.favorHolds = [...activeHolds(p, now), { amount, until: now + FAVOR_HOLD_MS }];
  if (ref) p.favorRefs = [ref, ...(p.favorRefs ?? [])].slice(0, 200);
  log(p, amount, what, now, ref);
  return true;
}

/** Favors bought (with money or on the exchange) can't be sold again for a week. */
export const FAVOR_HOLD_MS = 7 * 86_400_000;

const activeHolds = (p: Player, now: number) => (p.favorHolds ?? []).filter((h) => h.until > now && h.amount > 0);

/** Favors that could be listed on the exchange right now. */
export function sellableFavors(p: Player, now: number): number {
  const held = activeHolds(p, now).reduce((n, h) => n + h.amount, 0);
  return Math.max(0, (p.favors ?? 0) - (p.favorsLocked ?? 0) - held);
}

/** Takes Favors out, using up the ones that can't be sold first. */
export function spendFavors(p: Player, amount: number, now: number): void {
  if ((p.favors ?? 0) < amount) throw new GameError("You don't have enough Favors.");
  p.favors = (p.favors ?? 0) - amount;
  let left = amount;
  const locked = Math.min(p.favorsLocked ?? 0, left);
  p.favorsLocked = (p.favorsLocked ?? 0) - locked;
  left -= locked;
  const holds = activeHolds(p, now).sort((a, b) => b.until - a.until);
  for (const h of holds) {
    if (left <= 0) break;
    const take = Math.min(h.amount, left);
    h.amount -= take;
    left -= take;
  }
  p.favorHolds = holds.filter((h) => h.amount > 0);
}

export function buyCosmetic(p: Player, id: string, now: number): GameEvent[] {
  const item = COSMETIC_BY_ID[id];
  if (!item) throw new GameError("That isn't for sale.");
  const owned = p.cosmetics?.owned ?? [];
  if (owned.includes(id)) throw new GameError("You already have it.");
  if (item.pass) throw new GameError("That one only comes from the season pass.");
  if ((p.favors ?? 0) < item.price) throw new GameError("You don't have enough Favors.");
  spendFavors(p, item.price, now);
  p.cosmetics = { ...(p.cosmetics ?? { owned: [] }), owned: [...owned, id], ...(item.kind === "item" ? {} : { [item.kind]: id }) };
  log(p, -item.price, item.name, now);
  if (id === MIC) return [{ tone: "good", text: "The microphone is yours. You can speak in Global chat now, for good." }];
  return [{ tone: "good", text: `${item.name} is yours, and you're wearing it.` }];
}

/** The microphone: owning it lets you post in Global chat (everyone can still read it). */
export const MIC = "item:mic";
export const hasMic = (p: Player) => (p.cosmetics?.owned ?? []).includes(MIC);

/** Paint colours for cars. */
export const PAINTS: Record<string, string> = {
  midnight: "#22305a",
  candy: "#d6213b",
  lime: "#8fd14f",
  pearl: "#efe9dd",
  gold: "#cfa12e",
  matte: "#2e3136",
  teal: "#1aa596",
  violet: "#7a43ff",
};

/** The colour of this player's cars, if they've had them painted. */
export const paintOf = (p: Player): string | null => {
  const id = p.cosmetics?.paint;
  return id ? (PAINTS[id.split(":")[1]] ?? null) : null;
};

/** The photo of this player's place, if they've decorated it. */
export const decorOf = (p: Player): string | null => {
  const id = p.cosmetics?.decor;
  return id ? `/decor/${id.split(":")[1]}.jpg` : null;
};

export function equipCosmetic(p: Player, kind: CosmeticKind, id: string | null): GameEvent[] {
  if (!["frame", "color", "banner", "paint", "decor"].includes(kind)) throw new GameError("Bad request.");
  if (id?.startsWith("upload:")) {
    const own = kind === "frame" || kind === "banner" ? p.customLooks?.[kind] : undefined;
    if (!own || own.id !== id.slice(7) || own.status !== "approved") throw new GameError("That isn't approved yet.");
    p.cosmetics = { ...(p.cosmetics ?? { owned: [] }), [kind]: id };
    return [{ tone: "good", text: `Now wearing your own ${kind}.` }];
  }
  if (id !== null) {
    const item = COSMETIC_BY_ID[id];
    if (!item || item.kind !== kind) throw new GameError("That doesn't go there.");
    if (!(p.cosmetics?.owned ?? []).includes(id)) throw new GameError("You don't own that yet.");
  }
  p.cosmetics = { ...(p.cosmetics ?? { owned: [] }), [kind]: id };
  return [{ tone: "good", text: id ? `Now wearing ${COSMETIC_BY_ID[id].name}.` : "Taken off." }];
}

// ── Your own frame or banner ──────────────────────────────────────────────

export const CUSTOM = {
  frame: { price: 300, maxChars: 180_000, types: ["png", "webp"] },
  banner: { price: 250, maxChars: 260_000, types: ["jpeg", "png", "webp"] },
} as const;
export type CustomKind = keyof typeof CUSTOM;

/** Checks an uploaded image: the right type for the slot, and small enough. */
export function validUpload(kind: CustomKind, data: unknown): string {
  const spec = CUSTOM[kind];
  if (!spec) throw new GameError("Bad request.");
  if (typeof data !== "string" || data.length > spec.maxChars) throw new GameError("That image is too big. Try a smaller one.");
  const m = data.match(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/);
  if (!m || !(spec.types as readonly string[]).includes(m[1])) {
    throw new GameError(kind === "frame" ? "Frames must be PNG or WebP, with a see-through middle." : "Banners must be JPEG, PNG or WebP.");
  }
  return data;
}

/** Pays for an upload and marks it as waiting for a moderator. Returns the price paid. */
export function startUpload(p: Player, kind: CustomKind, id: string, now: number): number {
  const spec = CUSTOM[kind];
  if ((p.mutedUntil ?? 0) > now) throw new GameError("You're muted, so uploads are locked for now.");
  if (p.customLooks?.[kind]?.status === "pending") throw new GameError(`Your ${kind} is still waiting for approval.`);
  if ((p.favors ?? 0) < spec.price) throw new GameError("You don't have enough Favors.");
  spendFavors(p, spec.price, now);
  log(p, -spec.price, `Your own ${kind} (waiting for approval)`, now, `upload:${id}`);
  p.customLooks = { ...(p.customLooks ?? {}), [kind]: { id, status: "pending", at: now } };
  return spec.price;
}

/**
 * A moderator's decision. Approved: the player starts wearing it. Rejected: the Favors come
 * back (once) with the reason. Old decisions about a replaced upload change nothing.
 */
export function reviewUpload(p: Player, kind: CustomKind, id: string, approved: boolean, reason: string, cost: number, now: number): GameEvent[] {
  const cur = p.customLooks?.[kind];
  if (!cur || cur.id !== id) return [];
  if (approved) {
    p.customLooks = { ...(p.customLooks ?? {}), [kind]: { id, status: "approved", at: now } };
    p.cosmetics = { ...(p.cosmetics ?? { owned: [] }), [kind]: `upload:${id}` };
    return [{ tone: "good", text: `Your ${kind} was approved. You're wearing it now.` }];
  }
  p.customLooks = { ...(p.customLooks ?? {}), [kind]: { id, status: "rejected", at: now, ...(reason ? { reason } : {}) } };
  if (p.cosmetics?.[kind] === `upload:${id}`) p.cosmetics = { ...p.cosmetics, [kind]: null };
  if (cost > 0) creditFavors(p, cost, `Refund: your ${kind} wasn't approved`, now, `refund:${id}`);
  return [{ tone: "bad", text: `Your ${kind} wasn't approved${reason ? `: ${reason}` : "."} Your ${cost} Favors are back.` }];
}

/** Your own Favors screen. */
export function favorsView(p: Player) {
  return {
    balance: p.favors ?? 0,
    owned: p.cosmetics?.owned ?? [],
    equipped: {
      frame: p.cosmetics?.frame ?? null,
      color: p.cosmetics?.color ?? null,
      banner: p.cosmetics?.banner ?? null,
      paint: p.cosmetics?.paint ?? null,
      decor: p.cosmetics?.decor ?? null,
    },
    custom: { frame: p.customLooks?.frame ?? null, banner: p.customLooks?.banner ?? null },
    log: (p.favorLog ?? []).slice(0, 10).map((l) => ({ at: l.at, delta: l.delta, what: l.what })),
  };
}
