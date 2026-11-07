import { assertActive } from "@/game/moderation";
import { reportError } from "@/server/errors";
import { NextResponse } from "next/server";
import { claimTrophies, lastSeasonFinish, setTrophiesPublic, TROPHY_PRIZES, trophyBlock } from "@/game/batch7";
import { COUNTRIES } from "@/game/content/world";
import { tick } from "@/game/engine";
import { seasonBoard, seasonId, seasonName } from "@/game/season";
import { GameError, type GameEvent, type Player } from "@/game/types";
import { toView } from "@/game/view";
import { assertJson } from "@/server/auth";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  reportError("api/season", e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

async function everyone(store: ReturnType<typeof getStore>): Promise<Player[]> {
  return (await Promise.all(COUNTRIES.map((c) => store.listPlayers(c.id, 300)))).flat();
}

/** This month's anonymous leaderboards: no names, only your own place. Plus your trophies. */
export async function GET() {
  try {
    const { playerId } = await resolveIdentity(false);
    const store = getStore();
    const me = playerId ? await store.get(playerId) : null;
    if (!me) throw new GameError("Create a character first.");
    const now = Date.now();
    tick(me, now);
    const all = await everyone(store);
    const others = all.filter((p) => p.id !== me.id);
    const canClaim = !trophyBlock(me, now);
    const finishes = canClaim ? lastSeasonFinish(me, others, now) : [];
    return NextResponse.json({
      season: seasonName(seasonId(now)),
      boards: seasonBoard([me, ...others], me, now),
      last: { name: seasonName(seasonId(now) - 1), canClaim, finishes: finishes.map((t) => ({ ...t, prize: TROPHY_PRIZES[t.place - 1] })) },
      trophies: me.trophies ?? [],
      trophiesPublic: !!me.trophiesPublic,
    });
  } catch (e) {
    return failure(e);
  }
}

/** Claim last season's trophies, or show / hide them on your profile. */
export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { playerId } = await resolveIdentity(false);
    if (!playerId) throw new GameError("Create a character first.");
    const store = getStore();
    const now = Date.now();
    // Last season's numbers are frozen, so reading everyone outside the lock is safe.
    const others = b.op === "claim" ? (await everyone(store)).filter((p) => p.id !== playerId) : [];
    let events: GameEvent[] = [];
    await store.transaction(async (tx) => {
      const [me] = await tx.getPlayers([playerId]);
      if (!me) throw new GameError("Create a character first.");
      assertActive(me, now);
      tick(me, now);
      if (b.op === "claim") events = claimTrophies(me, others, now);
      else if (b.op === "show") events = setTrophiesPublic(me, b.on === true);
      else throw new GameError("Bad request.");
      await tx.putPlayer(me);
    });
    const p = await store.get(playerId);
    if (!p) throw new GameError("Create a character first.");
    tick(p, now);
    return NextResponse.json({ view: toView(p, now), events });
  } catch (e) {
    return failure(e);
  }
}
