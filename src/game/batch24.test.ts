import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { BREAKIN, breakIn, breakInBlock, breakInOdds, carTheftBlock, stealCar } from "./breakin";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const ctx = (id = "C1") => ({ caseId: id, district: "Iron Row", crewTag: null, witnesses: [] as Player[] });
const mk = (id: string, country: "varrow" | "solmarra" = "varrow"): Player => {
  const p = createPlayer(id, id.toUpperCase(), T0, country);
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.seenAt = NOW - BREAKIN.homeMs - 1;
  return p;
};
const victimWithStash = () => {
  const t = mk("vic");
  t.housing = 2;
  t.homes = { varrow: 2 };
  t.stash = { varrow: { cash: 1_000, dirty: 4_000, drugs: { herb: 10 } } };
  return t;
};

describe("break-ins", () => {
  it("need a place to break into", () => {
    const a = mk("ana");
    const t = mk("bo");
    expect(breakInBlock(a, t, NOW)).toMatch(/don't have a place/);
  });

  it("a clean job takes part of the stash and opens a case", () => {
    const a = mk("ana");
    const t = victimWithStash();
    const out = breakIn(a, t, NOW, always(0), ctx());
    // rng 0: success, and the smallest share.
    expect(a.dirty).toBe(Math.floor(1_000 * BREAKIN.share[0]) + Math.floor(4_000 * BREAKIN.share[0]));
    expect(a.drugs?.herb).toBe(3);
    expect(t.stash?.varrow?.dirty).toBe(4_000 - Math.floor(4_000 * BREAKIN.share[0]));
    expect(out.caseFile?.kind).toBe("burglary");
    expect(out.caseFile?.tips.length).toBeGreaterThanOrEqual(BALANCE.crime.minWitnesses);
    expect(t.inbox?.[0].text).toMatch(/broke into your place/);
    expect(breakInBlock(a, t, NOW + 1)).toMatch(/recently/);
  });

  it("an alarm and someone at home make it much harder", () => {
    const a = mk("ana");
    const t = victimWithStash();
    const open = breakInOdds(a, t, "varrow", NOW);
    t.alarms = ["varrow"];
    t.seenAt = NOW;
    expect(breakInOdds(a, t, "varrow", NOW)).toBeLessThan(open / 2);
  });

  it("caught by the owner at home: they see your face", () => {
    const a = mk("ana");
    const t = victimWithStash();
    t.seenAt = NOW;
    const out = breakIn(a, t, NOW, always(0.99), ctx());
    expect(out.caseFile).toBeNull();
    expect(t.inbox?.[0].text).toMatch(/caught ANA/);
  });

  it("a fitted alarm costs money and is listed for the city", () => {
    const p = mk("ana");
    p.housing = 2;
    p.cash = 10_000;
    applyAction(p, { type: "fit_alarm" }, NOW, always(0.5));
    expect(p.alarms).toEqual(["varrow"]);
    expect(p.cash).toBeLessThan(10_000);
  });
});

describe("car theft", () => {
  const owner = () => {
    const t = mk("vic");
    t.cash = 50_000;
    applyAction(t, { type: "car_buy", model: "van" }, NOW, always(0.5));
    t.garage![0].cargo = { phones: 5 };
    return t;
  };

  it("moves the car, cargo and all, into the thief's garage with hot plates", () => {
    const a = mk("ana");
    const t = owner();
    const id = t.garage![0].id;
    const out = stealCar(a, t, id, NOW, always(0), ctx());
    expect(t.garage).toHaveLength(0);
    expect(a.garage?.[0].hot?.fromName).toBe("VIC");
    expect(a.garage?.[0].cargo.phones).toBe(5);
    expect(out.caseFile?.kind).toBe("car_theft");
  });

  it("a hot car can't go to the lot; new plates clean it, or the chop shop pays dirty", () => {
    const a = mk("ana");
    const t = owner();
    stealCar(a, t, t.garage![0].id, NOW, always(0), ctx());
    const car = a.garage![0];
    car.cargo = {};
    expect(() => applyAction(a, { type: "car_sell", carId: car.id }, NOW, always(0.5))).toThrow(/stolen/);
    a.cash = 50_000;
    applyAction(a, { type: "car_plates", carId: car.id }, NOW, always(0.5));
    expect(a.garage![0].hot).toBeUndefined();
  });

  it("a checkpoint runs hot plates and impounds the car", () => {
    const a = mk("ana");
    const t = owner();
    stealCar(a, t, t.garage![0].id, NOW, always(0), ctx());
    a.cash = 10_000;
    applyAction(a, { type: "drive", to: "solmarra", carId: a.garage![0].id }, NOW, always(0));
    expect(a.travel?.incident?.impounded).toBe(true);
    tick(a, a.travel!.arriveAt + 1);
    expect(a.garage).toHaveLength(0);
    expect(a.country).toBe("solmarra");
  });

  it("can't take a car from another city, or with a full garage", () => {
    const a = mk("ana");
    const t = owner();
    const car = t.garage![0];
    car.country = "solmarra";
    expect(carTheftBlock(a, t, car, NOW)).toMatch(/isn't parked here/);
  });
});
