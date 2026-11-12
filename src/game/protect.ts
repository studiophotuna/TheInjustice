// Two careers that protect what other players own.
//
// Vigilantes watch homes: for one night, break-ins at the client's place are harder (the same
// watch a regular vigilante sells). Firefighters inspect businesses: for a week, an inspected
// business is much harder to torch. Both are professionals setting their own fee, listed in the
// Directory, and each job counts toward their next promotion. Fees follow real life: a night of
// private security costs $200 to $350, a commercial fire inspection $100 to $500 and up.

import { PROPERTY_BY_ID } from "./content/properties";
import { ALT_BLOCK, sameOwner } from "./anticheat";
import { addMerit, countryOf, inJail } from "./engine";
import { notify } from "./social";
import { GameError, type GameEvent, type Player } from "./types";

export const WATCH = { minRank: 2, minFee: 100, maxFee: 1_000, defaultFee: 250, ms: 10 * 60 * 60_000, merit: 1.5 };
export const INSPECT = { minRank: 2, minFee: 100, maxFee: 2_000, defaultFee: 300, ms: 7 * 24 * 60 * 60_000, merit: 1.5, chanceMult: 0.5 };

const HOURS = (ms: number) => Math.round(ms / 3_600_000);

export const canWatch = (p: Player) => p.path === "vigilante" && p.rank >= WATCH.minRank;
export const canInspect = (p: Player) => p.path === "fire" && p.rank >= INSPECT.minRank;

/** Your home is being watched tonight. */
export const homeWatched = (p: Player, now: number) => (p.homeWatchUntil ?? 0) > now;
/** This business passed a fire inspection that still holds. */
export const inspected = (owner: Player, propertyId: string, now: number) => (owner.inspected?.[propertyId] ?? 0) > now;

/** Businesses of `owner` in the city they're in that could use an inspection. */
export function needsInspection(owner: Player, now: number): string[] {
  return Object.keys(owner.properties ?? {}).filter((id) => PROPERTY_BY_ID[id]?.country === countryOf(owner) && !inspected(owner, id, now));
}

function setFee(p: Player, kind: "watch" | "inspect", open: boolean, fee: number): GameEvent[] {
  const R = kind === "watch" ? WATCH : INSPECT;
  const f = Math.floor(fee);
  if (open && (!Number.isFinite(f) || f < R.minFee || f > R.maxFee)) throw new GameError(`Set a fee between $${R.minFee} and $${R.maxFee.toLocaleString()}.`);
  const key = kind === "watch" ? "watchService" : "inspectService";
  const cur = p[key];
  p[key] = { open, fee: open ? f : (cur?.fee ?? R.defaultFee), jobs: cur?.jobs ?? 0 };
  if (!open) return [{ tone: "info", text: "You stop taking clients." }];
  return [{ tone: "good", text: kind === "watch" ? `You'll watch people's homes overnight for $${f}. You're in the Directory.` : `You'll inspect businesses for $${f} each. You're in the Directory.` }];
}

export function setWatch(p: Player, open: boolean, fee: number): GameEvent[] {
  if (!canWatch(p)) throw new GameError("Vigilantes from rank 2 can watch people's homes.");
  return setFee(p, "watch", open, fee);
}

export function setInspect(p: Player, open: boolean, fee: number): GameEvent[] {
  if (!canInspect(p)) throw new GameError("Firefighters from rank 2 can inspect businesses.");
  return setFee(p, "inspect", open, fee);
}

function common(pro: Player | null, client: Player, now: number, open: boolean): string | null {
  if (!pro || pro.dead) return "They're not around anymore.";
  if (pro.id === client.id) return "You can't hire yourself.";
  if (sameOwner(pro, client)) return ALT_BLOCK;
  if (!open) return "They're not taking clients.";
  if (countryOf(pro) !== countryOf(client)) return "They work in another city.";
  if (inJail(pro, now)) return "They're behind bars.";
  return null;
}

export function watchBlock(v: Player | null, client: Player, now: number): string | null {
  const c = common(v, client, now, !!v && canWatch(v) && !!v.watchService?.open);
  if (c) return c;
  if (client.housing < 1) return "You need a place in this city first.";
  if (homeWatched(client, now)) return "Someone is already watching your place.";
  if (client.cash < v!.watchService!.fee) return `It's $${v!.watchService!.fee}, cash.`;
  return null;
}

export function inspectBlock(f: Player | null, owner: Player, propertyId: string, now: number): string | null {
  const c = common(f, owner, now, !!f && canInspect(f) && !!f.inspectService?.open);
  if (c) return c;
  const prop = PROPERTY_BY_ID[propertyId];
  if (!prop || !owner.properties?.[propertyId]) return "You don't own that.";
  if (prop.country !== countryOf(owner)) return "That business is in another city.";
  if (inspected(owner, propertyId, now)) return "It passed an inspection this week.";
  if (owner.cash < f!.inspectService!.fee) return `It's $${f!.inspectService!.fee}, cash.`;
  return null;
}

/** A homeowner pays a vigilante to watch their place tonight. */
export function hireWatch(v: Player, client: Player, now: number): GameEvent[] {
  const block = watchBlock(v, client, now);
  if (block) throw new GameError(block);
  const fee = v.watchService!.fee;
  client.cash -= fee;
  v.cash += fee;
  client.homeWatchUntil = now + WATCH.ms;
  v.watchService = { ...v.watchService!, jobs: v.watchService!.jobs + 1 };
  const events = addMerit(v, "vigilante", WATCH.merit);
  notify(v, `${client.name} paid you $${fee} to watch their place tonight.`, "good", client, now);
  return [{ tone: "good", text: `${v.name} will keep an eye on your place for the next ${HOURS(WATCH.ms)} hours. Break-ins are harder. -$${fee}` }, ...(client.id === v.id ? events : [])];
}

/** A business owner pays a firefighter to inspect one of their businesses. */
export function hireInspection(f: Player, owner: Player, propertyId: string, now: number): GameEvent[] {
  const block = inspectBlock(f, owner, propertyId, now);
  if (block) throw new GameError(block);
  const fee = f.inspectService!.fee;
  owner.cash -= fee;
  f.cash += fee;
  owner.inspected = { ...(owner.inspected ?? {}), [propertyId]: now + INSPECT.ms };
  f.inspectService = { ...f.inspectService!, jobs: f.inspectService!.jobs + 1 };
  addMerit(f, "fire", INSPECT.merit);
  const name = PROPERTY_BY_ID[propertyId].name;
  notify(f, `${owner.name} paid you $${fee} to inspect their ${name.toLowerCase()}.`, "good", owner, now);
  return [{ tone: "good", text: `${f.name} checks the wiring, the exits and the sprinklers at your ${name.toLowerCase()}. For a week it's much harder to set on fire. -$${fee}` }];
}
