// The Favors exchange: list Favors for in-game cash, buy other players' Favors, cancel your own.
import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { buyOrder, cancelOrder, exchangeView, listOrder } from "@/game/exchange";
import { GameError, type GameEvent } from "@/game/types";
import { assertJson } from "@/server/auth";
import { reportError } from "@/server/errors";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  reportError("api/exchange", e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

async function view(playerId: string) {
  const store = getStore();
  const [me, open, mine] = await Promise.all([store.get(playerId), store.listOrders(200), store.ordersBy(playerId, 20)]);
  if (!me) throw new GameError("Create a character first.");
  return exchangeView(me, open, mine, Date.now());
}

export async function GET() {
  try {
    const { playerId } = await resolveIdentity(false);
    if (!playerId) throw new GameError("Create a character first.");
    return NextResponse.json(await view(playerId));
  } catch (e) {
    return failure(e);
  }
}

const int = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : NaN);
const id = (v: unknown) => {
  if (typeof v !== "string" || !/^[a-z0-9]{8,40}$/.test(v)) throw new GameError("Bad request.");
  return v;
};

export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { playerId } = await resolveIdentity(false);
    if (!playerId) throw new GameError("Create a character first.");
    const store = getStore();
    const now = Date.now();
    let events: GameEvent[] = [];
    if (b.op === "sell") {
      const open = (await store.ordersBy(playerId, 50)).filter((o) => o.status === "open").length;
      events = await store.transaction(async (tx) => {
        const [me] = await tx.getPlayers([playerId]);
        if (!me) throw new GameError("Create a character first.");
        const out = listOrder(me, int(b.favors), int(b.price), randomBytes(10).toString("hex"), now, open);
        await tx.putOrder(out.order);
        await tx.putPlayer(me);
        return out.events;
      });
    } else if (b.op === "cancel") {
      const orderId = id(b.orderId);
      events = await store.transaction(async (tx) => {
        const o = await tx.getOrder(orderId);
        if (!o) throw new GameError("That order is gone.");
        const [me] = await tx.getPlayers([playerId]);
        if (!me) throw new GameError("Create a character first.");
        const out = cancelOrder(me, o, now);
        await tx.putOrder(o);
        await tx.putPlayer(me);
        return out;
      });
    } else if (b.op === "buy") {
      const orderId = id(b.orderId);
      events = await store.transaction(async (tx) => {
        const o = await tx.getOrder(orderId);
        if (!o || o.status !== "open") throw new GameError("Someone got there first.");
        const ids = [playerId, o.sellerId];
        const [a, c] = await tx.getPlayers(ids);
        if (!a) throw new GameError("Create a character first.");
        if (!c) {
          o.status = "cancelled";
          await tx.putOrder(o);
          return [{ tone: "bad" as const, text: "That seller is gone, so the order was taken down." }];
        }
        const out = buyOrder(a, c, o, now);
        await tx.putOrder(o);
        await tx.putPlayer(a);
        await tx.putPlayer(c);
        return out;
      });
    } else throw new GameError("Bad request.");
    return NextResponse.json({ events, exchange: await view(playerId) });
  } catch (e) {
    return failure(e);
  }
}
