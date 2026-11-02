import { describe, expect, it } from "vitest";
import { BALANCE, maxEnergy } from "./balance";
import { resolveFight } from "./combat";
import { applyAction, createPlayer, deathChance, tick } from "./engine";
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

  it("knockouts send you to the clinic or, when badly outmatched, kill you", () => {
    let sawHospital = false;
    let sawDeath = false;
    for (let seed = 1; seed < 200 && !(sawHospital && sawDeath); seed++) {
      const p = fresh();
      p.reputation = 20;
      p.hp = 21;
      p.cash = 50;
      p.bank = 30;
      p.stats.strength = 100;
      applyAction(p, { type: "fight", npcId: "iron_foreman" }, T0, seeded(seed));
      if (p.dead) {
        sawDeath = true;
        expect(p.stats.strength).toBeCloseTo(50, 0);
        expect(p.cash).toBe(0);
        expect(p.bank).toBe(30);
        expect(() => applyAction(p, { type: "job", jobId: "cans" }, T0, seeded(1))).toThrow(/dead/);
      } else if (p.hospitalUntil > T0) {
        sawHospital = true;
        expect(p.assessmentReady).toBe(true);
        const ev = applyAction(p, { type: "assess" }, T0 + 1, seeded(3));
        expect(ev[0].text).toMatch(/Doc Mercy/);
        expect(() => applyAction(p, { type: "assess" }, T0 + 2, seeded(3))).toThrow();
      }
    }
    expect(sawHospital).toBe(true);
    expect(sawDeath).toBe(true);
  });

  it("only fights you were badly outmatched in can kill", () => {
    expect(deathChance(0.8)).toBe(0);
    expect(deathChance(1.1)).toBe(0);
    expect(deathChance(1.5)).toBeGreaterThan(0.3);
    expect(deathChance(5)).toBe(0.75);
  });
});

describe("death and rebirth", () => {
  function deadPlayer(): Player {
    const p = fresh();
    p.dead = { at: T0, cause: "Crooked Foreman" };
    p.deaths = 1;
    p.bank = 120;
    p.reputation = 21;
    p.housing = 2;
    p.path = "police";
    p.rank = 2;
    p.inventory = { knuckles: 1 };
    p.jobCounts = { cans: 40 };
    p.stats.strength = 40;
    return p;
  }

  it("keeps the name, bank and stats, and resets the rest", () => {
    const p = deadPlayer();
    const ev = applyAction(p, { type: "rebirth" }, T0 + 1000, always(0.5));
    expect(p.dead).toBeNull();
    expect(p.name).toBe("Rook");
    expect(p.bank).toBe(120);
    expect(p.stats.strength).toBe(40);
    expect(p.reputation).toBe(10);
    expect(p.housing).toBe(0);
    expect(p.path).toBeNull();
    expect(p.inventory).toEqual({});
    expect(p.jobCounts).toEqual({});
    expect(p.energy).toBe(maxEnergy(0));
    expect(ev.some((e) => /feel weak/.test(e.text))).toBe(true);
    applyAction(p, { type: "job", jobId: "cans" }, T0 + 2000, always(0.5));
  });

  it("can take a new name", () => {
    const p = deadPlayer();
    applyAction(p, { type: "rebirth", name: "Phoenix" }, T0, always(0.5));
    expect(p.name).toBe("Phoenix");
    expect(() => applyAction(p, { type: "rebirth" }, T0, always(0.5))).toThrow(/alive/);
  });

  it("shows death in the view without leaking stats", () => {
    const p = deadPlayer();
    const v = toView(p, T0);
    expect(v.dead?.cause).toBe("Crooked Foreman");
    expect(v.deaths).toBe(1);
    expect(JSON.stringify(v)).not.toContain('"stats"');
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

describe("courts and vigilante paths", () => {
  it("courts offer comes to a clean courthouse worker with sharp wits", () => {
    const p = fresh();
    p.reputation = 12;
    p.stats.wits = 40;
    p.stats.perception = 40;
    p.jobCounts.court_janitor = 4;
    applyAction(p, { type: "job", jobId: "court_runner" }, T0, always(0.5));
    expect(p.offers).toContain("courts");
    applyAction(p, { type: "offer", path: "courts", accept: true }, T0, always(0.5));
    expect(toView(p, T0).jobs.find((j) => j.id === "sort_files")?.locked).toBeNull();
  });

  it("vigilante offer needs a clean conscience", () => {
    const p = fresh();
    p.reputation = 12;
    p.stats.agility = 40;
    p.stats.nerve = 40;
    p.jobCounts.watch_walk = 4;
    p.stats.integrity = -20;
    applyAction(p, { type: "job", jobId: "watch_walk" }, T0, always(0.5));
    expect(p.offers).not.toContain("vigilante");
    p.stats.integrity = 5;
    applyAction(p, { type: "job", jobId: "watch_walk" }, T0, always(0.5));
    expect(p.offers).toContain("vigilante");
  });

  it("new districts unlock with reputation", () => {
    const p = fresh();
    expect(() => applyAction(p, { type: "job", jobId: "watch_walk" }, T0, always(0.5))).toThrow();
    p.reputation = 10;
    applyAction(p, { type: "job", jobId: "watch_walk" }, T0, always(0.5));
  });
});

describe("story chapters", () => {
  it("unlock on milestones, survive death, and can only be marked read once unlocked", () => {
    const p = fresh();
    expect(() => applyAction(p, { type: "flag", flag: "read:old_faces" }, T0, always(0.5))).toThrow();
    p.jobCounts.cans = 14;
    const ev = applyAction(p, { type: "job", jobId: "cans" }, T0, always(0.5));
    expect(ev.some((e) => e.action?.target === "story:old_faces")).toBe(true);
    expect(toView(p, T0).unreadChapter).toBe("old_faces");
    applyAction(p, { type: "flag", flag: "read:old_faces" }, T0, always(0.5));
    expect(toView(p, T0).unreadChapter).toBeNull();

    p.path = "courts";
    p.rank = 1;
    p.jobsSinceRank = 9;
    p.stats.wits = p.stats.charisma = p.stats.perception = 30;
    applyAction(p, { type: "job", jobId: "study_precedent" }, T0, always(0.5));
    expect(p.rank).toBe(2);
    expect(p.flags).toContain("story:courts_2");

    p.dead = { at: T0, cause: "x" };
    applyAction(p, { type: "rebirth" }, T0, always(0.5));
    expect(toView(p, T0).chapters.find((c) => c.id === "courts_2")?.unlocked).toBe(true);
  });
});
