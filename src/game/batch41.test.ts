import { describe, expect, it } from "vitest";
import { createPlayer } from "./engine";
import { sellableFavors } from "./favors";
import { cents, creditOrder, orderProblem, refundOrder } from "./payments";
import { gameNumbers } from "./numbers";

const NOW = Date.UTC(2027, 5, 1, 12);

describe("paid Favors packs", () => {
  it("credits a paid pack once, held for a week", () => {
    const p = createPlayer("acct_pay1", "Buyer", NOW);
    const o = { orderId: "1001", packId: "pack_550", subtotal: cents("$9.99"), currency: "USD" };
    expect(orderProblem(o)).toBeNull();
    expect(creditOrder(p, o, NOW)).toBe(true);
    expect(creditOrder(p, o, NOW)).toBe(false);
    expect(p.favors).toBe(550);
    expect(sellableFavors(p, NOW)).toBe(0);
    expect(sellableFavors(p, NOW + 8 * 86_400_000)).toBe(550);
  });

  it("refuses a pack that wasn't paid for in full", () => {
    expect(orderProblem({ orderId: "1", packId: "pack_3200", subtotal: 199, currency: "USD" })).toMatch(/paid/);
    expect(orderProblem({ orderId: "1", packId: "nope", subtotal: 9999, currency: "USD" })).toMatch(/unknown/);
  });

  it("a refund takes the Favors back, once, and only for credited orders", () => {
    const p = createPlayer("acct_pay2", "Refunder", NOW);
    const o = { orderId: "2002", packId: "pack_100", subtotal: 199, currency: "USD" };
    expect(refundOrder(p, o, NOW)).toBe(0);
    creditOrder(p, o, NOW);
    expect(refundOrder(p, o, NOW)).toBe(100);
    expect(refundOrder(p, o, NOW)).toBe(0);
    expect(p.favors).toBe(0);
    expect(p.favorHolds ?? []).toEqual([]);
  });
});

describe("player numbers for moderators", () => {
  it("counts players, activity, comebacks and careers", () => {
    const day = 86_400_000;
    const a = createPlayer("acct_n1", "Stayer", NOW - 10 * day);
    a.seenAt = NOW - 1000;
    a.path = "police";
    a.rank = 2;
    const b = createPlayer("guest_n2", "Leaver", NOW - 10 * day);
    b.seenAt = NOW - 9 * day;
    const n = gameNumbers([a, b], NOW);
    expect(n.players).toBe(2);
    expect(n.accounts).toBe(1);
    expect(n.activeDay).toBe(1);
    expect(n.backAfter7).toEqual({ of: 2, back: 1 });
    expect(n.careers).toEqual([{ name: "Police", count: 1 }]);
    expect(n.stoppedAt.find((s) => s.step === "Started")!.count).toBe(1);
  });
});
