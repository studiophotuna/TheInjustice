// Real-money Favors packs. The payment provider (Lemon Squeezy, a merchant of record that handles
// sales tax) tells the server about each paid order; this turns that notice into Favors, once.
import { creditFavors, FAVORS } from "./favors";
import type { Player } from "./types";

export type Pack = (typeof FAVORS.packs)[number];

/** "$9.99" → 999 */
export const cents = (price: string) => Math.round(Number(price.replace(/[^0-9.]/g, "")) * 100);

export interface PaidOrder {
  orderId: string;
  packId: string;
  /** What was actually paid, in cents, before tax. */
  subtotal: number;
  currency: string;
}

/** Why this order shouldn't be credited, or null. */
export function orderProblem(o: PaidOrder): string | null {
  const pack = FAVORS.packs.find((p) => p.id === o.packId);
  if (!pack) return `unknown pack ${o.packId}`;
  if (o.currency !== "USD") return `unexpected currency ${o.currency}`;
  // A pack id is chosen in the browser, so check it against what was paid.
  if (o.subtotal < cents(pack.price)) return `paid ${o.subtotal} for ${pack.id}`;
  return null;
}

/** Credits a paid pack. False if this order was already credited. */
export function creditOrder(p: Player, o: PaidOrder, now: number): boolean {
  const pack = FAVORS.packs.find((x) => x.id === o.packId)!;
  return creditFavors(p, pack.favors, `Pack of ${pack.favors.toLocaleString()}`, now, `ls:${o.orderId}`, "hold");
}

/** Takes a refunded pack's Favors back (as many as are left), once. */
export function refundOrder(p: Player, o: { orderId: string; packId: string }, now: number): number {
  const ref = `lsrefund:${o.orderId}`;
  if ((p.favorRefs ?? []).includes(ref)) return 0;
  if (!(p.favorRefs ?? []).includes(`ls:${o.orderId}`)) return 0;
  const pack = FAVORS.packs.find((x) => x.id === o.packId);
  if (!pack) return 0;
  const take = Math.min(p.favors ?? 0, pack.favors);
  p.favors = (p.favors ?? 0) - take;
  // The refunded Favors were held for a week; take them out of the hold first.
  const holds = (p.favorHolds ?? []).map((h) => ({ ...h }));
  let left = take;
  for (const h of holds) {
    const n = Math.min(h.amount, left);
    h.amount -= n;
    left -= n;
  }
  p.favorHolds = holds.filter((h) => h.amount > 0);
  p.favorsLocked = Math.min(p.favorsLocked ?? 0, p.favors);
  p.favorRefs = [ref, ...(p.favorRefs ?? [])].slice(0, 200);
  p.favorLog = [{ at: now, delta: -take, what: `Refunded: pack of ${pack.favors.toLocaleString()}`, ref }, ...(p.favorLog ?? [])].slice(0, 40);
  return take;
}
