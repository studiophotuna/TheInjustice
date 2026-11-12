import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { torchBusiness, torchChance } from "./arson";
import { hireInspection, hireWatch, INSPECT, inspectBlock, setInspect, setWatch, WATCH, watchBlock } from "./protect";
import { servicesOf, useService } from "./regularwork";
import { makeRegular } from "@/server/regulars";
import type { Player } from "./types";

// 7.17: vigilantes watch homes, firefighters inspect businesses.

const NOW = Date.UTC(2027, 10, 1, 12);
const at = (v: number) => () => v;
const mk = (id: string, path: Player["path"] = null, rank = 0): Player => {
  const p = createPlayer(id, `Test ${id}`, NOW - 30 * 86_400_000, "varrow");
  tick(p, NOW);
  p.path = path;
  p.rank = rank;
  p.cash = 5000;
  return p;
};
const hooks = { drill: () => [], lawyerPower: () => 1 };

describe("vigilantes watch homes", () => {
  it("rank 2 and up, within a real-life fee range", () => {
    expect(() => setWatch(mk("v", "vigilante", 1), true, 250)).toThrow(/rank 2/);
    const v = mk("v", "vigilante", 2);
    expect(() => setWatch(v, true, 50)).toThrow(/between/);
    setWatch(v, true, 250);
    expect(v.watchService?.open).toBe(true);
  });

  it("a homeowner hires one: break-ins are harder overnight, the vigilante is paid", () => {
    const v = mk("v", "vigilante", 2);
    setWatch(v, true, 250);
    const c = mk("c");
    expect(watchBlock(v, c, NOW)).toMatch(/place in this city/);
    c.housing = 2;
    const cash = v.cash;
    hireWatch(v, c, NOW);
    expect(c.homeWatchUntil).toBe(NOW + WATCH.ms);
    expect(v.cash).toBe(cash + 250);
    expect(v.watchService?.jobs).toBe(1);
    expect(watchBlock(v, c, NOW + 1000)).toMatch(/already watching/);
  });

  it("a regular vigilante won't watch a place you don't have", () => {
    const r = makeRegular("varrow", "sully", NOW);
    r.regular!.slot = -1;
    const homeless = mk("h");
    const svc = servicesOf(homeless, r, NOW).find((s) => s.id === "watch");
    expect(svc?.block ?? "").toMatch(/place in this city|off the street/);
  });
});

describe("firefighters inspect businesses", () => {
  const owner = () => {
    const o = mk("o");
    o.properties = { laundromat: NOW - 1000 };
    return o;
  };

  it("an inspected business is much harder to torch", () => {
    const f = mk("f", "fire", 2);
    setInspect(f, true, 300);
    const o = owner();
    const arsonist = mk("a", "enforcer", 3);
    arsonist.crewId = "crew1";
    arsonist.energy = 100;
    const chance = torchChance(arsonist, "laundromat");
    // A roll that burns an uninspected business...
    const roll = chance * 0.75;
    const o1 = owner();
    torchBusiness(arsonist, o1, "laundromat", null, NOW, at(roll));
    expect(o1.closed?.laundromat ?? 0).toBeGreaterThan(NOW);
    // ...doesn't burn one that passed its inspection.
    hireInspection(f, o, "laundromat", NOW);
    expect(o.inspected?.laundromat).toBe(NOW + INSPECT.ms);
    const a2 = mk("a2", "enforcer", 3);
    a2.crewId = "crew1";
    a2.stats = { ...arsonist.stats };
    a2.energy = 100;
    torchBusiness(a2, o, "laundromat", null, NOW, at(roll));
    expect(o.closed?.laundromat ?? 0).toBeLessThanOrEqual(NOW);
  });

  it("only businesses you own, once a week each", () => {
    const f = mk("f", "fire", 2);
    setInspect(f, true, 300);
    const o = owner();
    expect(inspectBlock(f, o, "corner_bar", NOW)).toMatch(/don't own/);
    hireInspection(f, o, "laundromat", NOW);
    expect(inspectBlock(f, o, "laundromat", NOW + 1000)).toMatch(/this week/);
    expect(() => setInspect(mk("x", "fire", 1), true, 300)).toThrow(/rank 2/);
  });

  it("a regular firefighter inspects everything you own in the city", () => {
    const r = makeRegular("varrow", "hank", NOW);
    const o = owner();
    // Regulars only work their hours; find one that's out.
    for (let h = 0; h < 24; h++) {
      const t = NOW + h * 3_600_000;
      const svc = servicesOf(o, r, t).find((s) => s.id === "inspect");
      if (svc && !svc.block) {
        useService(o, r, "inspect", t, hooks);
        expect(o.inspected?.laundromat).toBe(t + INSPECT.ms);
        return;
      }
    }
    throw new Error("Hank never offered an inspection");
  });
});
