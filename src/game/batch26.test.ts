import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { breakIn, breakInOdds } from "./breakin";
import { DOGS, dogGuard } from "./dogs";
import { hireMechanic, MECH, mechBlock } from "./mechanic";
import { PATHS } from "./content/paths";
import { JOBS } from "./content/jobs";
import { SPECIALTIES } from "./specialties";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string): Player => {
  const p = createPlayer(id, id.toUpperCase(), T0, "varrow");
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.cash = 50_000;
  p.seenAt = NOW - 60 * 60_000;
  return p;
};

describe("guard dogs", () => {
  it("need a home, a name and cash; then make break-ins harder", () => {
    const p = mk("ana");
    expect(() => applyAction(p, { type: "dog_buy", breed: "shepherd", name: "Rex" }, NOW, always(0.5))).toThrow(/somewhere to live/);
    p.housing = 2;
    p.homes = { varrow: 2 };
    const thief = mk("bo");
    const before = breakInOdds(thief, p, "varrow", NOW);
    applyAction(p, { type: "dog_buy", breed: "shepherd", name: "Rex!!" }, NOW, always(0.5));
    expect(p.dogs?.varrow?.name).toBe("Rex");
    expect(breakInOdds(thief, p, "varrow", NOW)).toBeCloseTo(before * (1 - DOGS.breeds.shepherd.guard));
  });

  it("guard half as well when hungry, and leave after a week unfed", () => {
    const p = mk("ana");
    p.housing = 2;
    applyAction(p, { type: "dog_buy", breed: "mastiff", name: "Brutus" }, NOW, always(0.5));
    expect(dogGuard(p, "varrow", NOW)).toBe(DOGS.breeds.mastiff.guard);
    expect(dogGuard(p, "varrow", NOW + DOGS.fedMs + 1)).toBe(DOGS.breeds.mastiff.guard / 2);
    expect(dogGuard(p, "varrow", NOW + DOGS.leaveMs + 1)).toBe(0);
    expect(() => applyAction(p, { type: "dog_feed" }, NOW + 60_000, always(0.5))).toThrow(/still full/);
    applyAction(p, { type: "dog_feed" }, NOW + DOGS.fedMs + 1, always(0.5));
    expect(dogGuard(p, "varrow", NOW + DOGS.fedMs + 2)).toBe(DOGS.breeds.mastiff.guard);
  });

  it("bark when a break-in fails, and the owner hears about it", () => {
    const p = mk("ana");
    p.housing = 2;
    applyAction(p, { type: "dog_buy", breed: "mutt", name: "Pip" }, NOW, always(0.5));
    const thief = mk("bo");
    const out = breakIn(thief, p, NOW, always(0.99), { caseId: "C", district: "Iron Row", crewTag: null, witnesses: [] });
    expect(out.events[0].text).toMatch(/dog/);
    expect(p.inbox?.[0].text).toMatch(/Pip/);
  });
});

describe("mechanics", () => {
  const mechanic = (rank = 3) => {
    const m = mk("vera");
    m.path = "mechanic";
    m.rank = rank;
    applyAction(m, { type: "garage_set", open: true, rate: 0.8 }, NOW, always(0.5));
    return m;
  };

  it("is a career with a way in and work at every rank", () => {
    expect(PATHS.mechanic.ranks).toHaveLength(7);
    expect(JOBS.some((j) => j.id === "garage_hand" && !j.path)).toBe(true);
    for (let r = 1; r <= 7; r++) expect(JOBS.some((j) => j.path === "mechanic" && j.minRank === r)).toBe(true);
  });

  it("customers pay the mechanic's rate, and the mechanic keeps it", () => {
    const m = mechanic();
    const c = mk("cal");
    applyAction(c, { type: "car_buy", model: "van" }, NOW, always(0.5));
    c.garage![0].condition = 40;
    const dealer = Math.ceil(c.garage![0].boughtFor * 0.25 * 0.6);
    const mcash = m.cash;
    const ccash = c.cash;
    hireMechanic(m, c, "repair", c.garage![0].id, NOW);
    expect(c.garage![0].condition).toBe(100);
    const price = Math.round(dealer * 0.8);
    expect(c.cash).toBe(ccash - price);
    expect(m.cash).toBe(mcash + price);
    expect(m.garageService?.jobs).toBe(1);
    expect(m.inbox?.[0].text).toMatch(/hired you/);
  });

  it("higher-rank work waits for the rank; closed garages and other cities can't be hired", () => {
    const m = mechanic(2);
    const c = mk("cal");
    c.housing = 2;
    expect(() => hireMechanic(m, c, "alarm", undefined, NOW)).toThrow(/doesn't do that yet/);
    m.rank = MECH.services.alarm.rank;
    hireMechanic(m, c, "alarm", undefined, NOW);
    expect(c.alarms).toEqual(["varrow"]);
    applyAction(m, { type: "garage_set", open: false, rate: 1 }, NOW, always(0.5));
    expect(mechBlock(m, c, NOW)).toMatch(/closed/);
  });

  it("mechanics repair their own cars at the dealer for parts only", () => {
    const m = mechanic(1);
    applyAction(m, { type: "car_buy", model: "hatch" }, NOW, always(0.5));
    m.garage![0].condition = 0;
    const cash = m.cash;
    applyAction(m, { type: "car_repair", carId: m.garage![0].id }, NOW, always(0.5));
    expect(cash - m.cash).toBe(Math.ceil(m.garage![0].boughtFor * 0.25 * 0.5));
  });
});

describe("specialty names", () => {
  it("are our own", () => {
    const names = SPECIALTIES.map((s) => s.name);
    for (const n of ["Combat medic", "Money on my mind", "Hard as nails", "Private eye"]) expect(names).not.toContain(n);
  });
});
