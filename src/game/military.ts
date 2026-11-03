// The military's job in the city: soldiers stand guard at the banks. Every soldier on guard
// makes a bank job in that city harder (up to three), and the city pays them for the shift.

import { countryOf, inJail } from "./engine";
import { GameError, type City, type GameEvent, type Player } from "./types";

export const GUARD = { minRank: 2, energy: 15, shiftMs: 60 * 60_000, pay: 40, maxGuards: 3 };

export const activeGuards = (c: City, now: number) => (c.guards ?? []).filter((g) => g.until > now);

export function guardBlock(c: City, p: Player, now: number): string | null {
  if (p.path !== "military" || p.rank < GUARD.minRank) return "Only soldiers who passed basic training stand guard.";
  if (countryOf(p) !== c.country) return "You have to be in the city.";
  if (inJail(p, now)) return "You're in a cell.";
  if (activeGuards(c, now).some((g) => g.id === p.id)) return "You're already on guard.";
  if (p.energy < GUARD.energy) return "You're too tired for a shift.";
  return null;
}

export function standGuard(c: City, p: Player, now: number): GameEvent[] {
  const block = guardBlock(c, p, now);
  if (block) throw new GameError(block);
  p.energy -= GUARD.energy;
  c.guards = [...activeGuards(c, now), { id: p.id, name: p.name, until: now + GUARD.shiftMs }].slice(-10);
  const pay = Math.min(GUARD.pay, c.treasury);
  c.treasury -= pay;
  p.cash += pay;
  p.reputation += 1;
  const n = Math.min(GUARD.maxGuards, activeGuards(c, now).length);
  return [{ tone: "good", text: `You take your post outside the bank for an hour.${pay ? ` The city pays $${pay}.` : ""} ${n} soldier${n === 1 ? "" : "s"} on guard now.` }];
}
