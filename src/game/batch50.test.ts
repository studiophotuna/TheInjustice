import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { advanceCity, newCity } from "./city";
import { ITEM_BY_ID, ITEMS } from "./content/items";
import { buyListing, fenceRestock, listBlock, listItem, MARKET, regularPick, sellerTake, unlistItem } from "./market";
import { GEAR_HOME, RARITY, rarityOf, rollShipment, stockCap } from "./stock";
import { BALANCE } from "./balance";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, country: "varrow" | "solmarra" = "varrow"): Player => {
  const p = createPlayer(id, id[0].toUpperCase() + id.slice(1), T0, country);
  tick(p, NOW);
  p.cash = 50_000;
  p.heat = 0;
  return p;
};

describe("rarity", () => {
  it("every weapon and armor has a rarity that sets its shelf size, never its strength", () => {
    const gear = ITEMS.filter((i) => GEAR_HOME[i.id]);
    for (const i of gear) expect(stockCap(i.id)).toBe(RARITY[rarityOf(i.id)].cap);
    expect(new Set(gear.map((i) => rarityOf(i.id))).size).toBe(3);
    expect(rarityOf("baseball_bat")).toBe("common");
    expect(rarityOf("machine_pistol")).toBe("rare");
  });

  it("rare pieces miss more shipments than common ones", () => {
    const count = (id: string, country: "varrow" | "meridian") => {
      let n = 0;
      for (let i = 0; i < 400; i++) {
        const c = newCity(country, NOW);
        c.stock = {};
        if (rollShipment(c, "guns", Math.random).some((g) => g.id === id)) n++;
      }
      return n;
    };
    // Both shops carry two or three weapons; the rare one turns up clearly less often.
    expect(count("machine_pistol", "meridian")).toBeLessThan(count("switchblade", "meridian"));
  });
});

describe("the black market", () => {
  it("you can sell a spare or an unused piece, never a worn one or issued gear", () => {
    const c = newCity("varrow", NOW);
    const p = mk("seller");
    p.inventory.pipe = 1;
    p.wear = { pipe: 10 };
    expect(listBlock(c, p, "pipe", 300, NOW)).toMatch(/worn/);
    p.inventory.pipe = 2;
    expect(listBlock(c, p, "pipe", 300, NOW)).toBeNull();
    expect(listBlock(c, p, "pipe", 1, NOW)).toMatch(/Ask between/);
    listItem(c, p, "pipe", 300, NOW, always(0.5));
    expect(p.inventory.pipe).toBe(1);
    expect(c.market).toHaveLength(1);
    unlistItem(c, p, c.market![0].id);
    expect(p.inventory.pipe).toBe(2);
    expect(c.market).toHaveLength(0);
  });

  it("a sale pays the seller in dirty money minus the fence's cut, and the piece changes hands", () => {
    const c = newCity("varrow", NOW);
    const seller = mk("seller");
    // A bat carried in from Port Solace: it can't be bought in Grayhaven's shop.
    seller.inventory.baseball_bat = 2;
    listItem(c, seller, "baseball_bat", 1500, NOW, always(0.5));
    const buyer = mk("buyer");
    buyLisCheck(c, buyer, seller);
    expect(buyer.inventory.baseball_bat).toBe(1);
    expect(buyer.equipped?.weapon).toBe("baseball_bat");
    expect(buyer.cash).toBe(50_000 - 1500);
    expect(seller.dirty).toBe(sellerTake(1500));
    expect(sellerTake(1500)).toBe(1500 - Math.ceil(1500 * MARKET.cut));
    expect(buyer.heat).toBe(MARKET.heat);
    expect(c.market).toHaveLength(0);
    expect(seller.inbox?.[0].text).toMatch(/sold on the black market/);
  });

  it("the fence keeps out-of-town pieces on offer, at a premium", () => {
    const c = newCity("varrow", NOW);
    expect(fenceRestock(c, NOW, Math.random)).toBe(true);
    expect(fenceRestock(c, NOW + 1000, Math.random)).toBe(false);
    for (const l of c.market ?? []) {
      expect(l.fence).toBe(true);
      expect(GEAR_HOME[l.itemId]).not.toBe("varrow");
      expect(l.price).toBeGreaterThan(ITEM_BY_ID[l.itemId].price);
    }
    // The city clock keeps it stocked.
    const d = newCity("solmarra", NOW);
    advanceCity(d, NOW);
    expect(d.fenceAt).toBe(NOW);
  });

  it("a regular buys a piece they need at a fair price, once a day, never from the fence", () => {
    const c = newCity("varrow", NOW);
    const seller = mk("seller");
    seller.inventory.baseball_bat = 2;
    listItem(c, seller, "baseball_bat", Math.floor(ITEM_BY_ID.baseball_bat.price * 1.3), NOW, always(0.5));
    fenceRestock(c, NOW, Math.random);
    const r = mk("reg-varrow-gus");
    r.regular = { country: "varrow", key: "gus", slot: -1 };
    r.cash = 5000;
    const want = regularPick(c, r, NOW)!;
    expect(want.sellerId).toBe(seller.id);
    buyListing(c, r, seller, want.id, NOW);
    r.regular.marketAt = NOW;
    expect(seller.dirty).toBeGreaterThan(0);
    expect(regularPick(c, r, NOW + 60_000)).toBeNull();
    // Too dear: they walk past.
    const greedy = mk("greedy");
    greedy.inventory.snub_pistol = 2;
    listItem(c, greedy, "snub_pistol", ITEM_BY_ID.snub_pistol.price * 3, NOW, always(0.5));
    const r2 = mk("reg-varrow-mags");
    r2.regular = { country: "varrow", key: "mags", slot: -1 };
    r2.cash = 500_000;
    expect(regularPick(c, r2, NOW)).toBeNull();
  });
});

function buyLisCheck(c: ReturnType<typeof newCity>, buyer: Player, seller: Player) {
  buyListing(c, buyer, seller, c.market![0].id, NOW);
}
