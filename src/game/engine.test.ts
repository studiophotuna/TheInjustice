import { describe, expect, it } from "vitest";
import { BALANCE, maxEnergy } from "./balance";
import { resolveFight } from "./combat";
import { applyAction, createPlayer, tick } from "./engine";
import { GameError, type Player } from "./types";
import { toView } from "./view";

const T0 = 1_700_000_000_000;

/** Small deterministic PRNG (mulberry32). */
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const always = (v: number) => () => v;

function fresh(): Player {
  return createPlayer("p1", "Rook", T0);
}

describe("new character", () => {
  it("starts as a bum with $0 and full energy", () => {
    const p = fresh();
    expect(p.cash).toBe(0);
    expect(p.bank).toBe(0);
    expect(p.housing).toBe(0);
    expect(p.energy).toBe(maxEnergy(0));
  });

  it("rejects bad names", () => {
    expect(() => createPlayer("x", "a", T0)).toThrow(GameError);
    expect(() => createPlayer("x", "<script>", T0)).toThrow(GameError);
  });
});

describe("hidden stats", () => {
  it("never appear as numbers in the public view", () => {
    const p = fresh();
    p.stats.strength = 123.456;
    p.stats.integrity = -42;
    const json = JSON.stringify(toView(p, T0));
    expect(json).not.toContain("123.456");
    expect(json).not.toContain("integrity");
    expect(json).not.toContain("\"stats\"");
    expect(json).not.toContain("strength\":");
  });

  it("grow from jobs and change the profile description", () => {
    const p = fresh();
    const before = toView(p, T0).feel.body;
    p.stats.strength = 200;
    p.stats.toughness = 200;
    expect(toView(p, T0).feel.body).not.toBe(before);
  });
});

describe("jobs", () => {
  it("cost energy and pay money", () => {
    const p = fresh();
    applyAction(p, { type: "job", jobId: "cans" }, T0, always(0.5));
    expect(p.energy).toBe(maxEnergy(0) - 4);
    expect(p.cash).toBeGreaterThan(0);
    expect(p.stats.toughness).toBeGreaterThan(0);
  });

  it("are refused when too tired", () => {
    const p = fresh();
    p.energy = 2;
    expect(() => applyAction(p, { type: "job", jobId: "cans" }, T0, always(0.5))).toThrow(/tired/);
  });

  it("are locked behind districts", () => {
    const p = fresh();
    expect(() => applyAction(p, { type: "job", jobId: "unload" }, T0, always(0.5))).toThrow(GameError);
    p.reputation = 5;
    applyAction(p, { type: "job", jobId: "unload" }, T0, always(0.5));
  });

  it("risky crimes can fail and raise heat", () => {
    const p = fresh();
    applyAction(p, { type: "job", jobId: "shoplift" }, T0, always(0.99));
    expect(p.cash).toBe(0);
    expect(p.heat).toBeGreaterThan(0);
  });

  it("give diminishing stat returns when repeated", () => {
    const p = fresh();
    const gain = () => {
      const s = p.stats.toughness;
      p.energy = 50;
      applyAction(p, { type: "job", jobId: "cans" }, T0, always(0.5));
      return p.stats.toughness - s;
    };
    const first = gain();
    for (let i = 0; i < 100; i++) gain();
    expect(gain()).toBeLessThan(first);
  });
});

describe("timers", () => {
  it("regenerate energy over time", () => {
    const p = fresh();
    p.energy = 0;
    tick(p, T0 + BALANCE.energy.regenMs * 5);
    expect(Math.floor(p.energy)).toBe(5);
  });

  it("food has a cooldown so it can't be chained", () => {
    const p = fresh();
    p.energy = 0;
    p.inventory.sandwich = 2;
    applyAction(p, { type: "use", itemId: "sandwich" }, T0, always(0.5));
    expect(p.energy).toBe(12);
    expect(() => applyAction(p, { type: "use", itemId: "sandwich" }, T0 + 1000, always(0.5))).toThrow(/full/);
  });

  it("hospital blocks jobs until discharge", () => {
    const p = fresh();
    p.hospitalUntil = T0 + 60_000;
    expect(() => applyAction(p, { type: "job", jobId: "cans" }, T0, always(0.5))).toThrow(/hospital/);
    applyAction(p, { type: "job", jobId: "cans" }, T0 + 61_000, always(0.5));
    expect(p.hp).toBe(BALANCE.hp.max);
  });
});

describe("bank", () => {
  it("protects money from muggings", () => {
    const p = fresh();
    p.cash = 100;
    applyAction(p, { type: "bank", op: "open" }, T0, always(0.5));
    applyAction(p, { type: "bank", op: "deposit", amount: 80 }, T0, always(0.5));
    expect(p.cash).toBe(0);
    expect(p.bank).toBe(80);
    expect(() => applyAction(p, { type: "bank", op: "withdraw", amount: 81 }, T0, always(0.5))).toThrow();
  });
});

describe("shop", () => {
  it("housing raises max energy", () => {
    const p = fresh();
    p.cash = 50;
    applyAction(p, { type: "buy", itemId: "sleeping_bag" }, T0, always(0.5));
    expect(p.housing).toBe(1);
    expect(toView(p, T0).maxEnergy).toBeGreaterThan(maxEnergy(0));
    expect(() => applyAction(p, { type: "buy", itemId: "sleeping_bag" }, T0, always(0.5))).toThrow();
  });
});

describe("combat", () => {
  it("a fresh player usually beats an Alley Rat but not the Foreman", () => {
    const rng = seeded(7);
    let ratWins = 0;
    let foremanWins = 0;
    for (let i = 0; i < 200; i++) {
      const me = { strength: 10, toughness: 10, agility: 10, hp: 100, maxHp: 100 };
      if (resolveFight(me, { strength: 8, toughness: 8, agility: 12, hp: 60, maxHp: 60 }, rng).won) ratWins++;
      if (resolveFight(me, { strength: 46, toughness: 42, agility: 28, hp: 140, maxHp: 140 }, rng).won)
        foremanWins++;
    }
    expect(ratWins).toBeGreaterThan(100);
    expect(foremanWins).toBeLessThan(10);
  });

  it("knockouts send you to the hospital and unlock Doc Mercy", () => {
    const p = fresh();
    p.reputation = 20;
    p.hp = 21;
    applyAction(p, { type: "fight", npcId: "iron_foreman" }, T0, seeded(3));
    expect(p.hospitalUntil).toBeGreaterThan(T0);
    expect(p.assessmentReady).toBe(true);
    const ev = applyAction(p, { type: "assess" }, T0 + 1, seeded(3));
    expect(ev[0].text).toMatch(/Doc Mercy/);
    expect(() => applyAction(p, { type: "assess" }, T0 + 2, seeded(3))).toThrow();
  });
});

describe("paths", () => {
  it("police offer appears for a clean night guard with a room, and unlocks police jobs", () => {
    const p = fresh();
    p.reputation = 20;
    p.housing = 2;
    p.stats.toughness = 40;
    p.stats.perception = 40;
    p.jobCounts.security = 3;
    const events = applyAction(p, { type: "job", jobId: "security" }, T0, always(0.5));
    expect(p.offers).toContain("police");
    expect(events.some((e) => e.action?.target === "offer:police")).toBe(true);

    applyAction(p, { type: "offer", path: "police", accept: true }, T0, always(0.5));
    expect(p.path).toBe("police");
    expect(p.rank).toBe(1);
    const jobs = toView(p, T0).jobs;
    expect(jobs.find((j) => j.id === "academy_drills")?.locked).toBeNull();
    expect(jobs.find((j) => j.id === "guard_game")).toBeUndefined();
  });

  it("promotes after enough jobs and stats", () => {
    const p = fresh();
    p.path = "police";
    p.rank = 1;
    p.housing = 2;
    p.stats.toughness = 30;
    p.stats.perception = 30;
    p.stats.strength = 30;
    p.jobsSinceRank = 9;
    applyAction(p, { type: "job", jobId: "study_law" }, T0, always(0.5));
    expect(p.rank).toBe(2);
  });

  it("dirty money lowers hidden integrity", () => {
    const p = fresh();
    p.path = "police";
    p.rank = 2;
    applyAction(p, { type: "job", jobId: "take_bribe" }, T0, always(0.5));
    expect(p.stats.integrity).toBeLessThan(0);
  });
});
