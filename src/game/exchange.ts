// The Favors exchange: players sell Favors to other players for in-game cash, only through this
// board. Favors sit in escrow on the order; the buyer pays from the bank; a 10% fee leaves the
// game as a money sink. Weekly caps, a week's hold on bought Favors, and no trading for new or
// guest characters keep it from becoming a laundering or farming machine. Favors never turn
// back into real money.
import { creditFavors, sellableFavors } from "./favors";
import { notify } from "./social";
import { GameError, type FavorOrder, type GameEvent, type Player } from "./types";

const DAY = 86_400_000;

export const EXCHANGE = {
  fee: 0.1,
  minLot: 50,
  maxLot: 2000,
  /** Favors a player can sell, and buy, per week. */
  weeklySell: 3000,
  weeklyBuy: 3000,
  minAgeDays: 7,
  /** Price limits per Favor, in cash. */
  minEach: 1,
  maxEach: 5000,
  openMax: 5,
};

const weekOf = (now: number) => Math.floor(now / (7 * DAY));

function week(p: Player, now: number) {
  const w = weekOf(now);
  if (p.exchangeWeek?.week !== w) p.exchangeWeek = { week: w, sold: 0, bought: 0 };
  return p.exchangeWeek;
}

/** Why this player can't trade yet, or null. */
export function tradeBlock(p: Player, now: number): string | null {
  if (!p.id.startsWith("acct_")) return "Save your character to an account to trade Favors.";
  if (now - p.createdAt < EXCHANGE.minAgeDays * DAY) return `Trading opens ${EXCHANGE.minAgeDays} days after you start.`;
  if (p.dead) return "Not from the grave.";
  return null;
}

export function listOrder(p: Player, favors: number, price: number, id: string, now: number, open: number): { order: FavorOrder; events: GameEvent[] } {
  const block = tradeBlock(p, now);
  if (block) throw new GameError(block);
  if (!Number.isInteger(favors) || favors < EXCHANGE.minLot || favors > EXCHANGE.maxLot) {
    throw new GameError(`List between ${EXCHANGE.minLot} and ${EXCHANGE.maxLot.toLocaleString()} Favors at a time.`);
  }
  if (!Number.isInteger(price) || price < favors * EXCHANGE.minEach || price > favors * EXCHANGE.maxEach) {
    throw new GameError(`Ask between $${EXCHANGE.minEach} and $${EXCHANGE.maxEach.toLocaleString()} per Favor.`);
  }
  if (open >= EXCHANGE.openMax) throw new GameError(`You can have ${EXCHANGE.openMax} orders up at once.`);
  if (sellableFavors(p, now) < favors) {
    throw new GameError("You don't have that many Favors you can sell. Gifts, free rewards and Favors bought this week can only be spent.");
  }
  const w = week(p, now);
  if (w.sold + favors > EXCHANGE.weeklySell) {
    throw new GameError(`You can sell ${EXCHANGE.weeklySell.toLocaleString()} Favors a week. ${Math.max(0, EXCHANGE.weeklySell - w.sold).toLocaleString()} left this week.`);
  }
  w.sold += favors;
  p.favors = (p.favors ?? 0) - favors;
  p.favorLog = [{ at: now, delta: -favors, what: "Listed on the exchange" }, ...(p.favorLog ?? [])].slice(0, 40);
  const order: FavorOrder = { id, sellerId: p.id, sellerName: p.name, favors, price, at: now, status: "open" };
  return {
    order,
    events: [{ tone: "good", text: `${favors.toLocaleString()} Favors listed for $${price.toLocaleString()}. They're held until someone buys them or you cancel.` }],
  };
}

export function cancelOrder(p: Player, o: FavorOrder, now: number): GameEvent[] {
  if (o.sellerId !== p.id) throw new GameError("That isn't your order.");
  if (o.status !== "open") throw new GameError("That order is already closed.");
  o.status = "cancelled";
  o.doneAt = now;
  p.favors = (p.favors ?? 0) + o.favors;
  const w = week(p, now);
  if (weekOf(o.at) === w.week) w.sold = Math.max(0, w.sold - o.favors);
  p.favorLog = [{ at: now, delta: o.favors, what: "Exchange order cancelled" }, ...(p.favorLog ?? [])].slice(0, 40);
  return [{ tone: "info", text: `Order cancelled. ${o.favors.toLocaleString()} Favors are back with you.` }];
}

/** The cut the exchange keeps from a sale. */
export const feeOf = (price: number) => Math.ceil(price * EXCHANGE.fee);

export function buyOrder(buyer: Player, seller: Player, o: FavorOrder, now: number): GameEvent[] {
  if (o.status !== "open") throw new GameError("Someone got there first.");
  if (buyer.id === o.sellerId) throw new GameError("That's your own order.");
  const block = tradeBlock(buyer, now);
  if (block) throw new GameError(block);
  const w = week(buyer, now);
  if (w.bought + o.favors > EXCHANGE.weeklyBuy) {
    throw new GameError(`You can buy ${EXCHANGE.weeklyBuy.toLocaleString()} Favors a week. ${Math.max(0, EXCHANGE.weeklyBuy - w.bought).toLocaleString()} left this week.`);
  }
  if (buyer.bank < o.price) throw new GameError(`You need $${o.price.toLocaleString()} in the bank.`);
  buyer.bank -= o.price;
  w.bought += o.favors;
  creditFavors(buyer, o.favors, `Bought on the exchange from ${o.sellerName}`, now, `ex:${o.id}`, "hold");
  const fee = feeOf(o.price);
  seller.bank += o.price - fee;
  o.status = "filled";
  o.buyerId = buyer.id;
  o.buyerName = buyer.name;
  o.doneAt = now;
  notify(
    seller,
    `Your ${o.favors.toLocaleString()} Favors sold on the exchange. $${(o.price - fee).toLocaleString()} went to your bank (after the $${fee.toLocaleString()} fee).`,
    "good",
    undefined,
    now,
  );
  return [{ tone: "good", text: `${o.favors.toLocaleString()} Favors are yours for $${o.price.toLocaleString()}. You can spend them now; selling them again waits a week.` }];
}

/** What the exchange screen needs. Cheapest per Favor first. */
export function exchangeView(p: Player, open: FavorOrder[], mine: FavorOrder[], now: number) {
  const w = p.exchangeWeek?.week === weekOf(now) ? p.exchangeWeek : { sold: 0, bought: 0 };
  return {
    block: tradeBlock(p, now),
    sellable: sellableFavors(p, now),
    bank: p.bank,
    soldLeft: Math.max(0, EXCHANGE.weeklySell - w.sold),
    boughtLeft: Math.max(0, EXCHANGE.weeklyBuy - w.bought),
    rules: EXCHANGE,
    orders: open
      .filter((o) => o.sellerId !== p.id)
      .sort((a, b) => a.price / a.favors - b.price / b.favors)
      .slice(0, 40)
      .map((o) => ({ id: o.id, seller: o.sellerName, favors: o.favors, price: o.price, at: o.at })),
    mine: mine.slice(0, 20).map((o) => ({
      id: o.id,
      favors: o.favors,
      price: o.price,
      status: o.status,
      at: o.at,
      selling: o.sellerId === p.id,
      other: o.sellerId === p.id ? (o.buyerName ?? null) : o.sellerName,
    })),
  };
}
