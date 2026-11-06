// Player mechanics: a garage other players hire. The mechanic sets a rate against the dealer's
// price (cheaper to win customers, dearer when they're the only one in town) and keeps the fee.
// Each job done for a customer counts toward the mechanic's next promotion.

import { ALT_BLOCK, sameOwner } from "./anticheat";
import { BREAKIN, fitAlarm, hasAlarm } from "./breakin";
import { PROPERTY_BY_ID } from "./content/properties";
import { COUNTRY_BY_ID } from "./content/world";
import { addMerit, countryOf, inHospital, inJail } from "./engine";
import { notify } from "./social";
import { CAR, CARS, fitCompartment, repairCar, repairCost } from "./vehicles";
import { GameError, type CountryId, type GameEvent, type Player } from "./types";

export type MechService = "repair" | "floor" | "alarm" | "rebuild";

export const MECH = {
  minRate: 0.5,
  maxRate: 1.5,
  services: {
    repair: { rank: 1, name: "Car repair" },
    floor: { rank: 3, name: "False floor" },
    alarm: { rank: 3, name: "Home alarm" },
    rebuild: { rank: 4, name: "Rebuild after a fire" },
  } satisfies Record<MechService, { rank: number; name: string }>,
  /** Rebuilding a burned business costs this share of what it's worth (before the rate). */
  rebuildShare: 0.2,
  merit: 1.5,
  /** Mechanics fix their own cars at the dealer for this share (parts only). */
  selfRepair: 0.5,
};

export const MECH_SERVICES = Object.keys(MECH.services) as MechService[];
export const isMechService = (v: unknown): v is MechService => typeof v === "string" && v in MECH.services;

export const isMechanic = (p: Player) => p.path === "mechanic" && p.rank >= 1;

/** Services this mechanic's rank allows. */
export const servicesFor = (m: Player) => MECH_SERVICES.filter((s) => isMechanic(m) && m.rank >= MECH.services[s].rank);

/** A mechanic opens (or closes) their garage to customers, at a rate against the dealer's price. */
export function setGarage(m: Player, open: boolean, rate: number): GameEvent[] {
  if (!isMechanic(m)) throw new GameError("Only mechanics can open a garage.");
  if (!Number.isFinite(rate)) throw new GameError("Pick a rate.");
  const r = Math.round(Math.min(MECH.maxRate, Math.max(MECH.minRate, rate)) * 100) / 100;
  m.garageService = { open, rate: r, earned: m.garageService?.earned ?? 0, jobs: m.garageService?.jobs ?? 0 };
  const pct = Math.round((r - 1) * 100);
  return [
    {
      tone: "good",
      text: open
        ? `Your garage is open. You charge ${pct === 0 ? "the dealer's price" : `${Math.abs(pct)}% ${pct < 0 ? "under" : "over"} the dealer`}. Customers find you in the Directory and at the Docks.`
        : "Garage closed. The sign on the door says back soon.",
    },
  ];
}

export function mechBlock(m: Player | null, customer: Player, now: number): string | null {
  if (!m || m.dead) return "They're not around anymore.";
  if (m.id === customer.id) return "Use the dealer for your own car.";
  if (sameOwner(m, customer)) return ALT_BLOCK;
  if (!isMechanic(m) || !m.garageService?.open) return "Their garage is closed.";
  if (countryOf(m) !== countryOf(customer)) return "Their garage is in another city.";
  if (m.travel) return "They're out of town.";
  if (inJail(m, now)) return "They're behind bars.";
  if (inHospital(m, now)) return "They're in the hospital.";
  return null;
}

/** What the dealer would charge for the job (the mechanic's rate applies on top). */
export function dealerPrice(service: MechService, customer: Player, target: string | undefined, country: CountryId): number {
  switch (service) {
    case "repair": {
      const car = (customer.garage ?? []).find((c) => c.id === target && c.country === country);
      if (!car) throw new GameError("That car isn't parked here.");
      if (car.condition >= 100) throw new GameError("It runs fine.");
      return repairCost(car);
    }
    case "floor":
      return Math.round(CAR.compartment.cost * COUNTRY_BY_ID[country].priceMult);
    case "alarm":
      return Math.round(BREAKIN.alarm.cost * COUNTRY_BY_ID[country].priceMult);
    case "rebuild": {
      const prop = target ? PROPERTY_BY_ID[target] : undefined;
      if (!prop || !customer.properties?.[prop.id]) throw new GameError("You don't own that business.");
      if (prop.country !== country) throw new GameError("That business is in another city.");
      if ((customer.closed?.[prop.id] ?? 0) <= Date.now()) throw new GameError("It's open for business. Nothing to rebuild.");
      return Math.round(prop.price * MECH.rebuildShare);
    }
  }
}

export const quote = (m: Player, dealer: number) => Math.max(1, Math.round(dealer * (m.garageService?.rate ?? 1)));

/** A customer hires a mechanic. The customer pays clean money; the mechanic keeps the fee. */
export function hireMechanic(m: Player, customer: Player, service: MechService, target: string | undefined, now: number): GameEvent[] {
  const block = mechBlock(m, customer, now);
  if (block) throw new GameError(block);
  if (!isMechService(service)) throw new GameError("Bad request.");
  if (m.rank < MECH.services[service].rank) throw new GameError(`${m.name} doesn't do that yet.`);
  const country = countryOf(customer);
  const price = quote(m, dealerPrice(service, customer, target, country));
  let what: string;
  switch (service) {
    case "repair": {
      repairCar(customer, target!, country, price);
      what = `fixed your ${CARS[(customer.garage ?? []).find((c) => c.id === target)!.model].name.toLowerCase()}`;
      break;
    }
    case "floor": {
      if (!target) throw new GameError("Which car?");
      fitCompartment(customer, target, country, price);
      what = "built a false floor in your car";
      break;
    }
    case "alarm":
      if (hasAlarm(customer, country)) throw new GameError("Your place is already wired.");
      fitAlarm(customer, price);
      what = "wired an alarm at your place";
      break;
    case "rebuild": {
      const prop = PROPERTY_BY_ID[target!];
      if (customer.cash + (customer.hasBankAccount ? customer.bank : 0) < price) throw new GameError(`The rebuild costs $${price.toLocaleString()}.`);
      const fromCash = Math.min(customer.cash, price);
      customer.cash -= fromCash;
      customer.bank -= price - fromCash;
      const closed = { ...(customer.closed ?? {}) };
      delete closed[prop.id];
      customer.closed = closed;
      what = `rebuilt your ${prop.name.toLowerCase()}. It's open again`;
      break;
    }
  }
  m.cash += price;
  m.garageService = { ...m.garageService!, earned: (m.garageService?.earned ?? 0) + price, jobs: (m.garageService?.jobs ?? 0) + 1 };
  m.jobCounts["mech:service"] = (m.jobCounts["mech:service"] ?? 0) + 1;
  addMerit(m, "mechanic", MECH.merit);
  notify(m, `${customer.name} hired you: ${MECH.services[service].name.toLowerCase()}. +$${price.toLocaleString()}.`, "good", customer, now);
  return [{ tone: "good", text: `${m.name} ${what}. -$${price.toLocaleString()}` }];
}

/** A mechanic as customers see them. */
export function mechanicCard(m: Player, customer: Player, now: number) {
  return {
    id: m.id,
    name: m.name,
    title: m.rank ? (["Grease Monkey", "Apprentice", "Mechanic", "Senior Mechanic", "Master Mechanic", "Shop Foreman", "Garage Owner"][m.rank - 1] ?? "Mechanic") : "Mechanic",
    rate: m.garageService?.rate ?? 1,
    services: servicesFor(m),
    jobs: m.garageService?.jobs ?? 0,
    block: mechBlock(m, customer, now),
  };
}
