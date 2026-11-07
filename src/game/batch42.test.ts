import { describe, expect, it } from "vitest";
import { applyAction, createPlayer } from "./engine";
import { CASINO, casinoView, handValue, playRoulette, playSeven, startTwentyOne, hit, stand, type RouletteBet, type SevenBet } from "./casino";
import type { Player } from "./types";

const NOW = Date.UTC(2027, 6, 1, 20);

function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gambler(): Player {
  const p = createPlayer("acct_gam", "Gambler", NOW - 30 * 86_400_000, "solmarra");
  p.cash = 1_000_000_000;
  return p;
}

/** Plays many rounds and returns cash back per dollar bet. */
function returnRate(play: (p: Player, now: number, rng: () => number) => void, rounds: number, seed: number) {
  const p = gambler();
  const rng = seeded(seed);
  const start = p.cash;
  let bet = 0;
  for (let i = 0; i < rounds; i++) {
    // A new day every so often, so the daily limit never bites.
    const now = NOW + Math.floor(i / 500) * 86_400_000;
    const before = p.casino && p.casino.day === Math.floor(now / 86_400_000) ? p.casino.wagered : 0;
    play(p, now, rng);
    bet += (p.casino?.wagered ?? 0) - before;
  }
  return (p.cash - start + bet) / bet;
}

describe("the casino", () => {
  it("only opens in Port Solace, for cash, within the limits", () => {
    const home = createPlayer("acct_c1", "Elsewhere", NOW, "varrow");
    home.cash = 1000;
    expect(() => applyAction(home, { type: "casino", game: "seven", bet: "under", stake: 100 }, NOW, Math.random)).toThrow(/Port Solace/);
    const p = gambler();
    expect(() => playSeven(p, "under", 5, NOW, Math.random)).toThrow(/Bets run/);
    expect(() => playSeven(p, "under", CASINO.maxBet + 1, NOW, Math.random)).toThrow(/Bets run/);
    p.cash = 50;
    expect(() => playSeven(p, "under", 100, NOW, Math.random)).toThrow(/cash/);
  });

  it("pays exactly what the table says", () => {
    const p = gambler();
    const c = p.cash;
    // Pocket 17 (black, odd, low).
    playRoulette(p, "number", 17, 100, NOW, () => 17 / 37 + 0.001);
    expect(p.cash).toBe(c + 3500);
    playRoulette(p, "red", undefined, 100, NOW, () => 17 / 37 + 0.001);
    expect(p.cash).toBe(c + 3400);
    // Two threes: a seven... no, 3+4. Dice 3 and 4 make 7.
    const c2 = p.cash;
    let i = 0;
    const rolls = [2.5 / 6, 3.5 / 6];
    playSeven(p, "seven", 100, NOW, () => rolls[i++]);
    expect(p.cash).toBe(c2 + 400);
  });

  it("the house keeps an edge on every bet over the long run", () => {
    const bets: RouletteBet[] = ["red", "odd", "high", "number"];
    for (const b of bets) {
      const r = returnRate((p, now, rng) => playRoulette(p, b, 7, 100, now, rng), 60_000, 11);
      expect(r, `roulette ${b}`).toBeLessThan(1);
    }
    for (const b of ["under", "over", "seven"] as SevenBet[]) {
      const r = returnRate((p, now, rng) => playSeven(p, b, 100, now, rng), 60_000, 23);
      expect(r, `seven ${b}`).toBeLessThan(0.9);
    }
    // Twenty-One played sensibly: hit to 17, then stand.
    const r = returnRate(
      (p, now, rng) => {
        startTwentyOne(p, 100, now, rng);
        while (p.casino?.hand && handValue(p.casino.hand.you).total < 17) hit(p, now, rng);
        if (p.casino?.hand) stand(p, now, rng);
      },
      60_000,
      5,
    );
    expect(r).toBeLessThan(1);
    expect(r).toBeGreaterThan(0.9);
  });

  it("hides the dealer's second card mid-hand and never shows chances", () => {
    const p = gambler();
    let n = 0;
    // You: 10, 6. Dealer: 9, 8. Nobody has 21.
    const seq = [9.5 / 13, 0, 5.5 / 13, 0, 8.5 / 13, 0, 7.5 / 13, 0];
    startTwentyOne(p, 100, NOW, () => seq[n++] ?? 0.5);
    const v = casinoView(p, NOW);
    expect(v.hand?.youTotal).toBe(16);
    expect(JSON.stringify(v)).not.toMatch(/chance|odds|percent/i);
    expect(Object.keys(v.hand!)).not.toContain("dealer");
  });

  it("taking a break keeps you out", () => {
    const p = gambler();
    applyAction(p, { type: "casino", game: "break", days: 1 }, NOW, Math.random);
    expect(() => playSeven(p, "under", 100, NOW + 1000, Math.random)).toThrow(/keep you out/);
    expect(() => playSeven(p, "under", 100, NOW + 2 * 86_400_000, Math.random)).not.toThrow();
  });

  it("stops at the daily limit", () => {
    const p = gambler();
    for (let i = 0; i < CASINO.dailyLimit / CASINO.maxBet; i++) playSeven(p, "under", CASINO.maxBet, NOW, Math.random);
    expect(() => playSeven(p, "under", CASINO.maxBet, NOW, Math.random)).toThrow(/tomorrow/);
  });
});
