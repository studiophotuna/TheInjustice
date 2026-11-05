// Crew fronts: a legitimate-looking business the crew buys from its vault. It earns for the vault,
// gives members a quiet place to clean dirty money (no bank, no detectives watching), and makes
// room for more members. One front per crew; a bigger one replaces the old (half its price back).

import { BALANCE } from "./balance";
import { GameError, type Crew, type FrontKind, type GameEvent, type Player } from "./types";

export const FRONTS = {
  kinds: {
    laundromat: { name: "Laundromat", price: 25_000, perHour: 25, launderPerDay: 2_000, fee: 0.08, slots: 2 },
    trattoria: { name: "Trattoria", price: 75_000, perHour: 70, launderPerDay: 6_000, fee: 0.07, slots: 4 },
    construction: { name: "Construction firm", price: 200_000, perHour: 180, launderPerDay: 15_000, fee: 0.06, slots: 6 },
    freight: { name: "Freight company", price: 500_000, perHour: 420, launderPerDay: 40_000, fee: 0.05, slots: 8 },
  } satisfies Record<FrontKind, { name: string; price: number; perHour: number; launderPerDay: number; fee: number; slots: number }>,
  /** Income waits at most this long before it stops piling up. */
  maxHours: 24,
  /** Trading up: the old front sells for this share. */
  tradeIn: 0.5,
};

export const FRONT_KINDS = Object.keys(FRONTS.kinds) as FrontKind[];
export const isFrontKind = (v: unknown): v is FrontKind => typeof v === "string" && v in FRONTS.kinds;

const dayKey = (now: number) => Math.floor(now / 86_400_000);

/** How many members a crew can hold, with its front. */
export function crewCap(c: Crew): number {
  return BALANCE.crew.maxMembers + (c.front ? FRONTS.kinds[c.front.kind].slots : 0);
}

export function frontIncome(c: Crew, now: number): number {
  if (!c.front) return 0;
  const hours = Math.min(FRONTS.maxHours, Math.max(0, now - c.front.collectedAt) / 3_600_000);
  return Math.floor(FRONTS.kinds[c.front.kind].perHour * hours);
}

export function buyFront(c: Crew, leader: Player, kind: FrontKind, now: number): GameEvent[] {
  if (c.leaderId !== leader.id) throw new GameError("Only the leader buys a front.");
  if (!isFrontKind(kind)) throw new GameError("No such front.");
  const def = FRONTS.kinds[kind];
  if (c.front && FRONTS.kinds[c.front.kind].price >= def.price) throw new GameError(`You already run a ${FRONTS.kinds[c.front.kind].name.toLowerCase()}. Trade up, not down.`);
  const tradeIn = c.front ? Math.floor(FRONTS.kinds[c.front.kind].price * FRONTS.tradeIn) + frontIncome(c, now) : 0;
  const cost = def.price - tradeIn;
  if (c.vault < cost) throw new GameError(`That's $${cost.toLocaleString()} from the vault${tradeIn ? ` (after $${tradeIn.toLocaleString()} for the old front)` : ""}.`);
  c.vault -= cost;
  c.front = { kind, since: now, collectedAt: now, laundered: { day: dayKey(now), amount: 0 } };
  c.log = [{ at: now, text: `${leader.name} bought the crew a ${def.name.toLowerCase()}. Room for ${def.slots} more, and a quiet place to clean money.` }, ...c.log].slice(0, 30);
  return [{ tone: "good", text: `The crew owns a ${def.name.toLowerCase()} now. -$${cost.toLocaleString()} from the vault.` }];
}

export function collectFront(c: Crew, leader: Player, now: number): GameEvent[] {
  if (c.leaderId !== leader.id) throw new GameError("Only the leader collects.");
  if (!c.front) throw new GameError("The crew doesn't have a front.");
  const income = frontIncome(c, now);
  if (income < 1) throw new GameError("Nothing in the register yet.");
  c.vault += income;
  c.front.collectedAt = now;
  return [{ tone: "good", text: `The ${FRONTS.kinds[c.front.kind].name.toLowerCase()} paid $${income.toLocaleString()} into the vault.` }];
}

/** Room left today for laundering through the front (shared by the whole crew). */
export function launderLeft(c: Crew, now: number): number {
  if (!c.front) return 0;
  const used = c.front.laundered?.day === dayKey(now) ? c.front.laundered.amount : 0;
  return Math.max(0, FRONTS.kinds[c.front.kind].launderPerDay - used);
}

/** A member cleans dirty money through the front's books. The fee goes to the crew's vault. */
export function launderAtFront(c: Crew, p: Player, amount: number, now: number): GameEvent[] {
  if (!c.front) throw new GameError("The crew doesn't have a front.");
  if (!c.members.some((m) => m.id === p.id)) throw new GameError("You're not in this crew.");
  if ((p.frozenUntil ?? 0) > now) throw new GameError("The Governor froze your dirty money. Not even the front will touch it right now.");
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a <= 0) throw new GameError("How much?");
  if (a > (p.dirty ?? 0)) throw new GameError("You don't have that much dirty money.");
  const left = launderLeft(c, now);
  if (a > left) throw new GameError(left ? `The books can only take $${left.toLocaleString()} more today.` : "The books are full for today.");
  const def = FRONTS.kinds[c.front.kind];
  const fee = Math.ceil(a * def.fee);
  p.dirty = (p.dirty ?? 0) - a;
  p.cash += a - fee;
  c.vault += fee;
  const day = dayKey(now);
  c.front.laundered = { day, amount: (c.front.laundered?.day === day ? c.front.laundered.amount : 0) + a };
  return [{ tone: "good", text: `$${a.toLocaleString()} goes through the ${def.name.toLowerCase()}'s books and comes out clean: $${(a - fee).toLocaleString()} (the crew keeps $${fee}).` }];
}

/** For the crew card. */
export function frontView(c: Crew, viewer: Player, now: number) {
  const leader = c.leaderId === viewer.id;
  const def = c.front ? FRONTS.kinds[c.front.kind] : null;
  return {
    front: def
      ? {
          kind: c.front!.kind,
          name: def.name,
          perHour: def.perHour,
          waiting: frontIncome(c, now),
          launderLeft: launderLeft(c, now),
          launderPerDay: def.launderPerDay,
          fee: def.fee,
          since: c.front!.since,
        }
      : null,
    cap: crewCap(c),
    members: c.members.length,
    vault: c.vault,
    leader,
    options: FRONT_KINDS.filter((k) => !c.front || FRONTS.kinds[k].price > FRONTS.kinds[c.front.kind].price).map((k) => {
      const d = FRONTS.kinds[k];
      const tradeIn = c.front ? Math.floor(FRONTS.kinds[c.front.kind].price * FRONTS.tradeIn) : 0;
      return { kind: k, name: d.name, price: d.price - tradeIn, perHour: d.perHour, launderPerDay: d.launderPerDay, fee: d.fee, slots: d.slots };
    }),
  };
}
