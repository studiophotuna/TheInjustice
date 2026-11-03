import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { createPlayer, tick } from "./engine";
import { prisonWork, yardChannel, yardFight, yardFightBlock } from "./prison";

const T0 = 1_700_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;

const inmate = (id: string, name: string, minutes = 30) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  p.jailUntil = LATER + minutes * 60_000;
  p.jailReason = "Serving time.";
  return p;
};

describe("the prison yard", () => {
  it("inmates fight for respect; nobody dies and nobody goes to hospital", () => {
    const a = inmate("a", "Brick");
    const t = inmate("t", "Twig");
    a.stats.strength = a.stats.toughness = a.stats.agility = 400;
    const { fight } = yardFight(a, t, LATER, always(0.5));
    expect(fight.won).toBe(true);
    expect(a.reputation).toBe(BALANCE.yard.respect);
    expect(t.hp).toBeGreaterThanOrEqual(5);
    expect(t.hospitalUntil).toBe(0);
    expect(t.inbox![0].text).toMatch(/jumped you in the yard/);
    expect(yardFightBlock(a, t, LATER + 1000)).toMatch(/guards|beaten up/);
  });

  it("only people behind bars in the same country share a yard", () => {
    const a = inmate("a", "Brick");
    const free = createPlayer("f", "Free", T0);
    tick(free, LATER);
    expect(yardFightBlock(a, free, LATER)).toMatch(/not in your yard/);
    const abroad = inmate("x", "Abroad");
    abroad.country = "kestrova";
    expect(yardFightBlock(a, abroad, LATER)).toMatch(/not in your yard/);
    expect(yardChannel(a)).toBe("yard:varrow");
  });

  it("prison shifts pay a little and take time off a sentence (not off a wait for trial)", () => {
    const p = inmate("p", "Worker");
    const until = p.jailUntil!;
    prisonWork(p, LATER, always(0));
    expect(p.cash).toBe(BALANCE.yard.workPay[0]);
    expect(p.jailUntil).toBe(until - BALANCE.yard.goodBehaviorMs);
    const held = inmate("h", "Held");
    held.custodyCase = "C1";
    const heldUntil = held.jailUntil!;
    prisonWork(held, LATER, always(0));
    expect(held.jailUntil).toBe(heldUntil);
    const free = createPlayer("f", "Free", T0);
    tick(free, LATER);
    expect(() => prisonWork(free, LATER, always(0))).toThrow(/not behind bars/);
  });
});
