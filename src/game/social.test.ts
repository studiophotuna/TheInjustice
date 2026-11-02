import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import {
  acceptJoin,
  attackBlock,
  attackPlayer,
  createCrew,
  depositToVault,
  leaveCrew,
  profileFor,
  requestJoin,
  vouchFor,
  withdrawFromVault,
} from "./social";
import { toView } from "./view";

const T0 = 1_700_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
function seeded(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pair = () => {
  const a = createPlayer("a", "Attacker", T0);
  const t = createPlayer("t", "Target", T0);
  tick(a, LATER);
  tick(t, LATER);
  return { a, t };
};

describe("player vs player", () => {
  it("protects newcomers, the weak, and repeat targets", () => {
    const a = createPlayer("a", "Attacker", T0);
    const t = createPlayer("t", "Target", T0);
    expect(attackBlock(a, t, T0 + 1000)).toMatch(/new in town/);
    tick(a, LATER);
    tick(t, LATER);
    expect(attackBlock(a, t, LATER)).toBeNull();
    a.reputation = 100;
    expect(attackBlock(a, t, LATER)).toMatch(/ruin your name/);
    a.reputation = 0;
    t.country = "solmarra";
    expect(attackBlock(a, t, LATER)).toMatch(/another country/);
  });

  it("the winner takes some cash on hand (never the bank) and the victim is told", () => {
    const { a, t } = pair();
    a.stats.strength = a.stats.toughness = a.stats.agility = 400;
    t.cash = 200;
    t.bank = 500;
    const { fight } = attackPlayer(a, t, LATER, seeded(4));
    expect(fight.won).toBe(true);
    expect(t.cash).toBe(180);
    expect(a.cash).toBe(20);
    expect(t.bank).toBe(500);
    expect(t.inbox?.[0].text).toMatch(/Attacker attacked you/);
    expect(t.inbox?.[0].fromId).toBe("a");
    expect(t.dead ?? null).toBeNull();
    expect(attackBlock(a, t, LATER + 1000)).toMatch(/cool down|hospital/);
  });

  it("losing an attack hurts the attacker and rewards the defender", () => {
    const { a, t } = pair();
    t.stats.strength = t.stats.toughness = t.stats.agility = 400;
    attackPlayer(a, t, LATER, seeded(2));
    expect(t.reputation).toBe(1);
    expect(t.inbox?.[0].text).toMatch(/fought them off/);
    expect(a.dead ?? null).toBeNull();
  });

  it("profiles never expose hidden stats", () => {
    const { a, t } = pair();
    t.stats.strength = 123.456;
    const prof = JSON.stringify(profileFor(a, t, LATER));
    expect(prof).not.toContain("123.456");
    expect(prof).not.toContain("stats");
    expect(prof).not.toContain("cash");
  });
});

describe("players vouching for players", () => {
  it("rank 5+ in a school career can vouch once a day; the school waives tuition", () => {
    const { a: v, t } = pair();
    v.path = "police";
    v.rank = 4;
    expect(() => vouchFor(v, t, LATER)).toThrow(/rank 5/);
    v.rank = 5;
    vouchFor(v, t, LATER);
    expect(t.vouches?.[0].by).toBe("Attacker");
    expect(() => vouchFor(v, createPlayer("z", "Zed", T0), LATER + 1)).toThrow(/one person a day/);

    t.reputation = 20;
    t.housing = 2; // address, but no bank account: not needed when vouched
    applyAction(t, { type: "apply", school: "grayhaven_academy" }, LATER, always(0.5));
    expect(t.application?.vouchedBy).toBe("Attacker");
    expect(t.application?.paid).toBe(0);
  });
});

describe("crews", () => {
  it("create, request, accept, share a vault, leave and hand over leadership", () => {
    const { a: boss, t: rookie } = pair();
    boss.cash = 600;
    const crew = createCrew(boss, "c1", "Night Shift", "NS", T0);
    expect(boss.cash).toBe(100);
    expect(boss.crewId).toBe("c1");
    requestJoin(crew, rookie, T0);
    expect(() => requestJoin(crew, rookie, T0)).toThrow(/already asked/);
    expect(() => acceptJoin(crew, rookie, rookie, T0)).toThrow(/leader/);
    acceptJoin(crew, boss, rookie, T0);
    expect(rookie.crewId).toBe("c1");
    expect(rookie.inbox?.[0].text).toMatch(/Welcome to Night Shift/);

    rookie.cash = 50;
    depositToVault(crew, rookie, 50, T0);
    expect(crew.vault).toBe(50);
    expect(() => withdrawFromVault(crew, rookie, 10, T0)).toThrow(/leader/);
    withdrawFromVault(crew, boss, 20, T0);
    expect(boss.cash).toBe(120);

    expect(leaveCrew(crew, boss, T0)).toBe(false);
    expect(crew.leaderId).toBe("t");
    expect(leaveCrew(crew, rookie, T0)).toBe(true);
  });

  it("crew members earn 5% more", () => {
    const solo = createPlayer("s", "Solo", T0);
    const crewed = createPlayer("c", "Crewed", T0);
    crewed.crewId = "c1";
    solo.reputation = crewed.reputation = 20;
    applyAction(solo, { type: "job", jobId: "warehouse" }, T0, always(0.99));
    applyAction(crewed, { type: "job", jobId: "warehouse" }, T0, always(0.99));
    expect(crewed.cash).toBeGreaterThan(solo.cash);
  });
});

describe("properties", () => {
  it("buy in the country you're in, collect income later, capped at a day", () => {
    const p = createPlayer("p", "Owner", T0);
    p.bank = 1000;
    expect(() => applyAction(p, { type: "buy_property", id: "beach_kiosk" }, T0, always(0.5))).toThrow(/in the country/);
    applyAction(p, { type: "buy_property", id: "laundromat" }, T0, always(0.5));
    expect(p.bank).toBe(100);
    expect(() => applyAction(p, { type: "collect_property", id: "laundromat" }, T0 + 1000, always(0.5))).toThrow(/Nothing/);
    applyAction(p, { type: "collect_property", id: "laundromat" }, T0 + 2 * 3_600_000, always(0.5));
    expect(p.bank).toBe(100 + 24);
    applyAction(p, { type: "collect_property", id: "laundromat" }, T0 + 100 * 3_600_000, always(0.5));
    expect(p.bank).toBe(124 + 12 * 24);
  });

  it("the inbox can be marked read", () => {
    const p = createPlayer("p", "Reader", T0);
    p.inbox = [{ id: "1", at: T0, text: "hi", tone: "info", read: false }];
    applyAction(p, { type: "read_inbox" }, T0, always(0.5));
    expect(p.inbox[0].read).toBe(true);
    expect(toView(p, T0)).toBeTruthy();
  });
});
