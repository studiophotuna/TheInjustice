import { describe, expect, it } from "vitest";
import { createPlayer } from "./engine";
import { buyOrder, cancelOrder, EXCHANGE, feeOf, listOrder, tradeBlock } from "./exchange";
import { buyCosmetic, creditFavors, sellableFavors } from "./favors";

const NOW = Date.UTC(2027, 4, 20, 12);
const OLD = NOW - 30 * 86_400_000;

function trader(id: string, name: string) {
  const p = createPlayer(`acct_${id}`, name, OLD);
  p.bank = 1_000_000;
  return p;
}

describe("Favors exchange", () => {
  it("is closed to guests and brand-new characters", () => {
    expect(tradeBlock(createPlayer("guest123", "Guest", OLD), NOW)).toMatch(/account/);
    expect(tradeBlock(createPlayer("acct_new", "Fresh", NOW - 86_400_000), NOW)).toMatch(/days/);
    expect(tradeBlock(trader("ok", "Ready"), NOW)).toBeNull();
  });

  it("only sells Favors that aren't gifts or freshly bought", () => {
    const s = trader("s1", "Seller");
    creditFavors(s, 500, "Granted", NOW, "g1");
    expect(sellableFavors(s, NOW)).toBe(0);
    creditFavors(s, 400, "Pack", NOW, "pay1", "hold");
    expect(sellableFavors(s, NOW)).toBe(0);
    expect(sellableFavors(s, NOW + 8 * 86_400_000)).toBe(400);
    // Spending uses the gifts up first.
    buyCosmetic(s, "frame:gilded", NOW);
    expect(s.favorsLocked).toBe(380);
  });

  it("holds the Favors, pays the seller minus the fee, and gives the buyer held Favors", () => {
    const later = NOW + 8 * 86_400_000;
    const s = trader("s2", "Seller");
    const b = trader("b2", "Buyer");
    creditFavors(s, 1000, "Pack", NOW, "pay2", "hold");
    const { order } = listOrder(s, 500, 50_000, "order00001", later, 0);
    expect(s.favors).toBe(500);
    const sBank = s.bank;
    buyOrder(b, s, order, later);
    expect(order.status).toBe("filled");
    expect(b.favors).toBe(500);
    expect(b.bank).toBe(1_000_000 - 50_000);
    expect(s.bank).toBe(sBank + 50_000 - feeOf(50_000));
    expect(sellableFavors(b, later)).toBe(0);
    expect(s.inbox?.[0].text).toMatch(/sold/);
    expect(() => buyOrder(b, s, order, later)).toThrow(/first/);
  });

  it("cancelling gives the Favors back", () => {
    const later = NOW + 8 * 86_400_000;
    const s = trader("s3", "Changes mind");
    creditFavors(s, 300, "Pack", NOW, "pay3", "hold");
    const { order } = listOrder(s, 200, 2000, "order00002", later, 0);
    cancelOrder(s, order, later);
    expect(s.favors).toBe(300);
    expect(order.status).toBe("cancelled");
  });

  it("enforces lot size, price limits and the weekly cap", () => {
    const later = NOW + 8 * 86_400_000;
    const s = trader("s4", "Big seller");
    creditFavors(s, 10_000, "Pack", NOW, "pay4", "hold");
    expect(() => listOrder(s, 10, 100, "o1xxxxxxxx", later, 0)).toThrow(/between/);
    expect(() => listOrder(s, 100, 10, "o2xxxxxxxx", later, 0)).toThrow(/per Favor/);
    listOrder(s, 2000, 20_000, "o3xxxxxxxx", later, 0);
    expect(() => listOrder(s, 2000, 20_000, "o4xxxxxxxx", later, 1)).toThrow(/a week/);
    expect(EXCHANGE.weeklySell).toBeLessThan(4000);
  });
});
