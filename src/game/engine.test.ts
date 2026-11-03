import { describe, expect, it } from "vitest";
import { BALANCE, maxEnergy } from "./balance";
import { resolveFight } from "./combat";
import { addMerit, applyAction, careerBonus, createPlayer, deathChance, jobMerit, practiceFalloff, tick } from "./engine";
import { sv } from "./stats";
import { JOB_BY_ID, JOBS } from "./content/jobs";
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
    // Reyes vouches; the Academy's commander still reviews the application.
    expect(p.application?.status).toBe("pending");
    expect(p.application?.paid).toBe(0);
    expect(p.path).toBeNull();
    tick(p, p.application!.decideAt);
    expect(p.application?.status).toBe("accepted");
    applyAction(p, { type: "enroll" }, p.tickAt, always(0.5));
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
    tick(p, p.application!.decideAt);
    applyAction(p, { type: "enroll" }, p.tickAt, always(0.5));
    expect(toView(p, p.tickAt).jobs.find((j) => j.id === "sort_files")?.locked).toBeNull();
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

describe("schools", () => {
  function applicant(): Player {
    const p = fresh();
    p.reputation = 25;
    p.housing = 2;
    p.hasBankAccount = true;
    p.bank = 1000;
    return p;
  }

  it("charge tuition from the bank and need basics first", () => {
    const p = fresh();
    expect(() => applyAction(p, { type: "apply", school: "grayhaven_academy" }, T0, always(0.5))).toThrow(/address/);
    const a = applicant();
    a.bank = 100;
    expect(() => applyAction(a, { type: "apply", school: "grayhaven_academy" }, T0, always(0.5))).toThrow(/Tuition/);
    a.bank = 1000;
    applyAction(a, { type: "apply", school: "grayhaven_academy" }, T0, always(0.5));
    expect(a.bank).toBe(600);
    expect(a.application?.status).toBe("pending");
    expect(() => applyAction(a, { type: "apply", school: "halloway_law" }, T0, always(0.5))).toThrow(/review/);
  });

  it("the dean rejects weak applicants with a vague reason and a partial refund", () => {
    const p = applicant();
    applyAction(p, { type: "apply", school: "halloway_law" }, T0, always(0.5));
    tick(p, p.application!.decideAt + 1);
    expect(p.application?.status).toBe("rejected");
    expect(p.application?.reason).toMatch(/sharper|more persuasive|more observant/);
    expect(p.bank).toBe(400 + 450);
    expect(() => applyAction(p, { type: "apply", school: "halloway_law" }, p.tickAt, always(0.5))).toThrow(/so soon/);
    applyAction(p, { type: "dismiss_application" }, p.tickAt, always(0.5));
    expect(p.application).toBeNull();
  });

  it("a vouch makes it free and lowers the bar, but the dean still decides", () => {
    const p = applicant();
    p.stats.toughness = p.stats.perception = p.stats.strength = 3; // value ~17: weak but close
    p.offers = ["police"];
    applyAction(p, { type: "apply", school: "grayhaven_academy" }, T0, always(0.5));
    expect(p.bank).toBe(1000);
    expect(p.application?.vouchedBy).toBe("Sgt. Dana Reyes");
    tick(p, p.application!.decideAt);
    expect(p.application?.status).toBe("accepted");
  });

  it("graduating is reaching rank 2, and careers go up to 8 ranks", () => {
    const p = applicant();
    p.path = "police";
    p.rank = 1;
    p.jobsSinceRank = 9;
    p.stats.toughness = p.stats.perception = p.stats.strength = 400;
    const ev = applyAction(p, { type: "job", jobId: "study_law" }, T0, always(0.5));
    expect(p.rank).toBe(2);
    expect(ev.some((e) => /Graduation day/.test(e.text))).toBe(true);
    // Work above your rank stays hidden until you get there.
    expect(toView(p, T0).jobs.find((j) => j.id === "city_agenda")).toBeUndefined();
    for (let r = 2; r < 8; r++) {
      p.jobsSinceRank = 100;
      p.energy = 100;
      applyAction(p, { type: "job", jobId: "walk_beat" }, T0, always(0.5));
    }
    expect(p.rank).toBe(8);
    expect(toView(p, T0).path?.rank).toBe("Commissioner");
    expect(toView(p, T0).jobs.find((j) => j.id === "city_agenda")?.locked).toBeNull();
  });

  it("promotion merit depends on how demanding the work is, and hints never show numbers", () => {
    const p = applicant();
    p.path = "police";
    p.rank = 6;
    const easy = JOB_BY_ID.walk_beat;
    const hard = JOBS.filter((j) => j.path === "police" && (j.minRank ?? 1) === 6)[0];
    expect(jobMerit(p, hard, true)).toBeGreaterThan(jobMerit(p, easy, true) * 3);
    expect(jobMerit(p, hard, false)).toBeLessThan(jobMerit(p, hard, true));
    for (let i = 0; i < 4; i++) {
      p.jobsSinceRank = i * 6;
      const hint = toView(p, T0).path?.promotion ?? "";
      expect(hint).not.toMatch(/\d/);
    }
  });

  it("joining a career and each promotion quietly boost that career's key stats", () => {
    const p = applicant();
    p.path = "police";
    p.rank = 1;
    const before = { t: sv(p, "toughness"), per: sv(p, "perception"), str: sv(p, "strength"), wits: sv(p, "wits") };
    careerBonus(p);
    expect(sv(p, "toughness")).toBeCloseTo(before.t + BALANCE.careerBonus.base, 5);
    expect(sv(p, "strength")).toBeCloseTo(before.str + BALANCE.careerBonus.base, 5);
    expect(sv(p, "wits")).toBe(before.wits); // not a police stat
    // Higher ranks give bigger boosts, and nothing about it shows up in the player's view.
    p.rank = 6;
    const t6 = sv(p, "toughness");
    careerBonus(p);
    expect(sv(p, "toughness") - t6).toBeCloseTo(BALANCE.careerBonus.base + 5 * BALANCE.careerBonus.perRank, 5);
    expect(JSON.stringify(toView(p, T0))).not.toMatch(/"stats"|toughness/);
  });

  it("repeating the same work teaches less, but rest restores it", () => {
    const p = applicant();
    const first = practiceFalloff(p, "cans", T0);
    for (let i = 0; i < 30; i++) practiceFalloff(p, "cans", T0);
    const tired = practiceFalloff(p, "cans", T0);
    const rested = practiceFalloff(p, "cans", T0 + 4 * BALANCE.practiceHalfLifeMs);
    expect(first).toBe(1);
    expect(tired).toBeLessThan(0.5);
    expect(rested).toBeGreaterThan(0.8);
  });

  it("casework earns merit in your own career only", () => {
    const p = applicant();
    p.path = "medicine";
    p.rank = 3;
    addMerit(p, "medicine", 2);
    addMerit(p, "police", 5);
    expect(p.jobsSinceRank).toBe(2);
  });

  it("street careers stay invitation-only", () => {
    const p = applicant();
    p.stats.strength = p.stats.nerve = 40;
    p.jobCounts["fight:win"] = 3;
    p.jobCounts.cans = 1;
    applyAction(p, { type: "job", jobId: "cans" }, T0, always(0.5));
    applyAction(p, { type: "offer", path: "enforcer", accept: true }, T0, always(0.5));
    expect(p.path).toBe("enforcer");
    expect(p.application ?? null).toBeNull();
  });
});

describe("countries and travel", () => {
  it("a new character can start in any country, with that country's districts and jobs", () => {
    const p = createPlayer("x", "Sol", T0, "solmarra");
    const v = toView(p, T0);
    expect(v.location.city).toBe("Port Solace");
    expect(v.districts.map((d) => d.id)).toEqual(["boardwalk", "casino_strip", "marina", "exchange"]);
    expect(v.jobs.some((j) => j.id === "cans")).toBe(false);
    applyAction(p, { type: "job", jobId: "beach_chairs" }, T0, always(0.5));
    expect(() => applyAction(p, { type: "job", jobId: "cans" }, T0, always(0.5))).toThrow(/another country/);
  });

  it("travel costs cash, takes time, blocks work, and moves you on arrival", () => {
    const p = fresh();
    p.cash = 500;
    applyAction(p, { type: "travel", to: "kestrova", mode: "train" }, T0, always(0.99));
    expect(p.cash).toBe(500 - toView(createPlayer("y", "Yy", T0), T0).countries.find((c) => c.id === "kestrova")!.routes.find((r) => r.mode === "train")!.cost);
    expect(() => applyAction(p, { type: "job", jobId: "cans" }, T0 + 1000, always(0.5))).toThrow(/on the road/);
    tick(p, p.travel!.arriveAt);
    expect(p.country).toBe("kestrova");
    expect(p.travel).toBeNull();
    expect(p.arrival?.to).toBe("kestrova");
    applyAction(p, { type: "ack_arrival" }, p.tickAt, always(0.5));
    expect(p.arrival).toBeNull();
    applyAction(p, { type: "job", jobId: "shovel_coal" }, p.tickAt, always(0.5));
  });

  it("buses can be ambushed by a road gang (revealed on arrival)", () => {
    const p = fresh();
    p.cash = 200;
    applyAction(p, { type: "travel", to: "solmarra", mode: "bus" }, T0, seeded(1));
    let tries = 1;
    while (p.travel?.incident?.kind !== "ambush" && tries < 50) {
      p.travel = null;
      p.cash = 200;
      applyAction(p, { type: "travel", to: "solmarra", mode: "bus" }, T0, seeded(++tries));
    }
    expect(p.travel?.incident?.kind).toBe("ambush");
    expect(toView(p, T0).arrival).toBeNull(); // still secret while travelling
    tick(p, p.travel!.arriveAt);
    expect(p.arrival?.incident?.fight).toBeDefined();
  });

  it("planes are safe for clean travellers but customs stops wanted ones", () => {
    const clean = fresh();
    clean.cash = 1000;
    applyAction(clean, { type: "travel", to: "meridian", mode: "plane" }, T0, always(0));
    expect(clean.travel?.incident).toBeNull();
    const wanted = fresh();
    wanted.cash = 1000;
    wanted.heat = 30;
    applyAction(wanted, { type: "travel", to: "meridian", mode: "plane" }, T0, always(0));
    expect(wanted.travel?.incident?.kind).toBe("customs");
    expect(wanted.travel!.arriveAt).toBeGreaterThan(clean.travel!.arriveAt);
  });

  it("schools must be applied to in person", () => {
    const p = fresh();
    p.reputation = 30;
    p.housing = 2;
    p.hasBankAccount = true;
    p.bank = 5000;
    expect(() => applyAction(p, { type: "apply", school: "halcyon_med" }, T0, always(0.5))).toThrow(/Travel there/);
    p.country = "meridian";
    applyAction(p, { type: "apply", school: "halcyon_med" }, T0, always(0.5));
    expect(p.bank).toBe(3500);
  });

  it("country laws change pay and heat", () => {
    const sol = createPlayer("s", "Sol", T0, "solmarra");
    const kes = createPlayer("k", "Kes", T0, "kestrova");
    sol.reputation = kes.reputation = 20;
    applyAction(sol, { type: "job", jobId: "shell_game" }, T0, always(0));
    applyAction(kes, { type: "job", jobId: "black_market" }, T0, always(0));
    expect(sol.heat).toBeCloseTo(4 * 0.6);
    expect(kes.heat).toBeCloseTo(5 * 1.6);
  });
});

describe("medicine", () => {
  it("Doc Mercy vouches at St. Brigid's, and medics heal faster", () => {
    const p = fresh();
    p.stats.wits = p.stats.perception = 40;
    p.jobCounts.clinic_volunteer = 4;
    applyAction(p, { type: "job", jobId: "clinic_volunteer" }, T0, always(0.5));
    expect(p.offers).toContain("medicine");
    applyAction(p, { type: "offer", path: "medicine", accept: true }, T0, always(0.5));
    expect(p.application?.school).toBe("st_brigids_med");
    tick(p, p.application!.decideAt);
    applyAction(p, { type: "enroll" }, p.tickAt, always(0.5));
    expect(p.path).toBe("medicine");
    expect(p.school).toBe("st_brigids_med");
    expect(toView(p, p.tickAt).path?.rank).toBe("Medical Student");

    // Hospital stays are halved for medics.
    p.reputation = 20;
    p.hp = 21;
    let stay = 0;
    for (let seed = 1; seed < 100 && !stay; seed++) {
      const q = structuredClone(p);
      applyAction(q, { type: "fight", npcId: "iron_foreman" }, T0 + 10, seeded(seed));
      if (q.hospitalUntil) stay = q.hospitalUntil - (T0 + 10);
    }
    expect(stay).toBeLessThanOrEqual(BALANCE.hp.hospitalMaxMs / 2);
  });
});

describe("housing per country", () => {
  it("each country has its own home, kept while you're away", () => {
    const p = fresh();
    p.cash = 1000;
    applyAction(p, { type: "buy", itemId: "room" }, T0, always(0.5));
    expect(p.housing).toBe(2);
    applyAction(p, { type: "travel", to: "solmarra", mode: "plane" }, T0, always(0.99));
    tick(p, p.travel!.arriveAt);
    expect(p.housing).toBe(0);
    expect(p.energy).toBeLessThanOrEqual(maxEnergy(0));
    expect(toView(p, p.tickAt).countries.find((c) => c.id === "varrow")?.home).toBe("Rented room");
    applyAction(p, { type: "buy", itemId: "sleeping_bag" }, p.tickAt, always(0.5));
    expect(p.housing).toBe(1);
    applyAction(p, { type: "travel", to: "varrow", mode: "plane" }, p.tickAt, always(0.99));
    tick(p, p.travel!.arriveAt);
    expect(p.housing).toBe(2);
    expect(p.homes?.solmarra).toBe(1);
  });

  it("old saves without homes keep their housing where they live", () => {
    const p = fresh();
    delete p.homes;
    p.housing = 2;
    tick(p, T0 + 1000);
    expect((p as Player).homes?.varrow).toBe(2);
  });
});

describe("banking", () => {
  it("Quell vouches at the Solace Institute; bankers earn interest", () => {
    const p = createPlayer("b", "Banker", T0, "solmarra");
    p.reputation = 15;
    p.stats.wits = p.stats.charisma = 40;
    p.jobCounts.count_cash = 4;
    applyAction(p, { type: "job", jobId: "count_cash" }, T0, always(0.5));
    expect(p.offers).toContain("banking");
    applyAction(p, { type: "offer", path: "banking", accept: true }, T0, always(0.5));
    tick(p, p.application!.decideAt);
    applyAction(p, { type: "enroll" }, p.tickAt, always(0.5));
    expect(p.path).toBe("banking");
    p.bank = 1000;
    tick(p, p.tickAt + 3_600_000);
    expect(p.bank).toBeGreaterThan(1000);
    expect(p.bank).toBeLessThanOrEqual(1050);
  });
});

describe("daily reward, contracts and gym", () => {
  it("daily reward builds a streak and can only be claimed once a day", () => {
    const p = fresh();
    tick(p, T0);
    applyAction(p, { type: "claim_daily" }, T0, always(0.5));
    expect(p.cash).toBe(15);
    expect(() => applyAction(p, { type: "claim_daily" }, T0 + 1000, always(0.5))).toThrow(/tomorrow/);
    applyAction(p, { type: "claim_daily" }, T0 + 86_400_000, always(0.5));
    expect(p.daily?.streak).toBe(2);
    expect(p.cash).toBe(15 + 30);
    applyAction(p, { type: "claim_daily" }, T0 + 4 * 86_400_000, always(0.5));
    expect(p.daily?.streak).toBe(1);
  });

  it("three contracts a day, the same all day, completed by playing", () => {
    const p = fresh();
    tick(p, T0);
    const first = p.daily!.contracts.map((c) => c.label);
    expect(first).toHaveLength(3);
    tick(p, T0 + 1000);
    expect(p.daily!.contracts.map((c) => c.label)).toEqual(first);
    for (const c of p.daily!.contracts) c.progress = c.target - 1;
    p.energy = 50;
    p.cash = 100;
    applyAction(p, { type: "job", jobId: "windshields" }, T0, always(0.5));
    applyAction(p, { type: "train", stat: "strength" }, T0, always(0.5));
    const done = p.daily!.contracts.filter((c) => c.progress >= c.target && c.kind !== "fights");
    expect(done.length).toBeGreaterThan(0);
    const before = p.cash;
    applyAction(p, { type: "claim_contract", id: done[0].id }, T0, always(0.5));
    expect(p.cash).toBeGreaterThan(before);
    expect(() => applyAction(p, { type: "claim_contract", id: done[0].id }, T0, always(0.5))).toThrow(/Already/);
  });

  it("the gym trains the stat you choose, for energy and a fee", () => {
    const p = fresh();
    p.cash = 20;
    applyAction(p, { type: "train", stat: "agility" }, T0, always(0.5));
    expect(p.stats.agility).toBeGreaterThan(2);
    expect(p.stats.strength).toBe(0);
    expect(p.cash).toBe(15);
    expect(p.energy).toBe(maxEnergy(0) - 10);
  });
});
