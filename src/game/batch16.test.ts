import { describe, expect, it } from "vitest";
import { hireRegular, planAmbush, executeAmbush } from "./ambush";
import { BALANCE } from "./balance";
import { newCity } from "./city";
import { attackBlock, addMember, createCrew } from "./social";
import { createPlayer, tick } from "./engine";
import { ambientLines, chatLine, isRegularId, REGULAR_OPS, REGULARS, regularsOut, ROSTER, scheduledOut } from "./regulars";
import { claimTutorial, tutorialView } from "./tutorial";
import { makeRegular } from "@/server/regulars";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const allRegulars = (now: number) => ROSTER.varrow.filter((d) => !d.heavy).map((d) => makeRegular("varrow", d.key, now));

describe("street regulars", () => {
  it("every city has twenty, with unique ids, and they're never protected newcomers", () => {
    for (const list of Object.values(ROSTER)) {
      expect(list).toHaveLength(20);
      expect(new Set(list.map((d) => d.key)).size).toBe(20);
      expect(list.filter((d) => d.heavy)).toHaveLength(2);
    }
    const r = makeRegular("varrow", "dutch", LATER);
    expect(isRegularId(r.id)).toBe(true);
    expect(r.regular?.key).toBe("dutch");
    expect(r.path).toBe("enforcer");
    const a = mk("a", "Ann");
    expect(attackBlock(a, r, LATER)).toBeNull();
  });

  it("fill the street when it's quiet and fade out as real players arrive", () => {
    const regs = allRegulars(LATER);
    const none = (p: { id: string }) => !p.id;
    const quiet = regularsOut(regs, 0, LATER, none);
    expect(quiet.length).toBeGreaterThan(0);
    expect(quiet.length).toBeLessThanOrEqual(REGULARS.busyStreet);
    expect(quiet.every((r) => scheduledOut(ROSTER.varrow.find((d) => d.key === r.regular!.key)!, LATER))).toBe(true);
    expect(regularsOut(regs, 3, LATER, none).length).toBeLessThanOrEqual(REGULARS.busyStreet - 3);
    expect(regularsOut(regs, REGULARS.busyStreet, LATER, none)).toHaveLength(0);
    // Stable within the hour.
    expect(regularsOut(regs, 0, LATER + 1000, none).map((r) => r.id)).toEqual(quiet.map((r) => r.id));
  });

  it("carry only pocket money, refilled every few hours", () => {
    const r = makeRegular("varrow", "gus", LATER);
    expect(r.cash).toBeGreaterThanOrEqual(REGULARS.cashMin);
    expect(r.cash).toBeLessThanOrEqual(REGULARS.cashMax);
    r.cash = 0;
    tick(r, LATER + 60_000);
    expect(r.cash).toBe(0);
    tick(r, LATER + REGULARS.refillMs + 1);
    expect(r.cash).toBeGreaterThanOrEqual(REGULARS.cashMin);
  });

  it("only some actions may target them", () => {
    expect(REGULAR_OPS.has("attack")).toBe(true);
    expect(REGULAR_OPS.has("crime")).toBe(true);
    expect(REGULAR_OPS.has("hit_order")).toBe(false);
    expect(REGULAR_OPS.has("loan_offer")).toBe(false);
    expect(REGULAR_OPS.has("post_bounty")).toBe(false);
  });

  it("chat at most once in a while, and street lines name a district", () => {
    const regs = allRegulars(LATER);
    expect(chatLine(regs, LATER, LATER + 1000)).toBeNull();
    const line = chatLine(regs, 0, LATER);
    expect(line?.text.length).toBeGreaterThan(3);
    const amb = ambientLines(regs, ["The Gutter"], LATER);
    expect(amb.length).toBeGreaterThan(0);
    expect(amb[0].text).toContain("The Gutter");
  });

  it("can be hired for one ambush role and take an equal cut", () => {
    const boss = mk("b", "Boss Bea");
    boss.path = "enforcer";
    boss.rank = 5;
    boss.cash = BALANCE.crew.createCost;
    const crew = createCrew(boss, "c", "Iron Row", "IRW", LATER);
    const m = mk("m", "Mo");
    m.path = "enforcer";
    addMember(crew, m, LATER);
    const target = mk("t", "Tom");
    target.cash = 300;
    const driver = makeRegular("varrow", "lenny", LATER);
    const look = makeRegular("varrow", "sully", LATER);
    planAmbush(crew, boss, target, LATER);
    hireRegular(crew, boss, driver, "driver", LATER);
    expect(() => hireRegular(crew, boss, look, "lookout", LATER)).toThrow(/already hired/);
    expect(() => hireRegular(crew, m, look, "lookout", LATER)).toThrow();
    expect(crew.ambush?.driver?.hired).toBe(true);
    crew.ambush!.attackers.push({ id: boss.id, name: boss.name });
    for (const k of Object.keys(boss.stats) as (keyof typeof boss.stats)[]) if (k !== "integrity") boss.stats[k] = 3000;
    const res = executeAmbush(crew, boss, [boss], driver, null, target, newCity("varrow", LATER), LATER + 60_000, () => 0.3, { caseId: "X", crewTag: "IRW", backup: [], witnesses: [] });
    expect(res.caseFile).not.toBeNull();
    expect(driver.dirty).toBe(150);
  });
});

describe("first-day checklist", () => {
  it("hides at rank 2 unless rewards wait, and claims everything at once", () => {
    const p = mk("p", "Pia");
    p.jobCounts.cans = 1;
    p.fullUntil = LATER;
    expect(tutorialView(p)).not.toBeNull();
    p.rank = 2;
    expect(tutorialView(p)).not.toBeNull();
    const cash = p.cash;
    claimTutorial(p, "all");
    expect(p.cash).toBe(cash + 30);
    expect(tutorialView(p)).toBeNull();
    expect(() => claimTutorial(p, "all")).toThrow();
  });
});

describe("roster", () => {
  it("every regular in every city can actually be created", () => {
    for (const [country, list] of Object.entries(ROSTER)) for (const d of list) expect(() => makeRegular(country as "varrow", d.key, LATER)).not.toThrow();
  });
});

describe("regulars are fair game, and the heavies are worth it", () => {
  it("a top player can still fight and rob small regulars, but not small real players", () => {
    const top = mk("top", "Top Dog");
    top.reputation = 150;
    top.energy = 100;
    const gus = makeRegular("varrow", "gus", LATER);
    expect(attackBlock(top, gus, LATER)).toBeNull();
    const small = mk("s", "Small Fry");
    small.reputation = 10;
    expect(attackBlock(top, small, LATER)).toMatch(/small/);
  });

  it("regulars are about as strong as players of their rank; heavies are a step above", () => {
    const rosa = makeRegular("varrow", "rosa", LATER);
    const crowe = makeRegular("varrow", "crowe", LATER);
    expect(rosa.stats.perception).toBeLessThan(80);
    expect(crowe.stats.strength).toBeGreaterThan(250);
    expect(crowe.reputation).toBeGreaterThanOrEqual(150);
    expect(crowe.cash).toBeGreaterThanOrEqual(300);
  });

  it("heavies keep their hours even when the street is busy", () => {
    const all = ROSTER.varrow.map((d) => makeRegular("varrow", d.key, LATER));
    const hours = Array.from({ length: 24 }, (_, h) => LATER + h * 3_600_000);
    const seen = hours.flatMap((t) => regularsOut(all, 50, t, () => false).map((r) => r.regular!.key));
    expect(new Set(seen)).toEqual(new Set(["crowe", "webb"]));
  });

  it("old regulars are recalibrated on their next update", () => {
    const r = makeRegular("varrow", "dutch", LATER);
    r.stats.strength = 641;
    r.regular!.v = 1;
    tick(r, LATER + 1000);
    expect(r.stats.strength).toBeLessThan(200);
  });
});
