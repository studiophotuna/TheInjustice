// The black market: gear on offer in the city you're in.
import { NextResponse } from "next/server";
import { countryOf, tick } from "@/game/engine";
import { buyListing, listItem, marketView, unlistItem } from "@/game/market";
import { assertActive } from "@/game/moderation";
import { GameError, type GameEvent } from "@/game/types";
import { toView } from "@/game/view";
import { assertJson } from "@/server/auth";
import { readCity, withCity } from "@/server/city";
import { reportError } from "@/server/errors";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  reportError("api/market", e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

const str = (v: unknown) => {
  if (typeof v !== "string" || !v || v.length > 80) throw new GameError("Bad request.");
  return v;
};

export async function GET() {
  try {
    const { playerId } = await resolveIdentity(false);
    const store = getStore();
    const me = playerId ? await store.get(playerId) : null;
    if (!me) throw new GameError("Create a character first.");
    const now = Date.now();
    const c = await readCity(store, countryOf(me), now);
    const ids = [...new Set((c.market ?? []).filter((l) => !l.fence).map((l) => l.sellerId))];
    const sellers = Object.fromEntries((await Promise.all(ids.map((id) => store.get(id)))).map((s, i) => [ids[i], s]));
    return NextResponse.json(marketView(c, me, sellers, now));
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b || typeof b.op !== "string") throw new GameError("Bad request.");
    const { playerId } = await resolveIdentity(true);
    const store = getStore();
    const now = Date.now();
    const self = await store.get(playerId!);
    if (!self) throw new GameError("Create a character first.");
    assertActive(self, now);
    const out = await withCity(store, countryOf(self), now, async (c, tx) => {
      let events: GameEvent[];
      if (b.op === "buy") {
        const l = (c.market ?? []).find((x) => x.id === str(b.id));
        const ids = l && !l.fence ? [playerId!, l.sellerId] : [playerId!];
        const [p, seller] = await tx.getPlayers(ids);
        if (!p) throw new GameError("Create a character first.");
        tick(p, now);
        if (seller) tick(seller, now);
        events = buyListing(c, p, seller ?? null, str(b.id), now);
        await tx.putPlayer(p);
        if (seller) await tx.putPlayer(seller);
        return { events, view: toView(p, now) };
      }
      const [p] = await tx.getPlayers([playerId!]);
      if (!p) throw new GameError("Create a character first.");
      tick(p, now);
      if (b.op === "list") events = listItem(c, p, str(b.itemId), Number(b.price), now, Math.random);
      else if (b.op === "unlist") events = unlistItem(c, p, str(b.id));
      else throw new GameError("Bad request.");
      await tx.putPlayer(p);
      return { events, view: toView(p, now) };
    });
    return NextResponse.json(out);
  } catch (e) {
    return failure(e);
  }
}
