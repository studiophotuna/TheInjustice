import { describe, expect, it } from "vitest";
import { applyAction, boostBlock, createPlayer, tick } from "./engine";
import { BALANCE } from "./balance";
import { ITEM_BY_ID } from "./content/items";
import { toView } from "./view";

// 7.15: quick boosts (coffee, energy drink) and a first-day second wind.

const NOW = Date.UTC(2027, 10, 1, 12);
const always = (v: number) => () => v;
const fresh = (at = NOW) => {
  const p = createPlayer("p", "Dana", at - BALANCE.secondWindMs - 1, "varrow");
  tick(p, at);
  p.cash = 1000;
  p.energy = 0;
  return p;
};
const drink = (p: ReturnType<typeof fresh>, id: string, at: number) => {
  p.inventory[id] = (p.inventory[id] ?? 0) + 1;
  return applyAction(p, { type: "use", itemId: id }, at, always(0.5));
};

describe("quick boosts", () => {
  it("coffee and energy drinks are cheap, give energy, and cost cash only", () => {
    expect(ITEM_BY_ID.coffee.boost && ITEM_BY_ID.energy_drink.boost).toBe(true);
    expect(ITEM_BY_ID.coffee.price).toBeLessThanOrEqual(10);
    expect(ITEM_BY_ID.energy_drink.energy).toBeGreaterThan(ITEM_BY_ID.coffee.energy!);
  });

  it("one boost every half hour, whichever you buy, and they don't wait on meals", () => {
    const p = fresh();
    p.fullUntil = NOW + 60 * 60_000; // just ate
    drink(p, "coffee", NOW);
    expect(p.energy).toBe(10);
    expect(() => drink(p, "energy_drink", NOW + 60_000)).toThrow(/Too soon/);
    drink(p, "energy_drink", NOW + BALANCE.boost.cooldownMs);
    // 10 from the coffee, 20 from the drink, plus half an hour of normal refill.
    expect(p.energy).toBeGreaterThanOrEqual(30);
    expect(p.energy).toBeLessThanOrEqual(30 + Math.ceil(BALANCE.boost.cooldownMs / BALANCE.energy.regenMs));
  });

  it("the energy drink costs a little health", () => {
    const p = fresh();
    const hp = p.hp;
    drink(p, "energy_drink", NOW);
    expect(p.hp).toBe(hp - 5);
  });

  it("six a day at most, so boosts add no more than 120 energy a day", () => {
    const p = fresh();
    let t = NOW - 11 * 60 * 60_000; // all on the same UTC day
    for (let i = 0; i < BALANCE.boost.perDay; i++) {
      drink(p, "coffee", t);
      t += BALANCE.boost.cooldownMs;
    }
    expect(boostBlock(p, t)).toMatch(/enough caffeine/);
    expect(BALANCE.boost.perDay * ITEM_BY_ID.energy_drink.energy!).toBeLessThanOrEqual(120);
    expect(toView(p, t).boostsLeft).toBe(0);
  });
});

describe("a second wind on day one", () => {
  it("a new character's first bar fills again once when it runs out", () => {
    const p = createPlayer("n", "Newcomer", NOW, "varrow");
    tick(p, NOW);
    let wind = 0;
    for (let i = 0; i < 40; i++) {
      try {
        const ev = applyAction(p, { type: "job", jobId: "cans" }, NOW + i * 1000, always(0.5));
        if (ev.some((e) => /Second wind/.test(e.text))) wind++;
      } catch {
        break;
      }
    }
    expect(wind).toBe(1);
    expect(p.flags).toContain("second_wind");
  });

  it("not for a character older than a day", () => {
    const p = fresh();
    p.energy = 6;
    const ev = applyAction(p, { type: "job", jobId: "cans" }, NOW, always(0.5));
    expect(ev.some((e) => /Second wind/.test(e.text))).toBe(false);
  });
});
