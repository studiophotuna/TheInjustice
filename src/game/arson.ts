// Torching a business: a crew sends someone with a gas can. If it works, the business is a
// burned-out shell for a while (no income, and the takings in the register are gone). Success
// depends on the arsonist's nerve, agility and wits against the business's security (bigger
// places are better protected). If it fails, they may be caught with the can in their hand.

import { PROPERTY_BY_ID } from "./content/properties";
import { COUNTRY_BY_ID } from "./content/world";
import { countryOf, inJail } from "./engine";
import { crewJob } from "./family";
import { notify } from "./social";
import { sv } from "./stats";
import { fireWatchOn, logFire } from "./firehack";
import { GameError, type City, type GameEvent, type Player, type Rng } from "./types";
import { INSPECT, inspected } from "./protect";

export const TORCH = {
  energy: 20,
  cooldownMs: 12 * 60 * 60_000,
  closedMs: 12 * 60 * 60_000,
  caughtChance: 0.4,
  jailMs: 25 * 60_000,
  heat: 18,
  failHeat: 10,
  rep: 3,
};

export const closedUntil = (owner: Player, propertyId: string) => owner.closed?.[propertyId] ?? 0;
export const isClosed = (owner: Player, propertyId: string, now: number) => closedUntil(owner, propertyId) > now;

/** How hard a business is to burn: bigger places have alarms, guards and sprinklers. */
export function torchDifficulty(propertyId: string): number {
  const price = PROPERTY_BY_ID[propertyId]?.price ?? 2000;
  return 28 + 6 * Math.log2(Math.max(1, price / 2000));
}

export function torchChance(a: Player, propertyId: string): number {
  const avg = (sv(a, "nerve") + sv(a, "agility") + sv(a, "wits")) / 3;
  return Math.max(0.15, Math.min(0.9, 0.5 + (avg - torchDifficulty(propertyId)) / 30));
}

export function torchBlock(a: Player, owner: Player, propertyId: string, now: number): string | null {
  const prop = PROPERTY_BY_ID[propertyId];
  if (a.path !== "enforcer" || !a.crewId) return "Only a crew sends someone to torch a business.";
  if (!prop || !owner.properties?.[propertyId]) return "They don't own that.";
  if (owner.id === a.id) return "That's your own business.";
  if (owner.crewId && owner.crewId === a.crewId) return "That's a crewmate's business.";
  if (prop.country !== countryOf(a)) return "That business is in another country.";
  if (isClosed(owner, propertyId, now)) return "It's already a burned-out shell.";
  if (inJail(a, now)) return "You're in a cell.";
  if (now - (a.attackLog?.[`torch:${a.id}`] ?? 0) < TORCH.cooldownMs) return "Lie low. One fire a day is already a lot.";
  if (a.energy < TORCH.energy) return "You're too tired.";
  return null;
}

export function torchBusiness(a: Player, owner: Player, propertyId: string, city: City | null, now: number, rng: Rng): GameEvent[] {
  const block = torchBlock(a, owner, propertyId, now);
  if (block) throw new GameError(block);
  if (fireWatchOn(city, now)) throw new GameError("The Fire Chief ordered a fire watch. Crews are on every block tonight.");
  const prop = PROPERTY_BY_ID[propertyId];
  const heatMult = COUNTRY_BY_ID[prop.country].heatMult;
  a.energy -= TORCH.energy;
  a.attackLog = { ...(a.attackLog ?? {}), [`torch:${a.id}`]: now };
  crewJob(a, "war");

  // A business that passed a fire inspection this week is much harder to burn.
  const chance = torchChance(a, propertyId) * (inspected(owner, propertyId, now) ? INSPECT.chanceMult : 1);
  if (rng() < chance) {
    const until = now + TORCH.closedMs;
    owner.closed = { ...(owner.closed ?? {}), [propertyId]: until };
    // The takings in the register burn with it; income starts again when it reopens.
    owner.properties = { ...owner.properties!, [propertyId]: until };
    a.heat += TORCH.heat * heatMult;
    a.reputation += TORCH.rep;
    notify(owner, `${prop.name} burned down overnight. The fire chief says arson. It'll take ${Math.round(TORCH.closedMs / 3_600_000)} hours to reopen.`, "bad", undefined, now);
    if (city) city.log = [{ at: now, text: `Fire at ${owner.name}'s ${prop.name.toLowerCase()}. Investigators suspect arson.` }, ...city.log].slice(0, 20);
    logFire(city, { at: now, what: prop.name.toLowerCase(), victimName: owner.name, arsonistId: a.id, arsonistName: a.name }, now);
    return [{ tone: "good", text: `${prop.name} goes up in flames. Nobody saw you. +${TORCH.rep} reputation on the street.` }];
  }

  if (rng() < TORCH.caughtChance) {
    a.jailUntil = Math.max(a.jailUntil ?? 0, now + Math.round(TORCH.jailMs * heatMult));
    a.jailReason = `Caught with a gas can outside ${prop.name}.`;
    a.heat += TORCH.heat * heatMult;
    notify(owner, `Police caught ${a.name} with a gas can outside your ${prop.name.toLowerCase()}.`, "good", undefined, now);
    if (city) city.log = [{ at: now, text: `${a.name} arrested trying to burn down ${prop.name}.` }, ...city.log].slice(0, 20);
    return [{ tone: "bad", text: "A night guard spots you. The police are there before the match is lit. You're in a cell." }];
  }

  a.heat += TORCH.failHeat * heatMult;
  notify(owner, `Someone tried to set fire to your ${prop.name.toLowerCase()}. The sprinklers saved it${inspected(owner, propertyId, now) ? ". Good thing it passed its inspection" : ""}.`, "info", undefined, now);
  return [{ tone: "bad", text: "The fire doesn't catch. Sprinklers. You run before anyone sees your face." }];
}

/** Businesses this player could torch from the viewer's side (for the People list). */
export function torchTargets(a: Player, owner: Player, now: number) {
  if (a.path !== "enforcer" || !a.crewId) return [];
  return Object.keys(owner.properties ?? {})
    .filter((id) => PROPERTY_BY_ID[id] && PROPERTY_BY_ID[id].country === countryOf(a) && !isClosed(owner, id, now))
    .map((id) => ({ id, name: PROPERTY_BY_ID[id].name, block: torchBlock(a, owner, id, now) }));
}

