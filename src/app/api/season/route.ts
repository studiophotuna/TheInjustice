import { NextResponse } from "next/server";
import { COUNTRIES } from "@/game/content/world";
import { tick } from "@/game/engine";
import { seasonBoard, seasonId, seasonName } from "@/game/season";
import { GameError } from "@/game/types";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

/** This month's anonymous leaderboards: no names, only your own place. */
export async function GET() {
  try {
    const { playerId } = await resolveIdentity(false);
    const store = getStore();
    const me = playerId ? await store.get(playerId) : null;
    if (!me) throw new GameError("Create a character first.");
    const now = Date.now();
    tick(me, now);
    const everyone = (await Promise.all(COUNTRIES.map((c) => store.listPlayers(c.id, 300)))).flat();
    const others = everyone.filter((p) => p.id !== me.id);
    return NextResponse.json({ season: seasonName(seasonId(now)), boards: seasonBoard([me, ...others], me, now) });
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
    if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
