import { describe, expect, it } from "vitest";
import { isRanged, resolveFight, type Fighter } from "./combat";
import { pickBeats } from "../components/cardfight";

// 8.6: fights record their moves for the card scene, and the moves never name any gear.

const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const F = (o: Partial<Fighter> = {}): Fighter => ({ strength: 20, toughness: 15, agility: 15, hp: 100, maxHp: 100, ...o });

describe("fight beats", () => {
  it("record every move and end where the fight ends", () => {
    for (let s = 1; s < 40; s++) {
      const res = resolveFight(F(), F({ hp: 80, block: 0.2 }), seeded(s));
      expect(res.beats.length).toBeGreaterThan(0);
      const last = res.beats[res.beats.length - 1];
      expect(last[3]).toBe(Math.max(0, Math.round(res.playerHp)));
      expect(res.start).toEqual([100, 80]);
      for (const b of res.beats) {
        expect(b).toHaveLength(5);
        expect([0, 1, 2, 3]).toContain(b[2]);
      }
    }
  });

  it("don't change who wins: same seed, same fight", () => {
    const a = resolveFight(F(), F({ strength: 30 }), seeded(7));
    const b = resolveFight(F(), F({ strength: 30 }), seeded(7));
    expect(a.won).toBe(b.won);
    expect(a.lines).toEqual(b.lines);
  });

  it("show shots for guns and strikes for everything else", () => {
    expect(isRanged("revolver")).toBe(true);
    expect(isRanged("army_lmg")).toBe(true);
    expect(isRanged("switchblade")).toBe(false);
    expect(isRanged(null)).toBe(false);
    const res = resolveFight(F({ ranged: true }), F(), seeded(3));
    expect(res.beats.filter((b) => b[0] === 0).every((b) => b[1] === 1)).toBe(true);
    expect(res.beats.filter((b) => b[0] === 1).every((b) => b[1] === 0)).toBe(true);
  });

  it("long fights are cut to eight moves, keeping the start and the end", () => {
    const beats = Array.from({ length: 20 }, (_, i) => [i % 2, 0, 0, 100 - i * 4, 100 - i * 5] as [0 | 1, 0, 0, number, number]);
    const picked = pickBeats(beats);
    expect(picked).toHaveLength(8);
    expect(picked[0]).toBe(beats[0]);
    expect(picked[7]).toBe(beats[19]);
  });
});
