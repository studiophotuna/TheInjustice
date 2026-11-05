// Dirty and clean money. Anything earned from crime is dirty: it can't go in the bank or be
// spent in shops until it's laundered, but it pays for anything illegal (bribes, payoffs,
// bought votes, bounties, back-alley doctors, drugs). Illegal payments use dirty money first.

import { launderFactor } from "./specialties";
import { BALANCE } from "./balance";
import { countryOf, dayKey } from "./engine";
import { PROPERTY_BY_ID } from "./content/properties";
import { GameError, type GameEvent, type Player } from "./types";

const W = BALANCE.laundering;

/** Dirty money on hand. */
export const dirtyOf = (p: Player) => p.dirty ?? 0;

/** Can pay `amount` for something illegal: dirty first, then clean cash (then the bank if allowed). */
export function canPayIllegal(p: Player, amount: number, useBank = false): boolean {
  return dirtyOf(p) + p.cash + (useBank ? p.bank : 0) >= amount;
}

/** Pays for something illegal, dirty money first. Returns how much was dirty. */
export function payIllegal(p: Player, amount: number, useBank = false): number {
  if (!canPayIllegal(p, amount, useBank)) throw new GameError("You don't have that much.");
  const fromDirty = Math.min(dirtyOf(p), amount);
  p.dirty = dirtyOf(p) - fromDirty;
  let rest = amount - fromDirty;
  const fromCash = Math.min(p.cash, rest);
  p.cash -= fromCash;
  rest -= fromCash;
  p.bank -= rest;
  return fromDirty;
}

/** Money from crime lands as dirty money. */
export function earnDirty(p: Player, amount: number) {
  if (amount > 0) p.dirty = dirtyOf(p) + Math.floor(amount);
}

/** Takes up to `amount` from what someone carries (dirty first, then cash). Returns what was taken. */
export function takeCarried(p: Player, amount: number): number {
  const fromDirty = Math.min(dirtyOf(p), amount);
  p.dirty = dirtyOf(p) - fromDirty;
  const fromCash = Math.min(p.cash, amount - fromDirty);
  p.cash -= fromCash;
  return fromDirty + fromCash;
}

export type LaunderMethod = "laundromat" | "business" | "bank";

/** Fee for each way of cleaning money, or why it isn't available. */
export function launderOptions(p: Player, now: number) {
  const here = countryOf(p);
  const businesses = Object.keys(p.properties ?? {}).filter((id) => PROPERTY_BY_ID[id]?.country === here).length;
  const today = p.laundered?.day === dayKey(now) ? p.laundered.amount : 0;
  const cap = businesses * W.businessCapPerDay;
  const f = launderFactor(p);
  return [
    { id: "laundromat" as const, name: "The laundromat in the back", fee: W.laundromatFee * f, block: null as string | null, left: null as number | null },
    {
      id: "business" as const,
      name: "Run it through your business",
      fee: W.businessFee * f,
      block: businesses ? (today >= cap ? "Your books can't take any more today." : null) : "You need a business in this country.",
      left: businesses ? Math.max(0, cap - today) : null,
    },
    {
      id: "bank" as const,
      name: "Your own bank's back office",
      fee: W.bankerFee * f,
      block: p.path === "banking" && p.rank >= BALANCE.casework.bank.minRank ? null : "Only bank officers can do this.",
      left: null,
    },
  ];
}

/** Turns dirty money into clean cash, minus the fee. */
export function launder(p: Player, method: LaunderMethod, amount: number, now: number): GameEvent[] {
  const option = launderOptions(p, now).find((o) => o.id === method);
  if (!option) throw new GameError("Unknown method.");
  if (option.block) throw new GameError(option.block);
  if ((p.frozenUntil ?? 0) > now) throw new GameError("The Governor froze your dirty money. No bank, laundromat or business will touch it for now.");
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a <= 0) throw new GameError("How much?");
  if (a > dirtyOf(p)) throw new GameError("You don't have that much dirty money.");
  if (option.left !== null && a > option.left) throw new GameError(`Your books can only take $${option.left} more today.`);
  const fee = Math.ceil(a * option.fee);
  p.dirty = dirtyOf(p) - a;
  p.cash += a - fee;
  if (a >= BALANCE.launderProbe.threshold) p.launderFlag = { amount: a, method: option.name };
  if (method === "business") {
    const day = dayKey(now);
    p.laundered = { day, amount: (p.laundered?.day === day ? p.laundered.amount : 0) + a };
  }
  return [{ tone: "good", text: `$${a} goes in dirty, $${a - fee} comes out clean (fee $${fee}).` }];
}
