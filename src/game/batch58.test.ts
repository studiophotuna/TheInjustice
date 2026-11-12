import { describe, expect, it } from "vitest";
import { applyAction, createPlayer, hurtLimit, tick } from "./engine";
import { BALANCE } from "./balance";
import { ITEM_BY_ID } from "./content/items";
import { runHomeJob } from "./breakin";
import { alarmFee, alarmOdds, hireHacker, hireHackerBlock, planHeist } from "./heist";
import type { Crew, Player } from "./types";

// 7.18: a real Pharmacy, and hackers who cut alarms on crew jobs.

const NOW = Date.UTC(2027, 10, 1, 12);
const always = (v: number) => () => v;
const mk = (id: string): Player => {
  const p = createPlayer(id, `Test ${id}`, NOW - 30 * 86_400_000, "varrow");
  tick(p, NOW);
  p.energy = 100;
  p.cash = 10_000;
  return p;
};
const use = (p: Player, id: string, at = NOW) => {
  p.inventory[id] = (p.inventory[id] ?? 0) + 1;
  return applyAction(p, { type: "use", itemId: id }, at, always(0.5));
};

describe("the Pharmacy", () => {
  it("sells three things now, priced like real life", () => {
    const meds = Object.values(ITEM_BY_ID).filter((i) => i.kind === "medical");
    expect(meds.map((m) => m.id).sort()).toEqual(["bandage", "medkit", "painkillers"]);
    expect(ITEM_BY_ID.bandage.price).toBeLessThan(ITEM_BY_ID.medkit.price);
  });

  it("a bandage heals a little; only a medkit gets you out of the clinic early", () => {
    const p = mk("p");
    p.hp = 50;
    use(p, "bandage");
    expect(p.hp).toBe(65);
    p.hospitalUntil = NOW + 60 * 60_000;
    expect(() => use(p, "bandage", NOW + 1000)).toThrow(/medkit/);
    use(p, "medkit", NOW + 1000);
    expect(p.hospitalUntil).toBeLessThan(NOW + 40 * 60_000);
  });

  it("painkillers let you fight while badly hurt, for two hours, and heal nothing", () => {
    const p = mk("p");
    p.hp = 12;
    expect(hurtLimit(p, NOW)).toBe(BALANCE.hurt.limit);
    use(p, "painkillers");
    expect(p.hp).toBeLessThanOrEqual(13);
    expect(hurtLimit(p, NOW + 60_000)).toBe(BALANCE.hurt.numbed);
    expect(hurtLimit(p, NOW + 3 * 60 * 60_000)).toBe(BALANCE.hurt.limit);
  });
});

describe("a hacker for the alarm", () => {
  const setup = () => {
    const boss = mk("boss");
    boss.path = "enforcer";
    boss.dirty = 5_000;
    const crack = mk("crack");
    const wheel = mk("wheel");
    const crew = { id: "k", tag: "KZ", name: "Kz", leaderId: boss.id, members: [boss, crack, wheel].map((m) => ({ id: m.id, name: m.name })), log: [], vault: 0 } as unknown as Crew;
    const mark = mk("mark");
    mark.housing = 5;
    mark.homes = { varrow: 5 };
    mark.alarms = ["varrow"];
    mark.stash = { varrow: { cash: 100_000, dirty: 0, drugs: {} } };
    const hacker = mk("hack");
    hacker.path = "hacker";
    hacker.rank = 4;
    hacker.scrubService = { open: true, fee: 800, jobs: 0 };
    return { boss, crack, wheel, crew, mark, hacker };
  };
  const ctx = { caseId: "C9", district: "Iron Row", crewTag: "KZ", witnesses: [] as Player[] };

  it("only for a home job, only the leader, only a hacker taking clients", () => {
    const { boss, crack, crew, mark, hacker } = setup();
    expect(hireHackerBlock(crew, boss, hacker, NOW)).toMatch(/no home job/);
    planHeist(crew, boss, NOW, { id: mark.id, name: mark.name, home: "Penthouse" });
    expect(hireHackerBlock(crew, crack, hacker, NOW)).toMatch(/leader/);
    hacker.scrubService!.open = false;
    expect(hireHackerBlock(crew, boss, hacker, NOW)).toMatch(/not taking clients/);
    hacker.scrubService!.open = true;
    expect(hireHackerBlock(crew, boss, hacker, NOW)).toBeNull();
    // Paid up front, dirty money first; the hacker earns dirty money.
    hireHacker(crew, boss, hacker, NOW);
    expect(boss.dirty).toBe(5_000 - alarmFee(hacker));
    expect(hacker.dirty).toBe(800);
    expect(crew.heist?.hacker?.name).toBe(hacker.name);
    expect(hireHackerBlock(crew, boss, hacker, NOW)).toMatch(/already/);
  });

  it("better hackers are likelier to get it off", () => {
    expect(alarmOdds(5)).toBeGreaterThan(alarmOdds(3));
    expect(alarmOdds(8)).toBeLessThanOrEqual(0.9);
  });

  it("when the hacker gets the alarm off, the crew is told and no alarm camera is on the case", () => {
    const { boss, crack, wheel, crew, mark, hacker } = setup();
    planHeist(crew, boss, NOW, { id: mark.id, name: mark.name, home: "Penthouse" });
    hireHacker(crew, boss, hacker, NOW);
    const out = runHomeJob(crew, boss, { driver: wheel, safecracker: crack, lookout: boss }, mark, NOW, always(0), ctx);
    expect(out.events.some((e) => /kills the alarm/.test(e.text))).toBe(true);
    expect(JSON.stringify(out.caseFile ?? {})).not.toMatch(/alarm camera/i);
  });

  it("without a hacker, the alarm camera is on the case", () => {
    const { boss, crack, wheel, crew, mark } = setup();
    planHeist(crew, boss, NOW, { id: mark.id, name: mark.name, home: "Penthouse" });
    const out = runHomeJob(crew, boss, { driver: wheel, safecracker: crack, lookout: boss }, mark, NOW, always(0), ctx);
    expect(JSON.stringify(out.caseFile ?? {})).toMatch(/alarm camera/i);
  });
});
