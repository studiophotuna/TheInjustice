// Equipment: one weapon and one armor slot. Only equipped gear counts in a fight, and gear wears
// out with use (fights, rough jobs). Worn gear hits softer; broken gear does nothing until it's
// repaired at the shop. Issued gear (police, military) is serviced free at the armory once a day.

import { ITEM_BY_ID, type ItemDef } from "./content/items";
import { GameError, type GameEvent, type Player } from "./types";

export type Slot = "weapon" | "armor";

export const GEAR = {
  /** Repairs cost this share of the price for a fully worn item. */
  repairShare: 0.6,
  /** Worn gear still gives at least this share of its power until it breaks. */
  wornFloor: 0.6,
  armoryCooldownMs: 24 * 60 * 60_000,
  /** Armor power at which it soaks half of every hit. */
  blockHalf: 28,
};

const isGear = (d: ItemDef | undefined): d is ItemDef => !!d && (d.kind === "weapon" || d.kind === "armor");

export function maxUses(def: ItemDef): number {
  return def.durability ?? 50;
}

export function usesLeft(p: Player, id: string): number {
  const def = ITEM_BY_ID[id];
  if (!isGear(def)) return 0;
  return Math.max(0, Math.min(maxUses(def), p.wear?.[id] ?? maxUses(def)));
}

export function condition(p: Player, id: string): number {
  const def = ITEM_BY_ID[id];
  return isGear(def) ? usesLeft(p, id) / maxUses(def) : 0;
}

/** The gear in a slot, if it's still owned. */
export function equippedId(p: Player, slot: Slot): string | null {
  const id = p.equipped?.[slot] ?? null;
  return id && p.inventory[id] && ITEM_BY_ID[id]?.kind === slot ? id : null;
}

/** Older characters (before slots existed) get their best gear equipped once. */
export function ensureEquipped(p: Player) {
  if (p.equipped) {
    for (const slot of ["weapon", "armor"] as const) if (p.equipped[slot] && !equippedId(p, slot)) p.equipped[slot] = null;
    return;
  }
  p.equipped = {};
  for (const slot of ["weapon", "armor"] as const) {
    let best: ItemDef | null = null;
    for (const id of Object.keys(p.inventory)) {
      const d = ITEM_BY_ID[id];
      if (p.inventory[id] > 0 && d?.kind === slot && (d.power ?? 0) > (best?.power ?? 0)) best = d;
    }
    p.equipped[slot] = best?.id ?? null;
  }
}

/** Combat bonus from the slot: full when new, softer when worn, nothing when broken. */
export function gearPower(p: Player, slot: Slot): number {
  const id = equippedId(p, slot);
  if (!id) return 0;
  const def = ITEM_BY_ID[id];
  const c = condition(p, id);
  if (c <= 0) return 0;
  return (def.power ?? 0) * (GEAR.wornFloor + (1 - GEAR.wornFloor) * c);
}

/** How gear feels, in a word: quick weapons, heavy gear. Never a number. */
export function gearTrait(def: ItemDef): string | null {
  if (def.kind !== "weapon" && def.kind !== "armor") return null;
  const a = def.agility ?? 0;
  if (a > 0) return "Quick";
  if (a < 0) return "Heavy";
  return def.kind === "armor" && (def.power ?? 0) <= 12 ? "Light" : null;
}

/** How gear changes your speed: quick weapons help, heavy gear slows you (while it isn't broken). */
export function gearAgility(p: Player, slot: Slot): number {
  const id = equippedId(p, slot);
  if (!id || condition(p, id) <= 0) return 0;
  return ITEM_BY_ID[id].agility ?? 0;
}

/** The share of every hit your armor soaks up. Worn armor soaks less; broken armor none. */
export function armorBlock(p: Player): number {
  const power = gearPower(p, "armor");
  return power > 0 ? power / (power + GEAR.blockHalf) : 0;
}

/** One use of the gear in these slots. Returns a line for anything that just broke. */
export function wearGear(p: Player, slots: Slot[], uses = 1): GameEvent[] {
  const out: GameEvent[] = [];
  for (const slot of slots) {
    const id = equippedId(p, slot);
    if (!id) continue;
    const before = usesLeft(p, id);
    if (before <= 0) continue;
    const after = Math.max(0, before - uses);
    p.wear = { ...(p.wear ?? {}), [id]: after };
    const def = ITEM_BY_ID[id];
    if (after === 0) out.push({ tone: "bad", text: `Your ${def.name.toLowerCase()} is broken. It's useless until it's repaired.` });
    else if (before / maxUses(def) > 0.25 && after / maxUses(def) <= 0.25) out.push({ tone: "info", text: `Your ${def.name.toLowerCase()} is badly worn. Get it repaired soon.` });
  }
  return out;
}

export function equip(p: Player, itemId: string): GameEvent[] {
  const def = ITEM_BY_ID[itemId];
  if (!isGear(def) || !p.inventory[itemId]) throw new GameError("You don't have that.");
  ensureEquipped(p);
  p.equipped = { ...p.equipped, [def.kind]: itemId };
  return [{ tone: "good", text: `You ${def.kind === "weapon" ? "carry" : "wear"} the ${def.name.toLowerCase()} now.` }];
}

export function unequip(p: Player, slot: Slot): GameEvent[] {
  ensureEquipped(p);
  p.equipped = { ...p.equipped, [slot]: null };
  return [{ tone: "info", text: slot === "weapon" ? "Empty-handed." : "No armor." }];
}

/** What a repair costs now (0 for issued gear at the armory, if it's due). */
export function repairCost(p: Player, itemId: string, now: number): number | null {
  const def = ITEM_BY_ID[itemId];
  if (!isGear(def) || !p.inventory[itemId]) return null;
  const missing = 1 - condition(p, itemId);
  if (missing <= 0) return null;
  if (def.issued) return now - (p.armoryAt ?? 0) >= GEAR.armoryCooldownMs ? 0 : null;
  // Black-market gear can't go to a legal repair shop: a fence does it, at a premium.
  const base = def.price || 2000;
  return Math.max(5, Math.ceil(base * GEAR.repairShare * missing * (def.contraband ? 1.5 : 1)));
}

export function repair(p: Player, itemId: string, now: number, price: (base: number) => number): GameEvent[] {
  const def = ITEM_BY_ID[itemId];
  if (!isGear(def) || !p.inventory[itemId]) throw new GameError("You don't have that.");
  if (condition(p, itemId) >= 1) throw new GameError("It's in perfect shape.");
  if (def.issued) {
    if (now - (p.armoryAt ?? 0) < GEAR.armoryCooldownMs) throw new GameError("The armory services your gear once a day.");
    p.armoryAt = now;
    p.wear = { ...(p.wear ?? {}), [itemId]: maxUses(def) };
    return [{ tone: "good", text: `The armory services your ${def.name.toLowerCase()}. Good as new.` }];
  }
  const cost = price(repairCost(p, itemId, now) ?? 0);
  if (p.cash < cost) throw new GameError(`The repair costs $${cost}. Cash only.`);
  p.cash -= cost;
  p.wear = { ...(p.wear ?? {}), [itemId]: maxUses(def) };
  return [{ tone: "good", text: `Your ${def.name.toLowerCase()} is repaired. -$${cost}` }];
}

/** For the player's own view. */
export function gearView(p: Player, now: number, price: (base: number) => number) {
  return Object.keys(p.inventory)
    .filter((id) => p.inventory[id] > 0 && isGear(ITEM_BY_ID[id]))
    .map((id) => {
      const def = ITEM_BY_ID[id];
      const cost = repairCost(p, id, now);
      return {
        id,
        name: def.name,
        icon: def.icon,
        slot: def.kind as Slot,
        equipped: equippedId(p, def.kind as Slot) === id,
        condition: Math.round(condition(p, id) * 100),
        broken: condition(p, id) <= 0,
        issued: !!def.issued,
        repairCost: cost === null ? null : def.issued ? 0 : price(cost),
        canRepair: cost !== null,
      };
    })
    .sort((a, b) => (a.slot === b.slot ? Number(b.equipped) - Number(a.equipped) : a.slot === "weapon" ? -1 : 1));
}
