import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { choosePromo, promoBoost, promoChoiceView } from "./career";
import { applyAction, createPlayer, tick } from "./engine";
import { launderOptions } from "./money";
import { careerWork, robberLead, specialtyUps, specTier, SPECIALTY, travelFactor } from "./specialties";
import { sv } from "./stats";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = () => {
  const p = createPlayer("p", "Pia", T0);
  tick(p, LATER);
  return p;
};

describe("specialties", () => {
  it("are earned from work in any career, including ones you've left", () => {
    const p = mk();
    p.jobCounts.walk_beat = 70;
    p.jobCounts.arrest = 10;
    expect(careerWork(p, "police")).toBe(70);
    expect(specTier(p, "private_eye")).toBe(1);
    // The career is long gone; the eye stays.
    p.path = "enforcer";
    expect(specTier(p, "private_eye")).toBe(1);
  });

  it("announce a new tier once", () => {
    const p = mk();
    p.jobCounts.trip = 6;
    const ev = specialtyUps(p);
    expect(ev[0].text).toMatch(/Globetrotter I/);
    expect(specialtyUps(p)).toEqual([]);
    expect(travelFactor(p)).toBeCloseTo(0.9);
  });

  it("a private eye works out more of the robber's name with each tier", () => {
    const p = mk();
    expect(robberLead(p, "Mercy")).toBeNull();
    p.jobCounts.walk_beat = 100;
    expect(robberLead(p, "Mercy")).toBe("M••••");
    p.jobCounts.walk_beat = 300;
    expect(robberLead(p, "Mercy")).toBe("Mer••");
    p.jobCounts.walk_beat = 700;
    expect(robberLead(p, "Mercy")).toBe("Mercy");
  });

  it("a combat medic patches up without a medkit, every half hour", () => {
    const p = mk();
    p.hp = 40;
    p.jobCounts.night_rounds = 40;
    expect(() => applyAction(p, { type: "field_dressing" }, LATER, always(0.5))).toThrow(/doctor and as a soldier/);
    p.jobCounts.boot_drills = 40;
    expect(specTier(p, "combat_medic")).toBe(1);
    applyAction(p, { type: "field_dressing" }, LATER, always(0.5));
    expect(p.hp).toBe(40 + SPECIALTY.dressingHp[0]);
    expect(() => applyAction(p, { type: "field_dressing" }, LATER + 60_000, always(0.5))).toThrow(/restocking/);
    // Half an hour later (natural healing has helped too), the kit is ready again.
    tick(p, LATER + SPECIALTY.dressingCooldownMs + 1);
    p.hp = 40;
    applyAction(p, { type: "field_dressing" }, LATER + SPECIALTY.dressingCooldownMs + 2, always(0.5));
    expect(p.hp).toBeCloseTo(40 + SPECIALTY.dressingHp[0], 2);
  });

  it("devil's advocate cuts a sentence once, never before the trial", () => {
    const p = mk();
    p.jobCounts.sort_files = 120;
    expect(specTier(p, "devils_advocate")).toBe(1);
    p.jailUntil = LATER + 60 * 60_000;
    p.custodyCase = "C1";
    expect(() => applyAction(p, { type: "argue_sentence" }, LATER, always(0.5))).toThrow(/trial/);
    p.custodyCase = null;
    applyAction(p, { type: "argue_sentence" }, LATER, always(0.5));
    expect(p.jailUntil).toBe(LATER + Math.round(60 * 60_000 * 0.7));
    expect(() => applyAction(p, { type: "argue_sentence" }, LATER + 1, always(0.5))).toThrow(/already/);
  });

  it("money on my mind makes laundering cheaper", () => {
    const p = mk();
    const before = launderOptions(p, LATER)[0].fee;
    p.jobCounts.mock_trading = 300;
    expect(specTier(p, "money_mind")).toBeGreaterThan(0);
    expect(launderOptions(p, LATER)[0].fee).toBeCloseTo(before * (1 - SPECIALTY.launderCut[specTier(p, "money_mind") - 1]));
  });
});

describe("promotion choices", () => {
  it("a promotion asks how the job changed you, and the answer strengthens two stats", () => {
    const p = mk();
    p.path = "police";
    p.rank = 3;
    p.promoChoice = { path: "police", rank: 3 };
    const v = promoChoiceView(p)!;
    expect(v.options.map((o) => o.label)).toEqual(["The beat", "The case"]);
    const before = sv(p, "perception");
    choosePromo(p, "b");
    expect(sv(p, "perception")).toBeCloseTo(before + promoBoost(3), 5);
    expect(p.promoChoice).toBeNull();
    expect(() => choosePromo(p, "a")).toThrow();
  });
});
