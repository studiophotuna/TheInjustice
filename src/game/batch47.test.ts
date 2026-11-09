import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { ITEM_BY_ID } from "./content/items";
import { LIFE, rankCap, regularShop, regularWant, regularWork } from "./reglife";
import { regularUpkeep, ROSTER } from "./regulars";
import { equippedId } from "./gear";
import type { Player } from "./types";

const NOW = Date.UTC(2027, 10, 1, 12);
const always = (v: number) => () => v;
const reg = (key: string): Player => {
  const def = ROSTER.solmarra.find((d) => d.key === key)!;
  const p = createPlayer(`reg-solmarra-${key}`, def.name, NOW - 90 * 86_400_000, "solmarra");
  p.path = def.path;
  p.rank = def.path ? def.rank : 0;
  p.regular = { country: "solmarra", key, slot: -1 };
  tick(p, NOW);
  p.energy = 100;
  return p;
};

describe("regulars work their careers", () => {
  it("a regular out on the street does a career job about once an hour and gets paid", () => {
    const p = reg("marisol");
    const cash = p.cash;
    expect(regularWork(p, NOW, always(0.2))).toMatch(/Marisol Cruz · /);
    expect(p.cash).toBeGreaterThan(cash);
    expect(regularWork(p, NOW + 1000, always(0.2))).toBeNull();
    expect(regularWork(p, NOW + LIFE.jobEveryMs, always(0.2))).not.toBeNull();
  });

  it("they rise slowly, never past their cap; heavies don't climb", () => {
    const p = reg("matteo");
    const cap = rankCap(p);
    expect(cap).toBe(Math.min(8, 1 + LIFE.climb));
    let t = NOW;
    for (let i = 0; i < 1000; i++) {
      t += LIFE.jobEveryMs;
      p.energy = 100;
      regularWork(p, t, always(0.2));
    }
    expect(p.rank).toBe(cap);
    expect(rankCap(reg("bruni"))).toBe(reg("bruni").rank);
  });

  it("they keep their money and their record between refills", () => {
    const p = reg("rico");
    p.cash = 900;
    p.heat = 30;
    regularUpkeep(p, NOW + 5 * 3_600_000);
    expect(p.cash).toBeGreaterThanOrEqual(900);
    expect(p.heat).toBe(30);
  });
});

describe("regulars shop", () => {
  it("they buy a weapon they can afford from their own city, and leave one on the shelf", () => {
    const c = newCity("solmarra", NOW);
    c.stock = { baseball_bat: 2, snub_pistol: 1 };
    const p = reg("rico");
    p.cash = 50_000;
    expect(regularWant(p, c, NOW)).toBe("baseball_bat");
    regularShop(p, c, NOW, always(0.5));
    expect(equippedId(p, "weapon")).toBe("baseball_bat");
    expect(c.stock.baseball_bat).toBe(1);
    // Now only one bat left: they won't take it.
    const q = reg("pia");
    q.cash = 50_000;
    expect(["baseball_bat", "snub_pistol"]).not.toContain(regularWant(q, c, NOW));
  });

  it("a shop's owner gets the sale", () => {
    const c = newCity("solmarra", NOW);
    c.stock = { vest: 3 };
    c.shops = { armor: { ownerId: "acct_o", ownerName: "Owner", markup: 1.2, since: NOW, till: 0, sales: 0, earned: 0, offers: [] } };
    const p = reg("rico");
    p.cash = 50_000;
    p.equipped = { weapon: "baseball_bat", armor: null };
    p.inventory.baseball_bat = 1;
    regularShop(p, c, NOW, always(0.5));
    expect(c.shops.armor!.sales).toBe(1);
    expect(c.shops.armor!.till).toBeGreaterThan(0);
  });

  it("hurt and broke regulars look after themselves first", () => {
    const p = reg("pia");
    p.cash = 500;
    p.hp = 20;
    expect(ITEM_BY_ID[regularWant(p, null, NOW)!].kind).toBe("medical");
  });
});
