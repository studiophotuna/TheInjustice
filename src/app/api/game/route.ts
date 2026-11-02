import { NextResponse } from "next/server";
import { applyAction, createPlayer, tick } from "@/game/engine";
import { GameError, type GameEvent } from "@/game/types";
import { toView } from "@/game/view";
import { parseAction } from "@/server/actions";
import { assertJson } from "@/server/auth";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function GET() {
  try {
    const id = await resolveIdentity(false);
    const now = Date.now();
    const store = getStore();
    let [player, leaderboard] = await Promise.all([
      id.playerId ? store.get(id.playerId) : null,
      store.leaderboard(10),
    ]);
    const app = player?.application;
    if (player && app?.status === "pending" && now >= app.decideAt) {
      // The dean's decision is due: decide once and save it, so it can't change later.
      player = await store.update(id.playerId!, (p) => {
        if (!p) return { player: null, result: null };
        tick(p, now);
        return { player: p, result: p };
      });
    }
    if (player) tick(player, now);
    return NextResponse.json({
      view: player ? toView(player, now) : null,
      account: id.account ? { username: id.account.username } : null,
      leaderboard,
    });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    assertJson(req);
    const action = parseAction(await req.json().catch(() => null));
    const { playerId } = await resolveIdentity(true);
    const now = Date.now();
    const out = await getStore().update(playerId!, (p) => {
      if (action.type === "create") {
        if (p) throw new GameError("You already have a character.");
        const fresh = createPlayer(playerId!, action.name, now);
        return { player: fresh, result: { view: toView(fresh, now), events: [] as GameEvent[] } };
      }
      if (!p) throw new GameError("Create a character first.");
      const events = applyAction(p, action, now, Math.random);
      return { player: p, result: { view: toView(p, now), events } };
    });
    return NextResponse.json(out);
  } catch (e) {
    return failure(e);
  }
}
