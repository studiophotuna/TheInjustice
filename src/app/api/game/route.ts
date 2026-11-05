import { trackDevice } from "@/game/anticheat";
import { assertActive } from "@/game/moderation";
import { NextResponse } from "next/server";
import { applyAction, createPlayer, tick } from "@/game/engine";
import { GameError, type GameEvent } from "@/game/types";
import { toView } from "@/game/view";
import { parseAction } from "@/server/actions";
import { assertJson } from "@/server/auth";
import { deviceInfo, resolveIdentity } from "@/server/identity";
import { fileDeposit } from "@/game/casework";
import { settleTrial } from "@/server/justice";
import { payTax, payTurf, returnImpounded, taxRates, turfMap, withCity } from "@/server/city";
import { flagLaundering } from "@/game/batch6";
import { countryOf } from "@/game/engine";
import { creditSale, shopMarkups } from "@/game/shops";
import type { ShopKind } from "@/game/types";
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
    // The named reputation leaderboard is gone: a public list of names puts targets on backs.
    // Anonymous season boards live at /api/season.
    let player = id.playerId ? await store.get(id.playerId) : null;
    // Held past the trial deadline with no judge: the court clerk rules now.
    if (player?.onBail) {
      // Out on bail: the verdict comes when the trial's time is up.
      await settleTrial(store, player.onBail, now).catch((e) => console.error(e));
      player = await store.get(id.playerId!);
    }
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
    // Presence: note that the player has the game open (at most once a minute).
    if (player && now - (player.seenAt ?? 0) > 60_000) {
      player =
        (await store.update(id.playerId!, (p) => {
          if (p) p.seenAt = now;
          return { player: p, result: p };
        })) ?? player;
    }
    if (player?.impounded) {
      await returnImpounded(store, player.id, now).catch((e) => console.error(e));
      player = (await store.get(player.id)) ?? player;
    }
    if (player) tick(player, now);
    return NextResponse.json({
      view: player ? toView(player, now) : null,
      account: id.account ? { username: id.account.username } : null,
      leaderboard: [],
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
    const { deviceId, ipHash } = await deviceInfo();
    const now = Date.now();
    const store = getStore();
    let flag: { caseId: string; amount: number; at: number } | null = null;
    let owed: { country: import("@/game/types").CountryId; amount: number } | null = null;
    const rates = action.type === "job" || action.type === "collect_property" ? await taxRates(store) : {};
    const turf = action.type === "job" ? await turfMap(store) : {};
    // Allied crews don't charge each other protection.
    const self = action.type === "job" ? await store.get(playerId!) : null;
    const myCrew = self?.crewId ? await store.getCrew(self.crewId) : null;
    const allies = (myCrew?.allies ?? []).map((x) => x.id);
    let turfOwed: { crewId: string; amount: number } | null = null;
    let impounded = false;
    let sale: { country: import("@/game/types").CountryId; kind: ShopKind; amount: number } | null = null;
    // Player-run shops set their own prices.
    const buyer = action.type === "buy" ? await store.get(playerId!) : null;
    const markups = buyer ? shopMarkups(await store.getCity(countryOf(buyer))) : undefined;
    let launderFlag: { amount: number; method: string } | null = null;
    const out = await store.update(playerId!, (p) => {
      if (action.type === "create") {
        if (p) throw new GameError("You already have a character.");
        const fresh = createPlayer(playerId!, action.name, now, action.country);
        trackDevice(fresh, deviceId, ipHash);
        return { player: fresh, result: { view: toView(fresh, now), events: [] as GameEvent[] } };
      }
      if (!p) throw new GameError("Create a character first.");
      assertActive(p, now);
      trackDevice(p, deviceId, ipHash);
      const events = applyAction(p, action, now, Math.random, { taxRates: rates, turf, allies, shopMarkups: markups });
      if (p.impounded) impounded = true;
      if (p.shopSale) {
        sale = p.shopSale;
        p.shopSale = null;
      }
      if (p.launderFlag) {
        launderFlag = p.launderFlag;
        p.launderFlag = null;
      }
      if (p.turfOwed) {
        turfOwed = p.turfOwed;
        p.turfOwed = null;
      }
      p.seenAt = now;
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
    // A big laundering gets flagged for detectives.
    const lf = launderFlag as { amount: number; method: string } | null;
    if (lf) {
      const self = await store.get(playerId!);
      if (self) await withCity(store, countryOf(self), now, (c) => flagLaundering(c, playerId!, lf.amount, lf.method, now)).catch((e) => console.error(e));
    }
    // Protection money goes to the crew that runs the district.
    const t = turfOwed as { crewId: string; amount: number } | null;
    if (t) await payTurf(store, t).catch((e) => console.error(e));
    // The shop owner's margin lands in their till.
    const s = sale as { country: import("@/game/types").CountryId; kind: ShopKind; amount: number } | null;
    if (s && s.amount > 0) await withCity(store, s.country, now, (c) => creditSale(c, s.kind, s.amount, now)).catch((e) => console.error(e));
    // A stolen car the police impounded goes home.
    if (impounded) await returnImpounded(store, playerId!, now).catch((e) => console.error(e));
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
