import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { CAR, carPrice, fuelCost, goodPrice, goodSellPrice, GOODS, trunkSize } from "./vehicles";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (cash = 200_000): Player => {
  const p = createPlayer("p", "Pia", T0, "kestrova");
  tick(p, NOW);
  p.cash = cash;
  p.energy = 100;
  p.heat = 0;
  return p;
};
const withCar = (model: "hatch" | "van" | "coupe" | "suv" = "van") => {
  const p = mk();
  applyAction(p, { type: "car_buy", model }, NOW, always(0.5));
  return { p, car: p.garage![0] };
};
const arrive = (p: Player) => tick(p, p.travel!.arriveAt + 1);

describe("cars", () => {
  it("are bought with clean money, cash first then the bank, and the garage has a limit", () => {
    const p = mk(1_000);
    p.hasBankAccount = true;
    p.bank = 50_000;
    applyAction(p, { type: "car_buy", model: "hatch" }, NOW, always(0.5));
    expect(p.cash).toBe(0);
    expect(p.bank).toBe(50_000 - (carPrice("hatch", "kestrova") - 1_000));
    expect(p.garage).toHaveLength(1);
    expect(p.garage![0].country).toBe("kestrova");
    p.garage!.push({ ...p.garage![0], id: "b" }, { ...p.garage![0], id: "c" });
    expect(() => applyAction(p, { type: "car_buy", model: "hatch" }, NOW, always(0.5))).toThrow(/holds/);
  });

  it("drive you and the trunk to another city, wearing the car and costing fuel", () => {
    const { p, car } = withCar("van");
    applyAction(p, { type: "cargo_buy", carId: car.id, good: "smokes", qty: 10 }, NOW, always(0.5));
    const cash = p.cash;
    applyAction(p, { type: "drive", to: "meridian", carId: car.id }, NOW, always(0.99));
    expect(p.cash).toBe(cash - fuelCost("kestrova", "meridian"));
    expect(p.travel?.mode).toBe("car");
    expect(p.garage![0].condition).toBeLessThan(100);
    arrive(p);
    expect(p.country).toBe("meridian");
    expect(p.garage![0].country).toBe("meridian");
    expect(p.garage![0].cargo.smokes).toBe(10);
    // Sold where it's banned: worth more than it cost.
    const dirty = p.dirty ?? 0;
    const at = p.tickAt;
    applyAction(p, { type: "cargo_sell", carId: car.id, good: "smokes", qty: 10 }, at, always(0.5));
    expect((p.dirty ?? 0) - dirty).toBe(goodSellPrice("smokes", "meridian", at) * 10);
    expect(goodSellPrice("smokes", "meridian", at)).toBeGreaterThan(goodPrice("smokes", "kestrova", NOW));
  });

  it("can't drive a car parked in another city, or one that's worn out", () => {
    const { p, car } = withCar("hatch");
    p.garage![0].country = "varrow";
    expect(() => applyAction(p, { type: "drive", to: "meridian", carId: car.id }, NOW, always(0.99))).toThrow(/parked/);
    p.garage![0].country = "kestrova";
    p.garage![0].condition = CAR.minCondition - 1;
    expect(() => applyAction(p, { type: "drive", to: "meridian", carId: car.id }, NOW, always(0.99))).toThrow(/repaired/);
    applyAction(p, { type: "car_repair", carId: car.id }, NOW, always(0.5));
    expect(p.garage![0].condition).toBe(100);
  });

  it("the trunk has a limit, and a false floor takes some of it", () => {
    const { p, car } = withCar("hatch");
    expect(() => applyAction(p, { type: "cargo_buy", carId: car.id, good: "liquor", qty: 11 }, NOW, always(0.5))).toThrow(/Room|full/);
    applyAction(p, { type: "car_compartment", carId: car.id }, NOW, always(0.5));
    expect(trunkSize(p.garage![0])).toBe(8);
  });
});

describe("checkpoints", () => {
  it("a search finds the cargo and anything on you; you pay a fine and carry the heat", () => {
    const { p, car } = withCar("hatch");
    applyAction(p, { type: "cargo_buy", carId: car.id, good: "pistols", qty: 5 }, NOW, always(0.5));
    p.drugs = { herb: 3 };
    applyAction(p, { type: "drive", to: "varrow", carId: car.id }, NOW, always(0));
    expect(p.travel?.incident?.kind).toBe("checkpoint");
    expect(p.travel?.incident?.seized).toBe(true);
    arrive(p);
    expect(p.garage![0].cargo).toEqual({});
    expect(p.drugs).toEqual({});
    expect(p.heat).toBeGreaterThanOrEqual(CAR.checkpoint.heat);
  });

  it("a sports coupe can blow through instead", () => {
    const { p, car } = withCar("coupe");
    applyAction(p, { type: "cargo_buy", carId: car.id, good: "phones", qty: 4 }, NOW, always(0.5));
    applyAction(p, { type: "drive", to: "varrow", carId: car.id }, NOW, always(0));
    arrive(p);
    expect(p.garage![0].cargo.phones).toBe(4);
    expect(p.heat).toBe(CAR.checkpoint.outrunHeat);
  });

  it("an empty car is waved through", () => {
    const { p, car } = withCar("hatch");
    applyAction(p, { type: "drive", to: "varrow", carId: car.id }, NOW, always(0));
    expect(p.travel?.incident?.seized).toBeFalsy();
    expect(p.travel?.incident?.text).toMatch(/wave you through/);
    expect(Object.keys(GOODS)).toHaveLength(4);
  });
});
