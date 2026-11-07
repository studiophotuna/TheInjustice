// Vehicles and cross-city smuggling. A car is parked in one city; drive it to another and it
// comes with you, along with whatever is in the trunk. Contraband is cheap where it's made and
// dear where it's banned, and prices move every hour. Highway checkpoints stand in between.

import { COUNTRY_BY_ID, COUNTRIES, distance } from "./content/world";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { specTier } from "./specialties";
import { DRUG_IDS, streetPrice } from "./drugs";
import { countryOf } from "./engine";
import { GameError, type Car, type CarModel, type CountryId, type GameEvent, type GoodId, type Player, type Rng, type TripIncident } from "./types";

export interface CarDef {
  id: CarModel;
  name: string;
  blurb: string;
  price: number;
  /** Faster than a bus by this factor. */
  speed: number;
  /** Units of cargo the trunk holds. */
  trunk: number;
  /** How innocent it looks to a checkpoint (0–1). */
  hidden: number;
  /** Chance to floor it past a checkpoint instead of stopping. */
  outrun?: number;
  /** Road gangs don't bother with it. */
  armored?: boolean;
  color: string;
}

export const CARS: Record<CarModel, CarDef> = {
  hatch: { id: "hatch", name: "Rust-bucket hatchback", blurb: "Starts on the third try. Nobody looks twice at it.", price: 3_000, speed: 1, trunk: 10, hidden: 0.1, color: "#9a7b5a" },
  sedan: { id: "sedan", name: "Family sedan", blurb: "Child seat in the back, rosary on the mirror. Cops wave it through.", price: 12_000, speed: 1.25, trunk: 15, hidden: 0.35, color: "#6b8fb8" },
  van: { id: "van", name: "Panel van", blurb: "A plumber's van, as far as anyone knows. Room for a lot of pipes.", price: 18_000, speed: 0.9, trunk: 40, hidden: 0.15, color: "#e8eef2" },
  coupe: { id: "coupe", name: "Sports coupe", blurb: "Tiny trunk, enormous engine. Checkpoints are a suggestion.", price: 55_000, speed: 1.8, trunk: 6, hidden: 0.1, outrun: 0.45, color: "#ff4d5e" },
  suv: { id: "suv", name: "Armored SUV", blurb: "Plated doors, run-flat tyres. Road gangs pick another target.", price: 110_000, speed: 1.1, trunk: 20, hidden: 0.25, armored: true, color: "#2b2f36" },
};
export const CAR_MODELS = Object.keys(CARS) as CarModel[];

export const CAR = {
  maxCars: 3,
  /** Fuel, dollars per distance unit. */
  fuelPerUnit: 3,
  /** Minutes per distance unit at speed 1 (the bus is 4). */
  minutesPerUnit: 3,
  wear: [6, 12] as const,
  minCondition: 20,
  /** A full repair from zero costs this share of what the car cost. */
  repairShare: 0.25,
  compartment: { cost: 5_000, hidden: 0.35, trunkLoss: 0.2 },
  /** A used-car lot pays this share of the price, scaled by condition. */
  resale: 0.5,
  checkpoint: { base: 0.2, perHeat: 0.004, max: 0.6, find: 0.65, delayMs: 3 * 60_000, heat: 12, fineShare: 0.25, outrunHeat: 10 },
  gangChance: 0.12,
  /** Fences pay this share of the street price. */
  sellShare: 0.85,
} as const;

export interface GoodDef {
  id: GoodId;
  name: string;
  unit: string;
  base: number;
  /** Heat per unit sold. */
  heat: number;
  /** Price in each country, relative to base. */
  mult: Record<CountryId, number>;
}

export const GOODS: Record<GoodId, GoodDef> = {
  smokes: { id: "smokes", name: "Untaxed cigarettes", unit: "carton", base: 20, heat: 0.1, mult: { kestrova: 0.65, varrow: 1, solmarra: 1.1, meridian: 1.55 } },
  liquor: { id: "liquor", name: "Bootleg liquor", unit: "case", base: 45, heat: 0.15, mult: { solmarra: 0.65, varrow: 1, meridian: 1.2, kestrova: 1.6 } },
  phones: { id: "phones", name: "Grey-market phones", unit: "box", base: 110, heat: 0.2, mult: { meridian: 0.65, solmarra: 1, varrow: 1.2, kestrova: 1.55 } },
  pistols: { id: "pistols", name: "Unregistered pistols", unit: "crate", base: 300, heat: 1, mult: { varrow: 0.7, kestrova: 1, solmarra: 1.3, meridian: 1.6 } },
};
export const GOOD_IDS = Object.keys(GOODS) as GoodId[];
export const isGood = (v: unknown): v is GoodId => typeof v === "string" && v in GOODS;
export const isCarModel = (v: unknown): v is CarModel => typeof v === "string" && v in CARS;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** What the fence here charges for a unit this hour. */
export function goodPrice(good: GoodId, country: CountryId, now: number): number {
  const hour = Math.floor(now / 3_600_000);
  const swing = 0.85 + (hash(`good:${good}:${country}:${hour}`) % 1000) / 3333; // 0.85–1.15
  return Math.max(1, Math.round(GOODS[good].base * GOODS[good].mult[country] * swing));
}
export const goodSellPrice = (good: GoodId, country: CountryId, now: number) => Math.floor(goodPrice(good, country, now) * CAR.sellShare);

export const carPrice = (model: CarModel, country: CountryId) => Math.round(CARS[model].price * COUNTRY_BY_ID[country].priceMult);
export const trunkSize = (car: Car) => Math.floor(CARS[car.model].trunk * (car.compartment ? 1 - CAR.compartment.trunkLoss : 1));
export const cargoUnits = (car: Car) => GOOD_IDS.reduce((s, g) => s + (car.cargo?.[g] ?? 0), 0);
export const cargoValue = (car: Car, country: CountryId, now: number) => GOOD_IDS.reduce((s, g) => s + (car.cargo?.[g] ?? 0) * goodPrice(g, country, now), 0);
export const repairCost = (car: Car) => Math.ceil(car.boughtFor * CAR.repairShare * ((100 - car.condition) / 100));
export const resaleValue = (car: Car) => Math.floor(car.boughtFor * CAR.resale * (car.condition / 100));
const drugsOn = (p: Player) => Object.values(p.drugs ?? {}).reduce((s, n) => s + (n ?? 0), 0);

export function fuelCost(from: CountryId, to: CountryId): number {
  return Math.round(distance(from, to) * CAR.fuelPerUnit * COUNTRY_BY_ID[from].priceMult);
}
export function driveMs(from: CountryId, to: CountryId, car: Car): number {
  return Math.round((distance(from, to) * CAR.minutesPerUnit * 60_000) / CARS[car.model].speed);
}

function here(p: Player, carId: string, country: CountryId): Car {
  const car = (p.garage ?? []).find((c) => c.id === carId);
  if (!car) throw new GameError("You don't have that car.");
  if (car.country !== country) throw new GameError(`It's parked in ${COUNTRY_BY_ID[car.country].capital}.`);
  return car;
}

/** Clean money: cash first, then the bank. */
function payClean(p: Player, amount: number, what: string) {
  const bank = p.hasBankAccount ? p.bank : 0;
  if (p.cash + bank < amount) throw new GameError(`${what} costs $${amount.toLocaleString()}. Cash or bank, clean money.`);
  const fromCash = Math.min(p.cash, amount);
  p.cash -= fromCash;
  p.bank -= amount - fromCash;
}

export function buyCar(p: Player, model: CarModel, country: CountryId, now: number): GameEvent[] {
  const def = CARS[model];
  if (!def) throw new GameError("No such car.");
  if ((p.garage ?? []).length >= CAR.maxCars) throw new GameError(`Your garage holds ${CAR.maxCars}. Sell one first.`);
  const price = carPrice(model, country);
  payClean(p, price, `The ${def.name.toLowerCase()}`);
  const car: Car = { id: `car-${now.toString(36)}`, model, country, condition: 100, cargo: {}, boughtFor: price };
  p.garage = [...(p.garage ?? []), car];
  return [{ tone: "good", text: `The ${def.name.toLowerCase()} is yours. It's parked in ${COUNTRY_BY_ID[country].capital}.` }];
}

export function sellCar(p: Player, carId: string, country: CountryId): GameEvent[] {
  const car = here(p, carId, country);
  if (car.hot) throw new GameError("No legit lot will touch a stolen car. New plates first, or the chop shop.");
  if (cargoUnits(car)) throw new GameError("Empty the trunk first.");
  const pay = resaleValue(car);
  p.cash += pay;
  p.garage = (p.garage ?? []).filter((c) => c !== car);
  return [{ tone: "info", text: `The lot gives you $${pay.toLocaleString()} for the ${CARS[car.model].name.toLowerCase()}.` }];
}

export function repairCar(p: Player, carId: string, country: CountryId, price?: number): GameEvent[] {
  const car = here(p, carId, country);
  if (car.condition >= 100) throw new GameError("It runs fine.");
  // A player mechanic's price, or the dealer's (mechanics pay parts only on their own cars).
  const cost = price ?? Math.ceil(repairCost(car) * (p.path === "mechanic" && p.rank >= 1 ? 0.5 : 1));
  payClean(p, cost, "The repair");
  car.condition = 100;
  return [{ tone: "good", text: `The mechanic works it over. Good as new. -$${cost.toLocaleString()}` }];
}

export function fitCompartment(p: Player, carId: string, country: CountryId, price?: number): GameEvent[] {
  const car = here(p, carId, country);
  if (car.compartment) throw new GameError("It already has one.");
  if (cargoUnits(car) > Math.floor(CARS[car.model].trunk * (1 - CAR.compartment.trunkLoss))) throw new GameError("Unload some cargo first: the compartment takes up trunk space.");
  const cost = price ?? Math.round(CAR.compartment.cost * COUNTRY_BY_ID[country].priceMult);
  payClean(p, cost, "A hidden compartment");
  car.compartment = true;
  return [{ tone: "good", text: `A mechanic who doesn't ask questions builds a false floor. Searches get a lot harder. -$${cost.toLocaleString()}` }];
}

export function buyCargo(p: Player, carId: string, good: GoodId, qty: number, country: CountryId, now: number): GameEvent[] {
  const car = here(p, carId, country);
  const n = Math.floor(qty);
  if (!Number.isFinite(n) || n < 1) throw new GameError("How many?");
  const room = trunkSize(car) - cargoUnits(car);
  if (n > room) throw new GameError(room ? `Room for ${room} more in the trunk.` : "The trunk is full.");
  const cost = goodPrice(good, country, now) * n;
  if (!canPayIllegal(p, cost)) throw new GameError(`That's $${cost.toLocaleString()}. Fences take dirty money or cash.`);
  payIllegal(p, cost);
  car.cargo = { ...car.cargo, [good]: (car.cargo?.[good] ?? 0) + n };
  return [{ tone: "info", text: `${n} ${GOODS[good].unit}${n > 1 ? "s" : ""} of ${GOODS[good].name.toLowerCase()} loaded. -$${cost.toLocaleString()}` }];
}

export function sellCargo(p: Player, carId: string, good: GoodId, qty: number, country: CountryId, now: number): GameEvent[] {
  const car = here(p, carId, country);
  const n = Math.floor(qty);
  if (!Number.isFinite(n) || n < 1) throw new GameError("How many?");
  if ((car.cargo?.[good] ?? 0) < n) throw new GameError("You don't have that many in the trunk.");
  const pay = goodSellPrice(good, country, now) * n;
  car.cargo = { ...car.cargo, [good]: (car.cargo?.[good] ?? 0) - n };
  earnDirty(p, pay);
  p.heat += GOODS[good].heat * n * COUNTRY_BY_ID[country].heatMult;
  p.jobCounts["smuggle:sold"] = (p.jobCounts["smuggle:sold"] ?? 0) + n;
  return [{ tone: "good", text: `Sold ${n} ${GOODS[good].unit}${n > 1 ? "s" : ""} of ${GOODS[good].name.toLowerCase()}. +$${pay.toLocaleString()} dirty.` }];
}

/** How hard a car is to search, with a false floor and a driver who knows the roads. */
export function concealment(p: Player, car: Car): number {
  return Math.min(0.9, CARS[car.model].hidden + (car.compartment ? CAR.compartment.hidden : 0) + specTier(p, "wheelman") * 0.05);
}

/**
 * The highway between cities. Rolled at departure, revealed on arrival.
 * `ambush` is the road-gang fight shared with the bus.
 */
export function rollDrive(
  p: Player,
  car: Car,
  now: number,
  rng: Rng,
  ambush: () => TripIncident | null,
  officers: { id: string; name: string; eye: number }[] = [],
): TripIncident | null {
  const k = CAR.checkpoint;
  const manned = officers.length > 0;
  const chance = manned ? Math.min(0.85, k.base + p.heat * k.perHeat + 0.25) : Math.min(k.max, k.base + p.heat * k.perHeat);
  if (rng() < chance) {
    const units = cargoUnits(car) + drugsOn(p);
    // The sharpest officer on duty does the search.
    const officer = manned ? officers.reduce((a, b) => (b.eye > a.eye ? b : a)) : null;
    const who = officer ? `Customs officer ${officer.name}` : "They";
    const credit = (value: number, what: string) => {
      if (officer) p.customsSeizure = { officerId: officer.id, value, what };
    };
    const drugValue = DRUG_IDS.reduce((s, d) => s + (p.drugs?.[d] ?? 0) * streetPrice(d, countryOf(p), now), 0);
    if (car.hot) {
      if (CARS[car.model].outrun && rng() < CARS[car.model].outrun! + specTier(p, "wheelman") * 0.1) {
        return { kind: "checkpoint", text: "A checkpoint ahead, and your plates are on their list. You floor it and blow straight through.", heat: k.outrunHeat * 1.5 };
      }
      credit(Math.round(car.boughtFor * 0.25) + cargoValue(car, car.country, now) + drugValue, `a stolen ${CARS[car.model].name.toLowerCase()}`);
      return {
        kind: "checkpoint",
        officer: officer ? { id: officer.id, name: officer.name } : undefined,
        text: `A checkpoint on the highway. ${who} run${officer ? "s" : ""} your plates: the car is stolen. The car is impounded${units ? " with everything in it" : ""} and you finish the trip on foot and a bus.`,
        seized: true,
        impounded: true,
        heat: k.heat * 1.5,
        delayMs: k.delayMs * 4,
      };
    }
    if (!units) return { kind: "checkpoint", text: "A checkpoint on the highway. They look at your papers, look at you, and wave you through.", delayMs: k.delayMs };
    const def = CARS[car.model];
    if (def.outrun && rng() < def.outrun + specTier(p, "wheelman") * 0.1) {
      return { kind: "checkpoint", text: "Flashlights at a checkpoint ahead. You drop a gear and blow straight through it. Nobody catches a car like this, but they took your plates.", heat: k.outrunHeat };
    }
    // A real officer searches with their own eyes: sharper than the usual guard.
    const find = officer ? Math.min(0.95, Math.max(k.find, 0.5 + (officer.eye - 10) / 60)) : k.find;
    if (rng() < find * (1 - concealment(p, car))) {
      const value = cargoValue(car, car.country, now);
      const fine = Math.round(value * k.fineShare);
      credit(value + drugValue, `${units} units from a car`);
      return {
        kind: "checkpoint",
        officer: officer ? { id: officer.id, name: officer.name } : undefined,
        text: `A checkpoint on the highway. ${who} search${officer ? "es" : ""} the car and find${officer ? "s" : ""} it all: ${units} unit${units > 1 ? "s" : ""} seized${fine ? `, and a $${fine.toLocaleString()} fine` : ""}. They let you drive on, lighter.`,
        seized: true,
        fine,
        heat: k.heat,
        delayMs: k.delayMs * 3,
      };
    }
    return { kind: "checkpoint", text: "A checkpoint on the highway. They pop the trunk, poke around, and miss it. Your hands only shake after.", delayMs: k.delayMs };
  }
  if (!CARS[car.model].armored && rng() < CAR.gangChance) return ambush();
  return null;
}

/** Puts a driven car and its cargo in the new city, applying a seizure. */
export function arriveByCar(p: Player, carId: string | undefined, to: CountryId, inc: TripIncident | null | undefined) {
  const car = (p.garage ?? []).find((c) => c.id === carId);
  if (!car) return;
  car.country = to;
  if (inc?.impounded) {
    p.garage = (p.garage ?? []).filter((c) => c !== car);
    if (car.hot) p.impounded = { ownerId: car.hot.fromId, car: { ...car, cargo: {}, hot: undefined } };
    p.drugs = {};
    return;
  }
  if (inc?.seized) {
    car.cargo = {};
    p.drugs = {};
  }
}

/** Starts a drive. The caller sets up the trip with the returned incident and duration. */
export function startDrive(p: Player, carId: string, from: CountryId, to: CountryId, rng: Rng) {
  const car = here(p, carId, from);
  if (to === from) throw new GameError("You're already here.");
  if (!COUNTRY_BY_ID[to]) throw new GameError("Unknown destination.");
  if (car.condition < CAR.minCondition) throw new GameError("It won't make the trip in this state. Get it repaired.");
  const fuel = fuelCost(from, to);
  if (p.cash < fuel) throw new GameError(`Fuel for the trip is $${fuel}. Cash.`);
  p.cash -= fuel;
  car.condition = Math.max(0, car.condition - Math.round(CAR.wear[0] + rng() * (CAR.wear[1] - CAR.wear[0])));
  return { car, fuel, ms: driveMs(from, to, car) };
}

/** The Docks: your garage, the lot, and the fences. */
export function docksView(p: Player, country: CountryId, now: number) {
  const garage = (p.garage ?? []).map((car) => {
    const def = CARS[car.model];
    return {
      id: car.id,
      model: car.model,
      name: def.name,
      color: def.color,
      here: car.country === country,
      city: COUNTRY_BY_ID[car.country].capital,
      condition: car.condition,
      canDrive: car.condition >= CAR.minCondition,
      compartment: !!car.compartment,
      trunk: trunkSize(car),
      used: cargoUnits(car),
      cargo: GOOD_IDS.filter((g) => (car.cargo?.[g] ?? 0) > 0).map((g) => ({ id: g, name: GOODS[g].name, unit: GOODS[g].unit, qty: car.cargo![g]! })),
      repairCost: Math.ceil(repairCost(car) * (p.path === "mechanic" && p.rank >= 1 ? 0.5 : 1)),
      /** What the dealer charges anyone else (player mechanics quote against this). */
      dealerRepair: repairCost(car),
      resale: resaleValue(car),
      hot: !!car.hot,
      stolenFrom: car.hot?.fromName ?? null,
      chop: car.hot ? Math.floor(car.boughtFor * 0.35 * (0.5 + car.condition / 200)) : null,
      plates: car.hot ? Math.round(car.boughtFor * 0.2) : null,
      looks: car.compartment ? "False floor fitted" : def.hidden >= 0.3 ? "Looks innocent" : def.outrun ? "Built to run" : def.armored ? "Armored" : "Plain",
    };
  });
  return {
    garage,
    maxCars: CAR.maxCars,
    compartmentCost: Math.round(CAR.compartment.cost * COUNTRY_BY_ID[country].priceMult),
    lot: CAR_MODELS.map((m) => ({ id: m, name: CARS[m].name, blurb: CARS[m].blurb, price: carPrice(m, country), trunk: CARS[m].trunk, speed: CARS[m].speed, color: CARS[m].color, armored: !!CARS[m].armored, outrun: !!CARS[m].outrun })),
    goods: GOOD_IDS.map((g) => ({
      id: g,
      name: GOODS[g].name,
      unit: GOODS[g].unit,
      buy: goodPrice(g, country, now),
      sell: goodSellPrice(g, country, now),
      /** What fences in every city pay this hour: the smuggler's whole game. */
      board: COUNTRIES.map((c) => ({ country: c.id, city: c.capital, sell: goodSellPrice(g, c.id, now), here: c.id === country })),
    })),
    drugsOnYou: drugsOn(p),
  };
}

/** Drive routes for the station: one per car parked here. */
export function driveRoutes(p: Player, from: CountryId, to: CountryId) {
  return (p.garage ?? [])
    .filter((c) => c.country === from)
    .map((c) => ({ carId: c.id, model: c.model, name: CARS[c.model].name, fuel: fuelCost(from, to), minutes: Math.round(driveMs(from, to, c) / 60_000), canDrive: c.condition >= CAR.minCondition, cargo: cargoUnits(c) }));
}
