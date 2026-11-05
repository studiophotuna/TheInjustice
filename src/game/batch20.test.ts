import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { meritNeeded } from "./content/paths";
import { DISPOSAL, dispose, disposalView, promoProgress, SERVICE } from "./daily_life";
import { applyAction, createPlayer, tick } from "./engine";
import type { CaseFile, Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = () => {
  const p = createPlayer("p", "Pia", T0);
  tick(p, LATER);
  p.energy = 100;
  return p;
};

describe("promotion progress", () => {
  it("shows the share of the work done, and says when stats are the hold-up", () => {
    const p = mk();
    p.path = "police";
    p.rank = 2;
    p.jobsSinceRank = meritNeeded("police", 2) / 2;
    const pr = promoProgress(p, 1)!;
    expect(pr.work).toBe(50);
    expect(pr.next).toBeTruthy();
    expect(pr.statsReady).toBe(false);
    expect(pr.statsHint).toMatch(/still need to grow/);
    expect(promoProgress(mk(), 1)).toBeNull();
  });
});

describe("community service", () => {
  it("costs energy, pays nothing, cools heat and mends the conscience; counts toward getting out", () => {
    const p = mk();
    p.heat = 20;
    p.stats.integrity = -10;
    p.exiting = { at: LATER, jobs: 0 };
    p.path = "enforcer";
    p.rank = 1;
    const cash = p.cash;
    applyAction(p, { type: "community_service", task: "park" }, LATER, always(0.5));
    expect(p.cash).toBe(cash);
    expect(p.energy).toBe(100 - SERVICE.energy);
    expect(p.heat).toBeLessThan(20);
    expect(p.stats.integrity).toBe(-10 + SERVICE.integrity);
    expect(p.exiting.jobs).toBe(1);
    expect(() => applyAction(p, { type: "community_service", task: "nope" }, LATER, always(0.5))).toThrow();
  });
});

describe("bank statement", () => {
  it("records each action's money under a label, and anything else as street business", () => {
    const p = mk();
    p.cash = 100;
    tick(p, LATER + 1);
    applyAction(p, { type: "bank", op: "open" }, LATER + 2, always(0.5));
    expect(p.ledger?.[0].label).toBe("Bank");
    // Robbed between actions: shows up as street business on the next update.
    p.cash -= 30;
    tick(p, LATER + 3);
    expect(p.ledger?.[0].label).toMatch(/On the street/);
    expect(p.ledger?.[0].cash).toBe(-30);
  });
});

describe("after a hit", () => {
  const caseFile = (): CaseFile =>
    ({
      id: "C1", country: "varrow", district: "Iron Row", kind: "murder", at: LATER, victimId: "v", victimName: "Vic", amount: 0, culpritId: "p",
      suspect: { build: "heavy", height: "tall", clothes: "coat", crew: null } as never,
      tips: [
        { id: "C1-1", source: "bystander", trait: "build", value: "heavy", text: "", at: LATER } as never,
        { id: "C1-2", source: "witness", trait: "height", value: "tall", text: "", at: LATER, byId: "w" } as never,
      ],
      witnesses: [], investigatedBy: [],
    }) as CaseFile;
  const withBody = (): Player => {
    const p = mk();
    p.cash = 10_000;
    p.disposal = { caseId: "C1", targetName: "Vic", until: LATER + DISPOSAL.ttlMs };
    return p;
  };

  it("the funeral parlour leaves only what witnesses saw", () => {
    const p = withBody();
    const c = caseFile();
    expect(disposalView(p, LATER)?.options).toHaveLength(3);
    dispose(p, c, "parlour", LATER, always(0.5));
    expect(c.tips.map((t) => t.source)).toEqual(["witness"]);
    expect(p.cash).toBe(10_000 - DISPOSAL.parlour.cost);
    expect(p.disposal).toBeNull();
  });

  it("leaving the body hands forensics a clue and draws heat", () => {
    const p = withBody();
    const c = caseFile();
    const heat = p.heat;
    dispose(p, c, "leave", LATER, always(0.5));
    expect(c.tips).toHaveLength(3);
    expect(p.heat).toBe(heat + DISPOSAL.leave.heat);
  });

  it("can't be decided after the moment passes", () => {
    const p = withBody();
    expect(() => dispose(p, caseFile(), "sea", LATER + DISPOSAL.ttlMs + 1, always(0.5))).toThrow(/too late/);
  });
});
