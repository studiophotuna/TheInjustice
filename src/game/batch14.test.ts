import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { CAREER, legacyPayBonus, veteranFactor } from "./career";
import { newCity } from "./city";
import { meritNeeded } from "./content/paths";
import { applyAction, createPlayer, tick } from "./engine";
import { family } from "./family";
import { claimSeat, collectStipend, SEATS, stepDown, usePower } from "./seats";
import { declareWar, claimTurf } from "./turf";
import { createCrew } from "./social";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const career = (p: Player, path: Player["path"], rank: number) => {
  p.path = path;
  p.rank = rank;
  return p;
};

describe("changing careers", () => {
  it("leaving keeps the stats, drops the rank and issued gear, and needs a day before the next career", () => {
    const p = career(mk("p", "Pia"), "police", 4);
    p.stats.toughness = 300;
    tick(p, LATER + 1);
    expect(p.inventory.service_pistol).toBe(1);
    applyAction(p, { type: "leave_career" }, LATER + 2, always(0.5));
    expect(p.path).toBeNull();
    expect(p.rank).toBe(0);
    expect(p.stats.toughness).toBe(300);
    expect(p.inventory.service_pistol).toBeUndefined();
    expect(p.careerHistory?.[0]).toMatchObject({ path: "police", rank: 4, title: "Detective", finished: false });
    // A new offer can't be accepted the same day.
    p.offers = ["enforcer"];
    expect(() => applyAction(p, { type: "offer", path: "enforcer", accept: true }, LATER + 3, always(0.5))).toThrow(/Give it/);
    applyAction(p, { type: "offer", path: "enforcer", accept: true }, LATER + CAREER.gapMs + 10, always(0.5));
    expect(p.path).toBe("enforcer");
  });

  it("a Don must leave the crew first, and loses made status on the way out", () => {
    const don = career(mk("d", "Don Dino"), "enforcer", 8);
    don.cash = BALANCE.crew.createCost;
    family(don).madeAt = LATER;
    createCrew(don, "c", "Iron Row", "IRW", LATER);
    // Nobody just walks out of the family: first get out, then get clean, then leave the crew.
    expect(() => applyAction(don, { type: "leave_career" }, LATER, always(0.5))).toThrow(/getting out/);
    applyAction(don, { type: "start_exit" }, LATER, always(0.5));
    expect(() => applyAction(don, { type: "leave_career" }, LATER, always(0.5))).toThrow(/Not clean yet/);
    don.exiting = { at: LATER, jobs: 40 };
    don.heat = 0;
    don.dirty = 0;
    don.stats.integrity = 0;
    expect(() => applyAction(don, { type: "leave_career" }, LATER, always(0.5))).toThrow(/walk away from the crew/);
    don.crewId = null;
    applyAction(don, { type: "leave_career" }, LATER, always(0.5));
    expect(don.family?.madeAt).toBeUndefined();
    // Finishing a career leaves a legacy.
    expect(don.legacy).toEqual(["enforcer"]);
    expect(legacyPayBonus(don)).toBeCloseTo(1 + CAREER.legacyPay);
  });

  it("veterans returning to an old career climb back twice as fast", () => {
    const p = mk("p", "Pia");
    p.careerHistory = [{ path: "police", rank: 5, title: "Sergeant", at: LATER, finished: false }];
    career(p, "police", 2);
    expect(veteranFactor(p)).toBe(CAREER.veteranMerit);
    p.stats.toughness = p.stats.perception = p.stats.strength = 2000;
    p.jobsSinceRank = meritNeeded("police", 2) * CAREER.veteranMerit;
    applyAction(p, { type: "job", jobId: "walk_beat" }, LATER, always(0.5));
    expect(p.rank).toBe(3);
    p.rank = 5;
    expect(veteranFactor(p)).toBe(1);
  });
});

describe("leadership seats", () => {
  it("rank 6+ claims an empty seat, collects a stipend, and can be challenged after the shield", () => {
    const c = newCity("varrow", LATER);
    c.treasury = 1000;
    const low = career(mk("l", "Low Lou"), "police", 5);
    expect(() => claimSeat(c, low, null, LATER, always(0.5))).toThrow(/Only/);
    const chief = career(mk("c", "Chief Cass"), "police", 6);
    claimSeat(c, chief, null, LATER, always(0.5));
    expect(c.seats?.police?.id).toBe(chief.id);
    collectStipend(c, chief, LATER);
    expect(chief.cash).toBeGreaterThanOrEqual(SEATS.stipend);
    expect(() => collectStipend(c, chief, LATER + 1)).toThrow(/once a day/);

    const rival = career(mk("r", "Rival Rae"), "police", 8);
    rival.stats.toughness = rival.stats.perception = rival.stats.strength = 2000;
    expect(() => claimSeat(c, rival, chief, LATER + 1, always(0.5))).toThrow(/settle in/);
    const later = LATER + SEATS.holderShieldMs + 1;
    claimSeat(c, rival, chief, later, always(0.5));
    expect(c.seats?.police?.id).toBe(rival.id);
    expect(chief.inbox?.[0].text).toMatch(/took your seat/);
    expect(() => claimSeat(c, chief, rival, later + SEATS.holderShieldMs + 1, always(0.5))).not.toThrow();
  });

  it("a holder who left the career loses the seat without a contest", () => {
    const c = newCity("varrow", LATER);
    const old = career(mk("o", "Old Olga"), "courts", 7);
    claimSeat(c, old, null, LATER, always(0.5));
    old.path = null;
    const next = career(mk("n", "Next Ned"), "courts", 6);
    claimSeat(c, next, old, LATER + 1, always(0.99));
    expect(c.seats?.courts?.id).toBe(next.id);
  });

  it("each seat has a daily power", () => {
    const c = newCity("varrow", LATER);
    // The Don's truce stops turf wars.
    const don = career(mk("d", "Don Dino"), "enforcer", 8);
    claimSeat(c, don, null, LATER, always(0.5));
    usePower(c, don, null, LATER);
    expect(() => usePower(c, don, null, LATER + 1)).toThrow(/Once a day/);
    const a = career(mk("a", "Alma"), "enforcer", 4);
    a.cash = BALANCE.crew.createCost;
    const crewA = createCrew(a, "ca", "Alma Crew", "ALM", LATER);
    crewA.vault = 50_000;
    claimTurf(c, crewA, a, "gutter", LATER);
    const b = career(mk("b", "Bruno"), "enforcer", 4);
    b.cash = BALANCE.crew.createCost;
    const crewB = createCrew(b, "cb", "Bruno Crew", "BRU", LATER);
    expect(() => declareWar(c, crewB, b, "gutter", LATER + 1)).toThrow(/truce/);

    // The Governor freezes dirty money.
    const gov = career(mk("g", "Gov Gil"), "banking", 6);
    claimSeat(c, gov, null, LATER, always(0.5));
    const crook = mk("x", "Crook Cal");
    crook.dirty = 1000;
    usePower(c, gov, crook, LATER);
    expect(() => applyAction(crook, { type: "launder", method: "laundromat", amount: 500 }, LATER + 1, always(0.5))).toThrow(/froze/);

    // The Chief Justice commutes a sentence.
    const cj = career(mk("j", "Justice Jo"), "courts", 6);
    claimSeat(c, cj, null, LATER, always(0.5));
    const con = mk("y", "Con Connie");
    con.jailUntil = LATER + 3_600_000;
    usePower(c, cj, con, LATER);
    expect(con.jailUntil).toBe(LATER);

    // Stepping down opens the seat.
    stepDown(c, cj, LATER);
    expect(c.seats?.courts).toBeUndefined();
  });
});
