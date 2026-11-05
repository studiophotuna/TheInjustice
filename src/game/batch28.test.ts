import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { payOfficer, searchingOfficers, setPrice, startShift } from "./customs";
import { audit, isOfficial } from "./racket";
import { INSIDE, paroleBlock, standingOf } from "./prisonlife";
import { prisonWork, yardFight } from "./prison";
import { buyFront, collectFront, crewCap, FRONTS, launderAtFront } from "./fronts";
import type { Crew, Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string): Player => {
  const p = createPlayer(id, id.toUpperCase(), T0, "varrow");
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.cash = 50_000;
  return p;
};

describe("customs bribes", () => {
  const setup = () => {
    const c = newCity("varrow", NOW);
    const o = mk("officer");
    o.path = "police";
    o.rank = 2;
    startShift(c, o, NOW);
    const s = mk("smuggler");
    s.dirty = 5_000;
    return { c, o, s };
  };

  it("an officer names a price; paying it takes them out of your search", () => {
    const { c, o, s } = setup();
    expect(() => payOfficer(c, s, o, NOW)).toThrow(/isn't taking/);
    setPrice(c, o, 800, NOW);
    expect(searchingOfficers(c, NOW, s.id)).toHaveLength(1);
    payOfficer(c, s, o, NOW);
    expect(s.dirty).toBe(4_200);
    expect(o.dirty).toBe(800);
    expect(searchingOfficers(c, NOW, s.id)).toHaveLength(0);
    expect(() => payOfficer(c, s, o, NOW)).toThrow(/already paid/);
  });

  it("other officers on duty still search you", () => {
    const { c, o, s } = setup();
    const honest = mk("honest");
    honest.path = "military";
    honest.rank = 2;
    startShift(c, honest, NOW);
    setPrice(c, o, 500, NOW);
    payOfficer(c, s, o, NOW);
    expect(searchingOfficers(c, NOW, s.id).map((x) => x.id)).toEqual([honest.id]);
  });

  it("internal affairs can find the envelopes, even on a rank-2 soldier", () => {
    const { c, o, s } = setup();
    o.path = "military";
    setPrice(c, o, 500, NOW);
    payOfficer(c, s, o, NOW);
    expect(isOfficial(o)).toBe(true);
    const ia = mk("ia");
    ia.path = "police";
    ia.rank = 8;
    const out = audit(ia, o, [], NOW);
    expect(out.events[0].text).toMatch(/bribes at the checkpoint/);
    expect(o.customsTake?.every((x) => x.exposed)).toBe(true);
  });
});

describe("life inside", () => {
  const inmate = (id: string) => {
    const p = mk(id);
    p.jailUntil = NOW + 60 * 60_000;
    p.jailReason = "Serving time.";
    return p;
  };

  it("prison shifts earn respect and count toward parole", () => {
    const p = inmate("aa");
    expect(paroleBlock(p, NOW)).toMatch(/prison shifts/);
    prisonWork(p, NOW, always(0.5));
    prisonWork(p, NOW + 1, always(0.5));
    expect(p.inside?.work).toBe(2);
    expect(standingOf(p).respect).toBe(2 * INSIDE.respect.work);
    expect(paroleBlock(p, NOW + 2)).toBeNull();
  });

  it("a parole hearing can let you out early, once per sentence", () => {
    const p = inmate("aa");
    prisonWork(p, NOW, always(0.5));
    prisonWork(p, NOW + 1, always(0.5));
    applyAction(p, { type: "parole_hearing" }, NOW + 2, always(0));
    expect(p.jailUntil).toBe(NOW + 2);
    const q = inmate("bb");
    prisonWork(q, NOW, always(0.5));
    prisonWork(q, NOW + 1, always(0.5));
    applyAction(q, { type: "parole_hearing" }, NOW + 2, always(0.99));
    expect(q.jailUntil).toBeGreaterThan(NOW + 30 * 60_000);
    expect(() => applyAction(q, { type: "parole_hearing" }, NOW + 3, always(0))).toThrow(/already heard/);
  });

  it("a tunnel dug far enough gets you out, with every cop looking", () => {
    const p = inmate("aa");
    for (let i = 0; i < 6 && (p.jailUntil ?? 0) > NOW + i; i++) applyAction(p, { type: "tunnel_dig" }, NOW + i, always(0.5));
    expect(p.jailUntil).toBeLessThanOrEqual(NOW + 6);
    expect(p.heat).toBeGreaterThanOrEqual(INSIDE.tunnel.escapeHeat);
  });

  it("the guards can find the tunnel: it's filled in and time is added", () => {
    const p = inmate("aa");
    applyAction(p, { type: "tunnel_dig" }, NOW, always(0));
    expect(p.inside?.tunnel).toBe(0);
    expect(p.jailUntil).toBe(NOW + 60 * 60_000 + INSIDE.tunnel.foundExtraMs);
  });

  it("a fight puts parole off for a while", () => {
    const a = inmate("aa");
    const b = inmate("bb");
    prisonWork(a, NOW, always(0.5));
    prisonWork(a, NOW + 1, always(0.5));
    yardFight(a, b, NOW + 2, always(0.5));
    expect(paroleBlock(a, NOW + 3)).toMatch(/fight/);
  });
});

describe("crew fronts", () => {
  const crew = (vault: number): { c: Crew; boss: Player; soldier: Player } => {
    const boss = mk("boss");
    const soldier = mk("soldier");
    const c = { id: "k", tag: "KZ", name: "Kz", leaderId: boss.id, members: [boss, soldier].map((m) => ({ id: m.id, name: m.name })), log: [], vault } as unknown as Crew;
    return { c, boss, soldier };
  };

  it("bought from the vault, it makes room for more members", () => {
    const { c, boss } = crew(30_000);
    expect(crewCap(c)).toBe(BALANCE.crew.maxMembers);
    buyFront(c, boss, "laundromat", NOW);
    expect(c.vault).toBe(5_000);
    expect(crewCap(c)).toBe(BALANCE.crew.maxMembers + FRONTS.kinds.laundromat.slots);
    expect(() => buyFront(c, boss, "laundromat", NOW)).toThrow(/Trade up/);
  });

  it("earns for the vault, collected by the leader", () => {
    const { c, boss, soldier } = crew(30_000);
    buyFront(c, boss, "laundromat", NOW);
    expect(() => collectFront(c, soldier, NOW + 3_600_000)).toThrow(/leader/);
    collectFront(c, boss, NOW + 2 * 3_600_000);
    expect(c.vault).toBe(5_000 + 2 * FRONTS.kinds.laundromat.perHour);
  });

  it("members launder quietly, up to the daily limit; the fee goes to the vault", () => {
    const { c, boss, soldier } = crew(30_000);
    buyFront(c, boss, "laundromat", NOW);
    soldier.dirty = 3_000;
    launderAtFront(c, soldier, 1_000, NOW);
    expect(soldier.dirty).toBe(2_000);
    expect(soldier.cash).toBe(50_000 + 1_000 - 80);
    expect(c.vault).toBe(5_000 + 80);
    expect(soldier.launderFlag ?? null).toBeNull();
    expect(() => launderAtFront(c, soldier, 1_500, NOW)).toThrow(/only take \$1,000/);
  });

  it("trading up sells the old front for half", () => {
    const { c, boss } = crew(200_000);
    buyFront(c, boss, "laundromat", NOW);
    buyFront(c, boss, "trattoria", NOW);
    expect(c.vault).toBe(200_000 - 25_000 - (75_000 - 12_500));
    expect(c.front?.kind).toBe("trattoria");
  });
});
