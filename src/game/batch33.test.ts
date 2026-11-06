import { describe, expect, it } from "vitest";
import { createPlayer, drillXp } from "./engine";
import { lawyerPower } from "./justice";
import { REGULARS, ROSTER } from "./regulars";
import { patchFee, servicesOf, useService, WORK } from "./regularwork";
import { makeRegular } from "@/server/regulars";
import type { Player } from "./types";

const hooks = { drill: drillXp, lawyerPower };
/** A time when this regular is out (their first hour of the day). */
const onShift = (key: string) => {
  const def = Object.values(ROSTER).flat().find((d) => d.key === key)!;
  return Date.UTC(2027, 0, 5, def.hours[0], 30);
};
const pair = (key: string, country: "varrow" | "solmarra" = "solmarra") => {
  const now = onShift(key);
  const reg = makeRegular(country, key, now);
  const p = createPlayer("p1", "Test Player", now - 30 * 24 * 3_600_000, country);
  p.cash = 5000;
  p.hasBankAccount = true;
  p.bank = 5000;
  return { now, reg, p };
};
const svc = (p: Player, r: Player, now: number, id: string) => servicesOf(p, r, now).find((s) => s.id === id);

describe("street regulars do their job", () => {
  it("the doctor patches you up for cash, and pockets the fee", () => {
    const { now, reg, p } = pair("marisol");
    p.hp = 40;
    const fee = patchFee(p);
    expect(svc(p, reg, now, "patch")?.block).toBeNull();
    const before = reg.cash;
    useService(p, reg, "patch", now, hooks);
    expect(p.hp).toBeGreaterThan(40);
    expect(p.cash).toBe(5000 - fee);
    expect(reg.cash).toBe(before + fee);
    expect(svc(p, reg, now, "patch")?.block).toMatch(/not hurt/);
  });

  it("the attorney goes on retainer, paid from the bank", () => {
    const { now, reg, p } = pair("tomas");
    useService(p, reg, "retainer", now, hooks);
    expect(p.retainer?.lawyerId).toBe(reg.id);
    expect(svc(p, reg, now, "retainer")?.block).toMatch(/already/);
  });

  it("the banker cleans dirty money for a cut", () => {
    const { now, reg, p } = pair("lucia");
    p.dirty = 1000;
    useService(p, reg, "launder", now, hooks, 1000);
    expect(p.dirty).toBe(0);
    expect(p.cash).toBe(5000 + 1000 - Math.ceil(1000 * WORK.launderCut));
  });

  it("the beat cop cools your record once a day", () => {
    const { now, reg, p } = pair("ana");
    p.heat = 30;
    useService(p, reg, "cop", now, hooks);
    expect(p.heat).toBe(30 - WORK.copHeat);
    expect(() => useService(p, reg, "cop", now + 60_000, hooks)).toThrow(/Once a day/);
  });

  it("muscle, drills and a vigilante's watch", () => {
    const m = pair("beppe");
    useService(m.p, m.reg, "muscle", m.now, hooks);
    expect(m.p.bodyguardUntil).toBeGreaterThan(m.now);
    const d = pair("matteo");
    const e = d.p.energy;
    useService(d.p, d.reg, "drill", d.now, hooks);
    expect(d.p.energy).toBe(e - WORK.drillEnergy);
    const v = pair("elena");
    useService(v.p, v.reg, "watch", v.now, hooks);
    expect(v.p.homeWatchUntil).toBeGreaterThan(v.now);
  });

  it("only while they're out, and only in their city; people without a career offer nothing", () => {
    const { now, reg, p } = pair("marisol");
    p.hp = 10;
    const def = ROSTER.solmarra.find((d) => d.key === "marisol")!;
    const off = Date.UTC(2027, 0, 5, (def.hours[0] + def.hours[1] + 1) % 24, 30);
    expect(svc(p, reg, off, "patch")?.block).toMatch(/off the street/);
    const elsewhere = createPlayer("p2", "Elsewhere", now, "varrow");
    expect(svc(elsewhere, reg, now, "patch")?.block).toMatch(/another city/);
    const nobody = makeRegular("solmarra", "dario", now);
    expect(servicesOf(p, nobody, now)).toEqual([]);
    expect(reg.id.startsWith(REGULARS.idPrefix)).toBe(true);
  });
});
