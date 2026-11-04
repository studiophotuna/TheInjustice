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
const allRegulars = (now: number) => ROSTER.varrow.map((d) => makeRegular("varrow", d.key, now));

describe("street regulars", () => {
  it("every city has ten, with unique ids, and they're never protected newcomers", () => {
    for (const list of Object.values(ROSTER)) {
      expect(list).toHaveLength(10);
      expect(new Set(list.map((d) => d.key)).size).toBe(10);
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
    expect(regularsOut(regs, 3, LATER, none).length).toBeLessThanOrEqual(3);
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
