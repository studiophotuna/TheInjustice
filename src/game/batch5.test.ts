import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { cook, buyDrugs, science, sellDrugs, smugglingCheck, streetPrice } from "./drugs";
import { applyAction, createPlayer, tick } from "./engine";
import { planHeist, runHeist, takeRole } from "./heist";
import { launder, launderOptions, payIllegal } from "./money";
import { createCrew, addMember } from "./social";
import { claimTutorial, tutorialView } from "./tutorial";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};

describe("dirty money", () => {
  it("can't be banked; it pays for illegal things first; laundering cleans it for a fee", () => {
    const p = mk("p", "Pat");
    p.dirty = 500;
    p.cash = 100;
    p.hasBankAccount = true;
    expect(() => applyAction(p, { type: "bank", op: "deposit", amount: 300 }, LATER, always(0))).toThrow(/cash/);
    payIllegal(p, 50);
    expect(p.dirty).toBe(450);
    expect(p.cash).toBe(100);
    launder(p, "laundromat", 100, LATER);
    expect(p.dirty).toBe(350);
    expect(p.cash).toBe(100 + 70);
    expect(() => launder(p, "business", 100, LATER)).toThrow(/business/);
    expect(launderOptions(p, LATER).find((o) => o.id === "bank")?.block).toMatch(/bank officers/);
  });

  it("criminal jobs pay dirty money", () => {
    const p = mk("p", "Pat");
    p.path = "enforcer";
    p.rank = 1;
    p.reputation = 20; // Iron Row only hires known faces
    const before = p.cash;
    applyAction(p, { type: "job", jobId: "debt_run" }, LATER, always(0.5));
    expect(p.cash).toBe(before);
    expect(p.dirty ?? 0).toBeGreaterThan(0);
  });
});

describe("drugs", () => {
  it("buy on the street, sell for dirty money; prices differ by city", () => {
    const p = mk("p", "Pat");
    p.dirty = 1000;
    buyDrugs(p, "herb", 5, LATER);
    expect(p.drugs?.herb).toBe(5);
    expect(p.dirty).toBe(1000 - streetPrice("herb", "varrow", LATER) * 5);
    sellDrugs(p, "herb", 5, LATER);
    expect(p.drugs?.herb).toBe(0);
    expect(p.heat).toBeGreaterThan(0);
    const prices = (["varrow", "solmarra", "kestrova", "meridian"] as const).map((c) => streetPrice("powder", c, LATER));
    expect(new Set(prices).size).toBeGreaterThan(1);
  });

  it("only people who know chemistry can cook; doctors know the most", () => {
    const p = mk("p", "Pat");
    p.supplies = 10;
    expect(() => cook(p, "herb", always(0.9))).toThrow(/chemistry/);
    const doc = mk("d", "Doc");
    doc.path = "medicine";
    doc.rank = 4;
    doc.supplies = 10;
    expect(science(doc)).toBeGreaterThanOrEqual(35);
    cook(doc, "pills", always(0.9));
    expect(doc.drugs?.pills ?? 0).toBeGreaterThan(0);
    expect(doc.supplies).toBe(8);
    expect(() => cook(doc, "powder", always(0.9))).toThrow(/chemistry/);
  });

  it("a trip can find your stash", () => {
    const p = mk("p", "Pat");
    p.drugs = { herb: 10 };
    expect(smugglingCheck(p, "plane", always(0))).toMatch(/seized/);
    expect(p.drugs).toEqual({});
    p.drugs = { herb: 10 };
    expect(smugglingCheck(p, "bus", always(0.99))).toBeNull();
  });
});

describe("heists", () => {
  function crew() {
    const boss = mk("b", "Boss");
    boss.path = "enforcer";
    boss.rank = 4;
    boss.cash = 1000;
    const c = createCrew(boss, "c1", "Iron Row", "IR", LATER);
    const team: Player[] = [boss];
    for (const n of ["Wheels", "Fingers", "Eyes"]) {
      const m = mk(n.toLowerCase(), n);
      addMember(c, m, LATER);
      team.push(m);
    }
    return { boss, c, team };
  }

  it("roles get filled; a clean job pays everyone dirty money", () => {
    const { boss, c, team } = crew();
    planHeist(c, boss, LATER);
    takeRole(c, team[1], "driver", LATER);
    takeRole(c, team[2], "safecracker", LATER);
    takeRole(c, team[3], "lookout", LATER);
    takeRole(c, boss, "muscle", LATER);
    expect(() => takeRole(c, boss, "driver", LATER)).toThrow(/already/);
    const events = runHeist(c, boss, { driver: team[1], safecracker: team[2], lookout: team[3], muscle: boss }, null, LATER, always(0));
    expect(events[0].text).toMatch(/vault opens/);
    for (const p of team) expect(p.dirty ?? 0).toBeGreaterThan(0);
    expect(() => planHeist(c, boss, LATER + 1000)).toThrow(/Lay low/);
  });

  it("no getaway driver: everyone is caught", () => {
    const { boss, c, team } = crew();
    planHeist(c, boss, LATER);
    takeRole(c, team[1], "driver", LATER);
    takeRole(c, team[2], "safecracker", LATER);
    runHeist(c, boss, { driver: team[1], safecracker: team[2] }, null, LATER, always(0.99));
    expect(team[1].jailUntil).toBeGreaterThan(LATER);
    expect(team[2].dirty ?? 0).toBe(0);
  });
});

describe("the first day", () => {
  it("steps are detected from what you did, claimed once, with a bonus at the end", () => {
    const p = mk("p", "Pat");
    expect(tutorialView(p)?.every((s) => !s.claimed)).toBe(true);
    expect(() => claimTutorial(p, "job")).toThrow(/Not done/);
    applyAction(p, { type: "job", jobId: "cans" }, LATER, always(0.5));
    claimTutorial(p, "job");
    expect(p.flags).toContain("tut:job");
    expect(() => claimTutorial(p, "job")).toThrow(/Already/);
  });
});
