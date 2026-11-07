import { describe, expect, it } from "vitest";
import { applyAction, createPlayer } from "./engine";
import { newCity } from "./city";
import { ITEMS } from "./content/items";
import { carried, GEAR_HOME, ownerRestock, rollShipment, STOCK, stockCap, systemRestock, takeFromStock } from "./stock";

const NOW = Date.UTC(2027, 8, 1, 12);
const always = (v: number) => () => v;

describe("gear is sold in different cities", () => {
  it("every weapon and armor for sale has one home city, and every city sells some", () => {
    const forSale = ITEMS.filter((i) => (i.kind === "weapon" || i.kind === "armor") && !i.issued && !i.contraband);
    for (const i of forSale) expect(GEAR_HOME[i.id], i.id).toBeTruthy();
    for (const c of ["varrow", "solmarra", "kestrova", "meridian"] as const) expect(carried(c, "guns").length + carried(c, "armor").length).toBeGreaterThan(0);
    expect(GEAR_HOME.baseball_bat).toBe("solmarra");
  });

  it("you can only buy it where it's sold", () => {
    const p = createPlayer("acct_s1", "Shopper", NOW, "varrow");
    p.cash = 5000;
    expect(() => applyAction(p, { type: "buy", itemId: "baseball_bat" }, NOW, always(0.5))).toThrow(/Port Solace/);
    applyAction(p, { type: "buy", itemId: "pipe" }, NOW, always(0.5));
    expect(p.inventory.pipe).toBe(1);
  });
});

describe("stock", () => {
  it("a shipment is pure luck: as little as one piece, never past the shelf", () => {
    const c = newCity("kestrova", NOW);
    c.stock = {};
    // The lowest rolls: one kind of item, one piece.
    const got = rollShipment(c, "guns", always(0));
    expect(got.length).toBe(1);
    expect(got[0].added).toBe(1);
    for (let i = 0; i < 50; i++) rollShipment(c, "guns", Math.random);
    for (const id of carried("kestrova", "guns")) expect(c.stock![id] ?? 0).toBeLessThanOrEqual(stockCap(id));
  });

  it("a shop nobody runs restocks by itself; an owner orders it, and only so often", () => {
    const c = newCity("varrow", NOW);
    c.stock = {};
    c.stockAt = {};
    expect(systemRestock(c, NOW, always(0.99))).toBe(true);
    expect(systemRestock(c, NOW + 1000, always(0.99))).toBe(false);
    expect(systemRestock(c, NOW + STOCK.systemEveryMs, always(0.99))).toBe(true);

    c.shops = { guns: { ownerId: "acct_o", ownerName: "Owner", markup: 1, since: NOW, till: 0, sales: 0, earned: 0, offers: [] } };
    const before = c.stockAt!.guns;
    // With an owner, the city only steps in when the owner has neglected the shop.
    systemRestock(c, NOW + STOCK.systemEveryMs + 1, always(0.99));
    expect(c.stockAt!.guns).toBe(before);
    expect(() => ownerRestock(c, "acct_other", "guns", NOW + 10 * STOCK.systemEveryMs, Math.random)).toThrow(/don't run/);
    ownerRestock(c, "acct_o", "guns", NOW + 10 * STOCK.systemEveryMs, Math.random);
    expect(() => ownerRestock(c, "acct_o", "guns", NOW + 10 * STOCK.systemEveryMs + 1000, Math.random)).toThrow(/shipment can be ordered/);
  });

  it("selling takes one off the shelf, and a sold-out shelf refuses", () => {
    const c = newCity("varrow", NOW);
    c.stock = { pipe: 1 };
    takeFromStock(c, "pipe");
    expect(c.stock.pipe).toBe(0);
    expect(() => takeFromStock(c, "pipe")).toThrow(/Sold out/);
    expect(() => takeFromStock(c, "baseball_bat")).toThrow(/Port Solace/);
  });
});
