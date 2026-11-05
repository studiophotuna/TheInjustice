import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { HOME_JOB, homeJobBlock, runHomeJob, stealCar } from "./breakin";
import { planHeist } from "./heist";
import { decideTrial } from "./justice";
import type { Crew, Player } from "./types";
import { parseAction } from "../server/actions";
import { CAREER } from "./career";
import { PATHS } from "./content/paths";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const ctx = (witnesses: Player[] = []) => ({ caseId: "C9", district: "Iron Row", crewTag: "KZ", witnesses });
const mk = (id: string): Player => {
  const p = createPlayer(id, id.toUpperCase(), T0, "varrow");
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.seenAt = NOW - 60 * 60_000;
  for (const k of Object.keys(p.stats) as (keyof typeof p.stats)[]) p.stats[k] = 400;
  return p;
};

describe("stolen car recovery", () => {
  const stolen = () => {
    const owner = mk("vic");
    owner.cash = 50_000;
    applyAction(owner, { type: "car_buy", model: "sedan" }, NOW, always(0.5));
    const thief = mk("ana");
    const { caseFile } = stealCar(thief, owner, owner.garage![0].id, NOW, always(0), ctx());
    caseFile!.trial = { suspectId: thief.id, suspectName: thief.name, officerId: "cop", officerName: "Cop", at: NOW, deadline: NOW, evidence: 1 };
    return { owner, thief, c: caseFile! };
  };

  it("a guilty verdict gives the car itself back, not money", () => {
    const { owner, thief, c } = stolen();
    thief.cash = 99_000;
    expect(owner.garage).toHaveLength(0);
    decideTrial(c, { suspect: thief, victim: owner, officer: null, prosecutor: null, defender: null, culprit: thief, bailPayer: null }, { judge: null }, NOW + 1, always(0));
    expect(c.trial?.verdict).toBe("guilty");
    expect(thief.garage).toHaveLength(0);
    expect(owner.garage).toHaveLength(1);
    expect(owner.garage![0].hot).toBeUndefined();
    expect(thief.cash).toBe(99_000);
    expect(owner.inbox?.[0].text).toMatch(/is back/);
  });

  it("if the car is gone, the owner gets its value instead", () => {
    const { owner, thief, c } = stolen();
    thief.garage = [];
    thief.cash = 99_000;
    decideTrial(c, { suspect: thief, victim: owner, officer: null, prosecutor: null, defender: null, culprit: thief, bailPayer: null }, { judge: null }, NOW + 1, always(0));
    expect(c.trial?.restitution).toBe(c.amount);
  });

  it("a checkpoint impound queues the car to go back to its owner", () => {
    const { thief } = stolen();
    thief.cash = 5_000;
    applyAction(thief, { type: "drive", to: "solmarra", carId: thief.garage![0].id }, NOW + 1, always(0));
    tick(thief, thief.travel!.arriveAt + 1);
    expect(thief.impounded?.ownerId).toBe("vic");
    expect(thief.impounded?.car.hot).toBeUndefined();
  });
});

describe("crew home jobs", () => {
  const setup = () => {
    const boss = mk("boss");
    const crack = mk("crack");
    const wheel = mk("wheel");
    const crew = { id: "k", tag: "KZ", name: "Kz", leaderId: boss.id, members: [boss, crack, wheel].map((m) => ({ id: m.id, name: m.name })), log: [], vault: 0 } as unknown as Crew;
    const mark = mk("mark");
    mark.housing = 5;
    mark.homes = { varrow: 5 };
    mark.stash = { varrow: { cash: 100_000, dirty: 200_000, drugs: { powder: 40 } } };
    return { boss, crack, wheel, crew, mark };
  };

  it("only big places are worth a crew, and only the leader plans", () => {
    const { boss, crack, crew, mark } = setup();
    expect(homeJobBlock(crew, boss, mark, NOW)).toBeNull();
    expect(homeJobBlock(crew, crack, mark, NOW)).toMatch(/leader/);
    mark.housing = 2;
    mark.homes = { varrow: 2 };
    expect(homeJobBlock(crew, boss, mark, NOW)).toMatch(/isn't worth a crew/);
  });

  it("a clean job splits most of the stash and opens a case on the safecracker", () => {
    const { boss, crack, wheel, crew, mark } = setup();
    planHeist(crew, boss, NOW, { id: mark.id, name: mark.name, home: "Penthouse" });
    const out = runHomeJob(crew, boss, { driver: wheel, safecracker: crack, lookout: boss }, mark, NOW, always(0), ctx());
    const take = Math.floor(100_000 * HOME_JOB.share[0]) + Math.floor(200_000 * HOME_JOB.share[0]);
    expect(out.caseFile?.culpritId).toBe(crack.id);
    expect(out.caseFile?.amount).toBe(take);
    expect(boss.dirty).toBe(Math.floor(take / 3));
    expect(crack.drugs?.powder).toBe(Math.floor(40 * HOME_JOB.share[0]));
    expect(mark.stash?.varrow?.dirty).toBe(200_000 - Math.floor(200_000 * HOME_JOB.share[0]));
    expect(crew.heist).toBeNull();
  });

  it("no getaway driver: everyone is caught and nothing is taken", () => {
    const { boss, crack, wheel, crew, mark } = setup();
    planHeist(crew, boss, NOW, { id: mark.id, name: mark.name, home: "Penthouse" });
    const out = runHomeJob(crew, boss, { driver: wheel, safecracker: crack }, mark, NOW, always(0.999), ctx());
    expect(out.caseFile).toBeNull();
    expect(wheel.jailUntil).toBeGreaterThan(NOW);
    expect(mark.stash?.varrow?.dirty).toBe(200_000);
  });
});

describe("career offers", () => {
  it("every career, military included, can be accepted or turned down", () => {
    for (const path of Object.keys(PATHS)) {
      expect(parseAction({ type: "offer", path, accept: true })).toMatchObject({ type: "offer", path, accept: true });
    }
  });

  it("no new offers arrive during the break after leaving a career", () => {
    const ready = (p: Player) => {
      // Qualifies for the police: a decent home, a clean record, night-shift experience.
      p.housing = 2;
      p.jobCounts.security = 10;
      return p;
    };
    const work = (p: Player, at: number) => {
      for (let i = 0; i < 3; i++) applyAction(p, { type: "job", jobId: "cans" }, at + i, always(0.5));
    };
    // Strong enough to qualify for careers: offers arrive...
    const free = ready(mk("free"));
    work(free, NOW);
    expect(free.offers.length).toBeGreaterThan(0);
    // ...but not during the break after leaving one.
    const p = ready(mk("pia"));
    p.careerChangeAt = NOW;
    work(p, NOW);
    expect(p.offers).toEqual([]);
    // Once the break is over, they come.
    work(p, NOW + CAREER.gapMs + 1);
    expect(p.offers.length).toBeGreaterThan(0);
  });
});
