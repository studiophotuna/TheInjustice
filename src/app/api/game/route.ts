import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { applyAction, createPlayer, tick } from "@/game/engine";
import { GameError, type GameEvent } from "@/game/types";
import { toView } from "@/game/view";
import { parseAction } from "@/server/actions";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

const COOKIE = "inj_sid";
const SID_RE = /^[a-f0-9]{48}$/;

async function sessionId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const sid = jar.get(COOKIE)?.value;
  if (sid && SID_RE.test(sid)) return sid;
  if (!create) return null;
  const fresh = randomBytes(24).toString("hex");
  jar.set(COOKIE, fresh, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return fresh;
}

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function GET() {
  try {
    const sid = await sessionId(false);
    const now = Date.now();
    const store = getStore();
    const [player, leaderboard] = await Promise.all([sid ? store.get(sid) : null, store.leaderboard(10)]);
    if (player) tick(player, now);
    return NextResponse.json({ view: player ? toView(player, now) : null, leaderboard });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    const action = parseAction(await req.json().catch(() => null));
    const sid = (await sessionId(true))!;
    const now = Date.now();
    const out = await getStore().update(sid, (p) => {
      if (action.type === "create") {
        if (p) throw new GameError("You already have a character.");
        const fresh = createPlayer(sid, action.name, now);
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
