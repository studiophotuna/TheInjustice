// Lemon Squeezy tells us about paid and refunded orders here. Every request is signed with
// LEMONSQUEEZY_WEBHOOK_SECRET (HMAC-SHA256 of the raw body, hex, in X-Signature).
// At checkout the game passes custom data: the player's id and the pack.
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { creditOrder, orderProblem, refundOrder } from "@/game/payments";
import { notify } from "@/game/social";
import { reportError } from "@/server/errors";
import { getStore } from "@/server/store";

function signed(raw: string, sig: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !sig) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(raw).digest("hex"));
  const got = Buffer.from(sig);
  return want.length === got.length && timingSafeEqual(want, got);
}

type Body = {
  meta?: { event_name?: string; custom_data?: { player_id?: string; pack?: string } };
  data?: { id?: string; attributes?: { status?: string; subtotal?: number; currency?: string; test_mode?: boolean } };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!signed(raw, req.headers.get("x-signature"))) return NextResponse.json({ error: "Bad signature." }, { status: 401 });
  try {
    const b = JSON.parse(raw) as Body;
    const event = b.meta?.event_name;
    const playerId = b.meta?.custom_data?.player_id;
    const packId = b.meta?.custom_data?.pack ?? "";
    const orderId = String(b.data?.id ?? "");
    const a = b.data?.attributes ?? {};
    if (!playerId || !orderId) return NextResponse.json({ ok: true, skipped: "no player or order" });
    // Test-mode orders only count where test mode is allowed (previews, not production).
    if (a.test_mode && process.env.FAVORS_ALLOW_TEST_ORDERS !== "1") return NextResponse.json({ ok: true, skipped: "test order" });
    const now = Date.now();
    const store = getStore();

    if (event === "order_created" && a.status === "paid") {
      const order = { orderId, packId, subtotal: Number(a.subtotal ?? 0), currency: String(a.currency ?? "") };
      const problem = orderProblem(order);
      if (problem) {
        reportError("api/payments/lemonsqueezy", new Error(`Order ${orderId} not credited: ${problem}`));
        return NextResponse.json({ ok: true, skipped: problem });
      }
      const credited = await store.update(playerId, (p) => {
        if (!p) return { player: null, result: false };
        const ok = creditOrder(p, order, now);
        if (ok) notify(p, "Thanks. Your Favors have arrived.", "good", undefined, now);
        return { player: p, result: ok };
      });
      return NextResponse.json({ ok: true, credited });
    }

    if (event === "order_refunded") {
      const taken = await store.update(playerId, (p) => {
        if (!p) return { player: null, result: 0 };
        return { player: p, result: refundOrder(p, { orderId, packId }, now) };
      });
      return NextResponse.json({ ok: true, taken });
    }

    return NextResponse.json({ ok: true, skipped: event ?? "no event" });
  } catch (e) {
    // A 500 makes the provider retry; crediting is safe to repeat.
    reportError("api/payments/lemonsqueezy", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
