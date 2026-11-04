import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { newCity } from "./city";
import { applyAction, createPlayer, tick } from "./engine";
import { family, familyGate } from "./family";
import { equippedId } from "./gear";
import { cancelHit, executeHit, HIT, hitCost, hitOdds, orderHit, reportThreat, scoutTarget, stakeOut } from "./hit";
import { addMember, attackBlock, createCrew } from "./social";
import { toView } from "./view";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};

function setup() {
  const boss = mk("b", "Boss Bea");
  boss.path = "enforcer";
  boss.rank = 5;
  boss.cash = BALANCE.crew.createCost;
  const crew = createCrew(boss, "crew-b", "Iron Row", "IRW", LATER);
  crew.vault = 200_000;
  const hitman = mk("h", "Hitman Hal");
  hitman.path = "enforcer";
  hitman.rank = 4;
  family(hitman).madeAt = LATER;
  addMember(crew, hitman, LATER);
  const target = mk("t", "Target Tom");
  target.path = "police";
  target.rank = 4;
  target.cash = 500;
  return { boss, crew, hitman, target, city: newCity("varrow", LATER) };
}

/** Orders the hit and cases the target three times, an hour apart. Returns when it's ready. */
function caseIt(s: ReturnType<typeof setup>) {
  orderHit(s.crew, s.boss, s.hitman, s.target, LATER);
  let t = LATER;
  for (let i = 0; i < HIT.scouts; i++) {
    t += HIT.scoutGapMs;
    s.hitman.energy = 100;
    scoutTarget(s.crew, s.hitman, s.target, t);
  }
  const ready = LATER + HIT.caseMs + 1;
  s.hitman.energy = 100;
  return ready;
}

describe("ordering a hit", () => {
  it("needs the leader, a made man, money in the vault, and a target who isn't too small", () => {
    const s = setup();
    const soldier = mk("x", "Soldier Sam");
    soldier.path = "enforcer";
    soldier.rank = 2;
    addMember(s.crew, soldier, LATER);
    expect(() => orderHit(s.crew, s.boss, soldier, s.target, LATER)).toThrow(/made man/);
    expect(() => orderHit(s.crew, s.hitman, s.hitman, s.target, LATER)).toThrow(/leader/);
    const nobody = mk("n", "Nobody Ned");
    expect(() => orderHit(s.crew, s.boss, s.hitman, nobody, LATER)).toThrow(/too small/);
    s.crew.vault = 100;
    expect(() => orderHit(s.crew, s.boss, s.hitman, s.target, LATER)).toThrow(/costs/);
    s.crew.vault = 200_000;
    orderHit(s.crew, s.boss, s.hitman, s.target, LATER);
    expect(s.crew.vault).toBe(200_000 - hitCost(s.target));
    expect(s.hitman.inbox?.[0].text).toMatch(/contract/);
    // One contract per target per week.
    cancelHit(s.crew, s.boss, LATER);
    expect(() => orderHit(s.crew, s.boss, s.hitman, s.target, LATER + 1)).toThrow(/this week/);
  });
});

describe("casing the target", () => {
  it("the target feels watched but never learns who; the hit waits for three scouting trips and twelve hours", () => {
    const s = setup();
    orderHit(s.crew, s.boss, s.hitman, s.target, LATER);
    expect(() => executeHit(s.crew, s.hitman, s.target, s.city, LATER + HIT.caseMs + 1, always(0.01), { caseId: "H1", crewTag: "IRW", witnesses: [] })).toThrow(/Case them/);
    scoutTarget(s.crew, s.hitman, s.target, LATER + HIT.scoutGapMs);
    expect(() => scoutTarget(s.crew, s.hitman, s.target, LATER + HIT.scoutGapMs + 1)).toThrow(/too often/);
    expect(s.target.inbox?.[0].text).not.toMatch(/Hal|Iron Row/);
    expect(toView(s.target, LATER + HIT.scoutGapMs).threat.watched).toBe(1);
  });
});

describe("the hit", () => {
  it("a kill: the target keeps the career, loses a rank, cash and gear, and spends hours in the morgue; a murder case opens", () => {
    const s = setup();
    s.target.cash = 2000;
    applyAction(s.target, { type: "buy", itemId: "vest" }, LATER, always(0.5));
    const ready = caseIt(s);
    const rolls = [0.5, 0.01, 0.01];
    const out = executeHit(s.crew, s.hitman, s.target, s.city, ready, () => rolls.shift() ?? 0.5, { caseId: "H1", crewTag: "IRW", witnesses: [] });
    expect(out.events[0].text).toMatch(/done/);
    expect(s.target.path).toBe("police");
    expect(s.target.rank).toBe(3);
    expect(s.target.cash).toBe(0);
    expect(equippedId(s.target, "armor")).toBeNull();
    expect(toView(s.target, ready).threat.morgueUntil).toBeGreaterThan(ready);
    expect(out.caseFile?.kind).toBe("murder");
    expect(s.city.log[0].text).toMatch(/Body found/);
    expect(s.hitman.dirty).toBeGreaterThan(0);
    // The family keeps the hitman out of sight, and the victim has a vendetta.
    expect(familyGate(s.hitman, 4)).toMatch(/out of sight/);
    s.hitman.immuneUntil = ready + 60 * 60_000;
    const after = ready + HIT.morgueMs + 1;
    tick(s.target, after);
    expect(attackBlock(s.target, s.hitman, after)).toBeNull();
  });

  it("a wounding pays half, and a botched hit leaves the target knowing the hitman's face", () => {
    const s = setup();
    const ready = caseIt(s);
    const rolls = [0.5, 0.01, 0.9];
    const out = executeHit(s.crew, s.hitman, s.target, s.city, ready, () => rolls.shift() ?? 0.5, { caseId: "H2", crewTag: "IRW", witnesses: [] });
    expect(out.caseFile?.kind).toBe("attempted_murder");
    expect(s.target.rank).toBe(4);
    expect(s.target.hospitalUntil).toBeGreaterThan(ready);

    const b = setup();
    const ready2 = caseIt(b);
    const res = executeHit(b.crew, b.hitman, b.target, b.city, ready2, always(0.99), { caseId: "H3", crewTag: "IRW", witnesses: [] });
    expect(res.caseFile).toBeNull();
    expect(b.target.inbox?.[0].text).toMatch(/Hitman Hal tried to kill you/);
  });

  it("bodyguards cut the odds, and lying low makes you impossible to find", () => {
    const s = setup();
    const bare = hitOdds(s.hitman, s.target, LATER);
    s.target.cash = 3000;
    applyAction(s.target, { type: "hire_bodyguards" }, LATER, always(0.5));
    expect(hitOdds(s.hitman, s.target, LATER)).toBeLessThan(bare);
    const ready = caseIt(s);
    s.target.cash = 1000;
    applyAction(s.target, { type: "lie_low" }, ready, always(0.5));
    expect(() => executeHit(s.crew, s.hitman, s.target, s.city, ready + 1, always(0.01), { caseId: "H4", crewTag: "IRW", witnesses: [] })).toThrow(/gone to ground/);
    expect(() => applyAction(s.target, { type: "job", jobId: "cans" }, ready + 2, always(0.5))).toThrow(/lying low/);
  });
});

describe("the police can stop it", () => {
  it("the target reports the threat, a detective stakes it out, and the hitman is arrested for conspiracy", () => {
    const s = setup();
    orderHit(s.crew, s.boss, s.hitman, s.target, LATER);
    scoutTarget(s.crew, s.hitman, s.target, LATER + HIT.scoutGapMs);
    reportThreat(s.city, s.target, LATER + HIT.scoutGapMs + 1);
    const det: Player = mk("d", "Det. Dana");
    det.path = "police";
    det.rank = 5;
    det.stats.perception = det.stats.wits = 900;
    const threatId = s.city.threats![0].id;
    const out = stakeOut(s.city, det, threatId, s.crew, s.hitman, s.target, LATER + 2 * HIT.scoutGapMs, always(0.1));
    expect(out[0].text).toMatch(/Conspiracy/);
    expect(s.crew.hit).toBeNull();
    expect(s.hitman.jailReason).toMatch(/conspiracy/);
    expect(s.target.inbox?.[0].text).toMatch(/threat is over/);
  });
});
