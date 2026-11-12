import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { newCity } from "./city";
import { ITEM_BY_ID } from "./content/items";
import { applyAction, createPlayer, itemPrice, tick } from "./engine";
import { SHOP, acceptOffer, collectTill, creditSale, licensePrice, makeOffer, ownerCut, salesTax, sellBack, setMarkup, shopMarkups, shopsOwnedBy, shopsView, takeLicense, withSalesTax } from "./shops";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const mk = (id: string, bank = 100_000) => {
  const p = createPlayer(id, id.toUpperCase(), T0);
  tick(p, NOW);
  p.hasBankAccount = true;
  p.bank = bank;
  p.cash = 50_000;
  p.seenAt = NOW;
  return p;
};
const city = (p: Player) => {
  const c = newCity(p.country ?? "varrow", NOW);
  c.treasury = 0;
  c.taxRate = 0.1;
  return c;
};

describe("player-run shops", () => {
  it("a licence comes from the bank and goes to the treasury", () => {
    const p = mk("ana");
    const c = city(p);
    const price = licensePrice(c.country, "guns");
    takeLicense(c, p, "guns", 0, NOW);
    expect(p.bank).toBe(100_000 - price);
    expect(c.treasury).toBe(price);
    expect(c.shops?.guns?.ownerId).toBe("ana");
    expect(() => takeLicense(c, mk("bo"), "guns", 0, NOW, p)).toThrow(/offer/);
    expect(() => takeLicense(c, mk("cy"), "diner", SHOP.maxOwned, NOW)).toThrow(/at most/);
  });

  it("buyers pay the owner's price; the owner's margin is held for their till", () => {
    const owner = mk("ana");
    const c = city(owner);
    takeLicense(c, owner, "guns", 0, NOW);
    setMarkup(c, owner, "guns", 1.2);
    const buyer = mk("bo");
    const item = ITEM_BY_ID.pipe ?? Object.values(ITEM_BY_ID).find((i) => i.kind === "weapon" && !i.issued && !i.contraband)!;
    const local = itemPrice(buyer, item.price);
    const cash = buyer.cash;
    applyAction(buyer, { type: "buy", itemId: item.id }, NOW, () => 0.5, { shopMarkups: shopMarkups(c) });
    const paid = Math.round(local * 1.2);
    // Sales tax on top of the owner's price goes to city hall; the owner's cut is from the shelf price.
    expect(buyer.cash).toBe(cash - withSalesTax(paid, item.kind));
    expect(buyer.taxOwed).toEqual({ country: c.country, amount: salesTax(paid, item.kind) });
    expect(buyer.shopSale).toEqual({ country: c.country, kind: "guns", amount: ownerCut(local, paid) });
    creditSale(c, "guns", buyer.shopSale!.amount, NOW);
    expect(c.shops!.guns!.till).toBe(ownerCut(local, paid));
  });

  it("a price raise between looking and buying stops the sale", () => {
    const owner = mk("ana");
    const c = city(owner);
    takeLicense(c, owner, "diner", 0, NOW);
    setMarkup(c, owner, "diner", 1.5);
    const buyer = mk("bo");
    const food = Object.values(ITEM_BY_ID).find((i) => i.kind === "food")!;
    const shown = itemPrice(buyer, food.price);
    expect(() => applyAction(buyer, { type: "buy", itemId: food.id, maxPrice: shown }, NOW, () => 0.5, { shopMarkups: shopMarkups(c) })).toThrow(/changed the prices/);
  });

  it("owners shop their own shelves at the usual price", () => {
    const owner = mk("ana");
    const c = city(owner);
    takeLicense(c, owner, "pharmacy", 0, NOW);
    setMarkup(c, owner, "pharmacy", 1.5);
    const med = Object.values(ITEM_BY_ID).find((i) => i.kind === "medical")!;
    const cash = owner.cash;
    applyAction(owner, { type: "buy", itemId: med.id }, NOW, () => 0.5, { shopMarkups: shopMarkups(c) });
    expect(owner.cash).toBe(cash - withSalesTax(itemPrice(owner, med.price), med.kind));
    expect(owner.shopSale ?? null).toBeNull();
  });

  it("markup is clamped and collecting pays city tax", () => {
    const owner = mk("ana");
    const c = city(owner);
    takeLicense(c, owner, "diner", 0, NOW);
    setMarkup(c, owner, "diner", 9);
    expect(c.shops!.diner!.markup).toBe(SHOP.maxMarkup);
    setMarkup(c, owner, "diner", 0.1);
    expect(c.shops!.diner!.markup).toBe(SHOP.minMarkup);
    creditSale(c, "diner", 1000, NOW);
    const t0 = c.treasury;
    const cash = owner.cash;
    collectTill(c, owner, "diner");
    expect(owner.cash).toBe(cash + 900);
    expect(c.treasury).toBe(t0 + 100);
  });

  it("offers move bank money only on accept, and the shop changes hands", () => {
    const owner = mk("ana", 0);
    const c = city(owner);
    owner.bank = 100_000;
    takeLicense(c, owner, "realty", 0, NOW);
    const buyer = mk("bo", 80_000);
    makeOffer(c, buyer, "realty", 70_000, NOW);
    expect(buyer.bank).toBe(80_000);
    const view = shopsView(c, owner, {}, NOW).find((s) => s.kind === "realty")!;
    expect(view.offers).toHaveLength(1);
    expect(shopsView(c, buyer, {}, NOW).find((s) => s.kind === "realty")!.offers).toHaveLength(0);
    const before = owner.bank;
    acceptOffer(c, owner, buyer, "realty", 0, NOW);
    expect(buyer.bank).toBe(10_000);
    expect(owner.bank).toBe(before + 70_000);
    expect(c.shops!.realty!.ownerId).toBe("bo");
    expect(shopsOwnedBy([c], "bo")).toHaveLength(1);
  });

  it("an owner gone a week loses the licence; city hall buys back at half", () => {
    const owner = mk("ana");
    const c = city(owner);
    takeLicense(c, owner, "armor", 0, NOW);
    creditSale(c, "armor", 500, NOW);
    const later = NOW + SHOP.idleMs + 1;
    const taker = mk("bo");
    const bank = owner.bank;
    takeLicense(c, taker, "armor", 0, later, owner);
    expect(c.shops!.armor!.ownerId).toBe("bo");
    expect(owner.bank).toBe(bank + 500);
    const tb = taker.bank;
    sellBack(c, taker, "armor", later);
    expect(taker.bank).toBe(tb + Math.floor(licensePrice(c.country, "armor") * SHOP.buyback));
    expect(c.shops!.armor).toBeUndefined();
  });
});
