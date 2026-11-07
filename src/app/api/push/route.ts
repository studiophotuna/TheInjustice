// A phone signs up for (or drops) alerts, and picks which kinds it wants.
import { NextResponse } from "next/server";
import { addSub, PUSH_KINDS, removeSub } from "@/game/push";
import { GameError } from "@/game/types";
import { assertJson } from "@/server/auth";
import { reportError } from "@/server/errors";
import { resolveIdentity } from "@/server/identity";
import { getStore } from "@/server/store";

const KINDS = new Set<string>(PUSH_KINDS.map((k) => k.id));

export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { playerId } = await resolveIdentity(false);
    if (!playerId) throw new GameError("Create a character first.");
    const now = Date.now();
    const off = await getStore().update(playerId, (p) => {
      if (!p) throw new GameError("Create a character first.");
      if (b.op === "subscribe") {
        try {
          addSub(p, b.sub, now);
        } catch {
          throw new GameError("This browser couldn't sign up for alerts.");
        }
      } else if (b.op === "unsubscribe") {
        if (typeof b.endpoint === "string") removeSub(p, b.endpoint);
      } else if (b.op === "prefs") {
        const list = Array.isArray(b.off) ? b.off.filter((x): x is string => typeof x === "string" && KINDS.has(x)) : [];
        p.push = { ...(p.push ?? { subs: [], checkedAt: now }), off: list };
      } else throw new GameError("Bad request.");
      return { player: p, result: p.push?.off ?? [] };
    });
    return NextResponse.json({ ok: true, off });
  } catch (e) {
    if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
    reportError("api/push", e);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
