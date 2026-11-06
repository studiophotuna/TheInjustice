// Crew fronts: a legitimate-looking business the crew buys from its vault. It earns for the vault,
// gives members a quiet place to clean dirty money (no bank, no detectives watching), and makes
// room for more members. One front per crew; a bigger one replaces the old (half its price back).

import { BALANCE } from "./balance";
import { COUNTRY_BY_ID } from "./content/world";
import { countryOf, inJail } from "./engine";
import { crewJob } from "./family";
import { sv } from "./stats";
import { fireWatchOn, logFire } from "./firehack";
import { GameError, type City, type Crew, type FrontKind, type GameEvent, type Player, type Rng } from "./types";

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
  torch: { energy: 20, closedMs: 12 * 60 * 60_000, cooldownMs: 12 * 60 * 60_000, caught: 0.4, jailMs: 30 * 60_000, heat: 20, failHeat: 10, rep: 4 },
  /** Rebuilding after a fire costs this share of the front's price, from the vault. */
  rebuildShare: 0.2,
};

export const frontClosed = (c: Crew, now: number) => (c.front?.closedUntil ?? 0) > now;

export const FRONT_KINDS = Object.keys(FRONTS.kinds) as FrontKind[];
export const isFrontKind = (v: unknown): v is FrontKind => typeof v === "string" && v in FRONTS.kinds;

const dayKey = (now: number) => Math.floor(now / 86_400_000);

/** How many members a crew can hold, with its front. */
export function crewCap(c: Crew): number {
  return BALANCE.crew.maxMembers + (c.front ? FRONTS.kinds[c.front.kind].slots : 0);
}

export function frontIncome(c: Crew, now: number): number {
  if (!c.front || frontClosed(c, now)) return 0;
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
  c.front = { kind, since: now, collectedAt: now, laundered: { day: dayKey(now), amount: 0 }, country: countryOf(leader) };
  c.log = [{ at: now, text: `${leader.name} bought the crew a ${def.name.toLowerCase()}. Room for ${def.slots} more, and a quiet place to clean money.` }, ...c.log].slice(0, 30);
  return [{ tone: "good", text: `The crew owns a ${def.name.toLowerCase()} now. -$${cost.toLocaleString()} from the vault.` }];
}

export function collectFront(c: Crew, leader: Player, now: number): GameEvent[] {
  if (c.leaderId !== leader.id) throw new GameError("Only the leader collects.");
  if (!c.front) throw new GameError("The crew doesn't have a front.");
  c.front.country ??= countryOf(leader);
  const income = frontIncome(c, now);
  if (income < 1) throw new GameError("Nothing in the register yet.");
  c.vault += income;
  c.front.collectedAt = now;
  return [{ tone: "good", text: `The ${FRONTS.kinds[c.front.kind].name.toLowerCase()} paid $${income.toLocaleString()} into the vault.` }];
}

/** Room left today for laundering through the front (shared by the whole crew). */
export function launderLeft(c: Crew, now: number): number {
  if (!c.front || frontClosed(c, now)) return 0;
  const used = c.front.laundered?.day === dayKey(now) ? c.front.laundered.amount : 0;
  return Math.max(0, FRONTS.kinds[c.front.kind].launderPerDay - used);
}

/** A member cleans dirty money through the front's books. The fee goes to the crew's vault. */
export function launderAtFront(c: Crew, p: Player, amount: number, now: number): GameEvent[] {
  if (!c.front) throw new GameError("The crew doesn't have a front.");
  if (!c.members.some((m) => m.id === p.id)) throw new GameError("You're not in this crew.");
  if (frontClosed(c, now)) throw new GameError("The front is a burned-out shell. Nothing goes through its books until it's rebuilt.");
  if ((p.frozenUntil ?? 0) > now) throw new GameError("The Governor froze your dirty money. Not even the front will touch it right now.");
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a <= 0) throw new GameError("How much?");
  if (a > (p.dirty ?? 0)) throw new GameError("You don't have that much dirty money.");
  c.front.country ??= countryOf(p);
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
          city: c.front!.country ? COUNTRY_BY_ID[c.front!.country].capital : null,
          closedUntil: frontClosed(c, now) ? c.front!.closedUntil! : null,
          rebuildCost: Math.round(FRONTS.kinds[c.front!.kind].price * FRONTS.rebuildShare),
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

// ── Torching a rival's front ───────────────────────────────────────────────

/** Bigger fronts have guards, alarms and sprinklers. */
export function frontTorchChance(a: Player, c: Crew): number {
  const price = c.front ? FRONTS.kinds[c.front.kind].price : 25_000;
  const difficulty = 30 + 5 * Math.log2(price / 25_000);
  const avg = (sv(a, "nerve") + sv(a, "agility") + sv(a, "wits")) / 3;
  return Math.max(0.12, Math.min(0.85, 0.5 + (avg - difficulty) / 30));
}

export function frontTorchBlock(a: Player, target: Crew, now: number): string | null {
  const T = FRONTS.torch;
  if (a.path !== "enforcer" || !a.crewId) return "Only a crew sends someone to torch a front.";
  if (a.crewId === target.id) return "That's your own crew's front.";
  if (!target.front) return "They don't have a front.";
  if (target.front.country !== countryOf(a)) return "Their front is in another city.";
  if (frontClosed(target, now)) return "It's already a burned-out shell.";
  if (inJail(a, now)) return "You're in a cell.";
  if (a.travel) return "You're on the road.";
  if (now - (a.attackLog?.[`torchfront:${a.id}`] ?? 0) < T.cooldownMs) return "Lie low. One big fire a day is already a lot.";
  if (a.energy < T.energy) return "You're too tired.";
  return null;
}

/** A crew member with a gas can and a rival's front. Success closes it: no income, no laundering. */
export function torchFront(a: Player, target: Crew, city: City | null, now: number, rng: Rng): GameEvent[] {
  const block = frontTorchBlock(a, target, now);
  if (block) throw new GameError(block);
  if (fireWatchOn(city, now)) throw new GameError("The Fire Chief ordered a fire watch. Crews are on every block tonight.");
  const T = FRONTS.torch;
  const def = FRONTS.kinds[target.front!.kind];
  const heatMult = COUNTRY_BY_ID[countryOf(a)].heatMult;
  a.energy -= T.energy;
  a.attackLog = { ...(a.attackLog ?? {}), [`torchfront:${a.id}`]: now };
  crewJob(a, "war");
  const name = `[${target.tag}]'s ${def.name.toLowerCase()}`;
  if (rng() < frontTorchChance(a, target)) {
    target.front!.closedUntil = now + T.closedMs;
    target.front!.collectedAt = now + T.closedMs;
    a.heat += T.heat * heatMult;
    a.reputation += T.rep;
    target.log = [{ at: now, text: `Our ${def.name.toLowerCase()} burned down overnight. Arson. No income and no laundering until it's rebuilt.` }, ...target.log].slice(0, 30);
    if (city) city.log = [{ at: now, text: `A ${def.name.toLowerCase()} burned down overnight. Investigators suspect arson.` }, ...city.log].slice(0, 20);
    logFire(city, { at: now, what: `[${target.tag}]'s ${def.name.toLowerCase()}`, victimName: target.name, arsonistId: a.id, arsonistName: a.name }, now);
    return [{ tone: "good", text: `${name} goes up in flames. Their books are ash. +${T.rep} reputation.` }];
  }
  if (rng() < T.caught) {
    a.jailUntil = Math.max(a.jailUntil ?? 0, now + Math.round(T.jailMs * heatMult));
    a.jailReason = `Caught with a gas can outside a ${def.name.toLowerCase()}.`;
    a.heat += T.heat * heatMult;
    target.log = [{ at: now, text: `${a.name} was caught trying to burn our ${def.name.toLowerCase()}.` }, ...target.log].slice(0, 30);
    return [{ tone: "bad", text: "Their night guard was waiting. The police are there before the match is lit. You're in a cell." }];
  }
  a.heat += T.failHeat * heatMult;
  target.log = [{ at: now, text: `Someone tried to set fire to our ${def.name.toLowerCase()}. The sprinklers saved it.` }, ...target.log].slice(0, 30);
  return [{ tone: "bad", text: "The fire won't catch. Sprinklers. You run before anyone sees your face." }];
}

/** The leader pays the vault to rebuild after a fire. */
export function rebuildFront(c: Crew, leader: Player, now: number): GameEvent[] {
  if (c.leaderId !== leader.id) throw new GameError("Only the leader can pay for the rebuild.");
  if (!c.front || !frontClosed(c, now)) throw new GameError("The front is open for business.");
  const cost = Math.round(FRONTS.kinds[c.front.kind].price * FRONTS.rebuildShare);
  if (c.vault < cost) throw new GameError(`The rebuild costs $${cost.toLocaleString()} from the vault.`);
  c.vault -= cost;
  c.front.closedUntil = 0;
  c.front.collectedAt = now;
  c.log = [{ at: now, text: `${leader.name} paid $${cost.toLocaleString()} to rebuild the ${FRONTS.kinds[c.front.kind].name.toLowerCase()}. Open again.` }, ...c.log].slice(0, 30);
  return [{ tone: "good", text: `Contractors work through the night. The ${FRONTS.kinds[c.front.kind].name.toLowerCase()} is open again. -$${cost.toLocaleString()} from the vault.` }];
}

/** Rival crews' fronts in this city, for a crew member with a gas can. */
export function rivalFronts(crews: Crew[], a: Player, now: number) {
  if (a.path !== "enforcer" || !a.crewId) return [];
  return crews
    .filter((c) => c.id !== a.crewId && c.front && c.front.country === countryOf(a))
    .map((c) => ({ crewId: c.id, tag: c.tag, crew: c.name, front: FRONTS.kinds[c.front!.kind].name, closed: frontClosed(c, now), block: frontTorchBlock(a, c, now) }));
}
