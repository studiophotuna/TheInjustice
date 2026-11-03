import { NextResponse } from "next/server";
import { applyAction, createPlayer, tick } from "@/game/engine";
import { GameError, type GameEvent } from "@/game/types";
import { toView } from "@/game/view";
import { parseAction } from "@/server/actions";
import { assertJson } from "@/server/auth";
import { resolveIdentity } from "@/server/identity";
import { fileDeposit } from "@/game/casework";
import { settleTrial } from "@/server/justice";
import { payTax, taxRates } from "@/server/city";
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
    // Held past the trial deadline with no judge: the court clerk rules now.
    if (player?.custodyCase && now >= (player.jailUntil ?? 0)) {
      await settleTrial(store, player.custodyCase, now).catch((e) => console.error(e));
      player = await store.get(id.playerId!);
      // Safety net: never hold anyone long past the deadline (e.g. the case record is gone).
      if (player?.custodyCase && now >= (player.jailUntil ?? 0) + 5 * 60_000) {
        player = await store.update(id.playerId!, (p) => {
          if (p) {
            p.custodyCase = null;
            p.jailUntil = 0;
            p.jailReason = null;
          }
          return { player: p, result: p };
        });
      }
    }
    const app = player?.application;
    const decisionDue = app?.status === "pending" && now >= app.decideAt;
    const arrivalDue = !!player?.travel && now >= player.travel.arriveAt;
    if (player && (decisionDue || arrivalDue)) {
      // A dean's decision or an arrival is due: settle it once and save it, so it can't change.
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
    const store = getStore();
    let flag: { caseId: string; amount: number; at: number } | null = null;
    let owed: { country: import("@/game/types").CountryId; amount: number } | null = null;
    const rates = action.type === "job" || action.type === "collect_property" ? await taxRates(store) : {};
    const out = await store.update(playerId!, (p) => {
      if (action.type === "create") {
        if (p) throw new GameError("You already have a character.");
        const fresh = createPlayer(playerId!, action.name, now, action.country);
        return { player: fresh, result: { view: toView(fresh, now), events: [] as GameEvent[] } };
      }
      if (!p) throw new GameError("Create a character first.");
      const events = applyAction(p, action, now, Math.random, { taxRates: rates });
      if (p.taxOwed) {
        owed = p.taxOwed;
        p.taxOwed = null;
      }
      if (p.pendingDeposit) {
        flag = p.pendingDeposit;
        p.pendingDeposit = null;
      }
      return { player: p, result: { view: toView(p, now), events } };
    });
    // Withheld city tax goes to the treasury.
    const o = owed as { country: import("@/game/types").CountryId; amount: number } | null;
    if (o) await payTax(store, o, now).catch((e) => console.error(e));
    // A suspicious deposit lands on the compliance desk: file it on the case it followed.
    const f = flag as { caseId: string; amount: number; at: number } | null;
    if (f) {
      await store
        .transaction(async (tx) => {
          const c = await tx.getCase(f.caseId);
          if (c && fileDeposit(c, { id: playerId! }, f)) await tx.putCase(c);
        })
        .catch((e) => console.error(e));
    }
    return NextResponse.json(out);
  } catch (e) {
    return failure(e);
  }
}
