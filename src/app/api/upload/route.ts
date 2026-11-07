import { randomUUID } from "node:crypto";
import { reportError } from "@/server/errors";
import { NextResponse } from "next/server";
import { reviewUpload, startUpload, validUpload, type CustomKind } from "@/game/favors";
import { GameError } from "@/game/types";
import { assertJson } from "@/server/auth";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  reportError("api/upload", e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

/** Upload your own frame or banner: paid in Favors, and seen by nobody else until approved. */
export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (b.kind !== "frame" && b.kind !== "banner") throw new GameError("Bad request.");
    const kind: CustomKind = b.kind;
    const data = validUpload(kind, b.data);
    const { playerId } = await resolveIdentity(false);
    if (!playerId) return NextResponse.json({ error: "Start playing first." }, { status: 401 });
    const store = getStore();
    const now = Date.now();
    const id = randomUUID().replace(/-/g, "").slice(0, 20);
    const { name, cost } = await store.update(playerId, (p) => {
      if (!p || p.dead) throw new GameError("Start playing first.");
      const cost = startUpload(p, kind, id, now);
      return { player: p, result: { name: p.name, cost } };
    });
    try {
      await store.addUpload({ id, playerId, playerName: name, kind, data, status: "pending", at: now, cost });
    } catch (e) {
      // Couldn't save the image: give the Favors back.
      await store.update(playerId, (p) => {
        if (p) reviewUpload(p, kind, id, false, "the upload didn't go through", cost, Date.now());
        return { player: p, result: null };
      });
      throw e;
    }
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return failure(e);
  }
}
