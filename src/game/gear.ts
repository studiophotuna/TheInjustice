// Equipment: one weapon and one armor slot. Only equipped gear counts in a fight, and gear wears
// out with use (fights, rough jobs). Worn gear hits softer; broken gear does nothing until it's
// repaired at the shop. Issued gear (police, military) is serviced free at the armory once a day.

import { ITEM_BY_ID, type ItemDef } from "./content/items";
import { GameError, type GameEvent, type Player } from "./types";

export type Slot = "weapon" | "armor";

export const GEAR = {
  /** Worn gear still gives at least this share of its power until it breaks. */
  wornFloor: 0.6,
  armoryCooldownMs: 24 * 60 * 60_000,
  /** Armor power at which it soaks half of every hit. */
  blockHalf: 28,
  /** Most copies of one weapon or armor a person can own (the one in use plus spares). */
  maxOwned: 3,
};

/** How many of this piece the player owns, the one in use included. */
export const ownedCount = (p: Player, id: string) => p.inventory[id] ?? 0;

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
    if (after === 0 && ownedCount(p, id) > 1) {
      // A spare takes over: the broken one is thrown away.
      p.inventory[id] -= 1;
      p.wear = { ...p.wear, [id]: maxUses(def) };
      out.push({ tone: "info", text: `Your ${def.name.toLowerCase()} breaks. You switch to your spare.` });
    } else if (after === 0) out.push({ tone: "bad", text: `Your ${def.name.toLowerCase()} is broken. It's useless now: time for a new one.` });
    else if (before / maxUses(def) > 0.25 && after / maxUses(def) <= 0.25) out.push({ tone: "info", text: `Your ${def.name.toLowerCase()} is badly worn. It won't last much longer.` });
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

/** Issued gear (police, army) can't be bought: the armory swaps a broken piece once a day. */
export function canReissue(p: Player, itemId: string, now: number): boolean {
  const def = ITEM_BY_ID[itemId];
  return !!def?.issued && !!p.inventory[itemId] && condition(p, itemId) <= 0 && now - (p.armoryAt ?? 0) >= GEAR.armoryCooldownMs;
}

export function reissue(p: Player, itemId: string, now: number): GameEvent[] {
  const def = ITEM_BY_ID[itemId];
  if (!isGear(def) || !p.inventory[itemId]) throw new GameError("You don't have that.");
  if (!def.issued) throw new GameError("Nothing gets repaired. Buy a new one.");
  if (condition(p, itemId) > 0) throw new GameError("It still works.");
  if (now - (p.armoryAt ?? 0) < GEAR.armoryCooldownMs) throw new GameError("The armory hands out one replacement a day.");
  p.armoryAt = now;
  p.wear = { ...(p.wear ?? {}), [itemId]: maxUses(def) };
  return [{ tone: "good", text: `The armory takes your broken ${def.name.toLowerCase()} and hands you a new one.` }];
}

/** For the player's own view. */
export function gearView(p: Player, now: number) {
  return Object.keys(p.inventory)
    .filter((id) => p.inventory[id] > 0 && isGear(ITEM_BY_ID[id]))
    .map((id) => {
      const def = ITEM_BY_ID[id];
      return {
        id,
        name: def.name,
        icon: def.icon,
        slot: def.kind as Slot,
        equipped: equippedId(p, def.kind as Slot) === id,
        condition: Math.round(condition(p, id) * 100),
        broken: condition(p, id) <= 0,
        issued: !!def.issued,
        canReissue: canReissue(p, id, now),
        /** Spare copies, besides the one in use. */
        spares: Math.max(0, ownedCount(p, id) - 1),
      };
    })
    .sort((a, b) => (a.slot === b.slot ? Number(b.equipped) - Number(a.equipped) : a.slot === "weapon" ? -1 : 1));
}
