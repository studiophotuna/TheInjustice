import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { regularWork } from "./reglife";
import { ROSTER } from "./regulars";
import { shopPrice } from "./shops";
import type { Player } from "./types";

// 7.7: settings that have to reach where they're used.

const NOW = Date.UTC(2027, 10, 1, 12);
const always = (v: number) => () => v;
const reg = (key: string): Player => {
  const def = ROSTER.solmarra.find((d) => d.key === key)!;
  const p = createPlayer(`reg-solmarra-${key}`, def.name, NOW - 90 * 86_400_000, "solmarra");
  p.path = def.path;
  p.rank = def.path ? def.rank : 0;
  p.regular = { country: "solmarra", key, slot: -1, ateAt: NOW };
  tick(p, NOW);
  p.energy = 100;
  return p;
};

describe("the mayor's tax reaches regulars' pay", () => {
  it("a regular's job pay is taxed at the city's rate and the tax lands in the treasury", () => {
    const city = newCity("solmarra", NOW);
    city.taxRate = 0.2;
    const treasury = city.treasury;
    const taxed = reg("marisol");
    const free = reg("marisol");
    const before = taxed.cash;
    regularWork(taxed, NOW, always(0.5), city);
    regularWork(free, NOW, always(0.5));
    const gross = free.cash - before;
    const tax = Math.floor(gross * 0.2);
    expect(tax).toBeGreaterThan(0);
    expect(taxed.cash - before).toBe(gross - tax);
    expect(city.treasury - treasury).toBe(tax);
  });

  it("another city's rate doesn't apply", () => {
    const city = newCity("varrow", NOW);
    city.taxRate = 0.2;
    const treasury = city.treasury;
    regularWork(reg("marisol"), NOW, always(0.5), city);
    expect(city.treasury).toBe(treasury);
  });
});

describe("the owner's price level is the price on the shelf", () => {
  it("+50% on a $10 item is $15", () => {
    expect(shopPrice(10, 1.5)).toBe(15);
    expect(shopPrice(10, 0.8)).toBe(8);
  });
});
