import { trackDevice } from "@/game/anticheat";
import { GEAR_HOME, returnDog, returnToStock, takeDog, takeFromStock } from "@/game/stock";
import { oldEnough, parseBirthDate, UNDERAGE } from "@/game/age";
import { cookies } from "next/headers";

const AGE_COOKIE = "cns_age";
import { reportError } from "@/server/errors";
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
import { applyBackground } from "@/game/backgrounds";
import { creditSeizure, searchingOfficers } from "@/game/customs";
import { notify } from "@/game/social";
import type { ShopKind } from "@/game/types";
import { getStore, StoreConfigError } from "@/server/store";
import { RATE, requester } from "@/server/ratelimit";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  reportError("api/game", e);
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
    // Held past the trial deadline with no judge: the duty judge rules now.
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
    await store.throttleAction(requester(req), now, RATE.burst, RATE.burstMs, RATE.perMinute);
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
    // Officers on customs duty in the city you're leaving.
    const leaver = action.type === "travel" || action.type === "drive" ? await store.get(playerId!) : null;
    const customs = leaver ? searchingOfficers(await store.getCity(countryOf(leaver)), now, playerId!).map((x) => ({ id: x.id, name: x.name, eye: x.eye })) : [];
    let seizure: { officerId: string; value: number; what: string; from: string } | null = null;
    let launderFlag: { amount: number; method: string } | null = null;
    if (action.type === "create") {
      const jar = await cookies();
      if (jar.get(AGE_COOKIE)) throw new GameError(UNDERAGE);
      const birth = parseBirthDate(action.birthDate, now);
      if (!oldEnough(birth, now)) {
        jar.set(AGE_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 30 * 86_400 });
        throw new GameError(UNDERAGE);
      }
    }
    // Gear comes off this city's shelf first; it goes back if the purchase doesn't go through.
    const gearBuy = action.type === "buy" && GEAR_HOME[action.itemId] ? { id: action.itemId, country: buyer ? countryOf(buyer) : null } : null;
    if (gearBuy?.country) await withCity(store, gearBuy.country, now, (c) => takeFromStock(c, gearBuy.id));
    // Dogs leave the city pound the same way.
    const adopter = action.type === "dog_buy" ? await store.get(playerId!) : null;
    const dogBuy = action.type === "dog_buy" && adopter ? { breed: action.breed, country: countryOf(adopter) } : null;
    if (dogBuy) await withCity(store, dogBuy.country, now, (c) => takeDog(c, dogBuy.breed));
    const out = await store.update(playerId!, (p) => {
      if (action.type === "create") {
        if (p) throw new GameError("You already have a character.");
        const fresh = createPlayer(playerId!, action.name, now, action.country);
        fresh.birthDate = parseBirthDate(action.birthDate, now);
        if (action.background) applyBackground(fresh, action.background);
        trackDevice(fresh, deviceId, ipHash);
        return { player: fresh, result: { view: toView(fresh, now), events: [] as GameEvent[] } };
      }
      if (!p) throw new GameError("Create a character first.");
      assertActive(p, now);
      if (p.ageBlocked) throw new GameError(UNDERAGE);
      if (!p.birthDate && action.type !== "birthdate") throw new GameError("Enter your date of birth first.");
      trackDevice(p, deviceId, ipHash);
      const events = applyAction(p, action, now, Math.random, { taxRates: rates, turf, allies, shopMarkups: markups, customs });
      if (p.customsSeizure) {
        seizure = { ...p.customsSeizure, from: p.name };
        p.customsSeizure = null;
      }
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
      if (p.pendingDeposit) flag = p.pendingDeposit;
      return { player: p, result: { view: toView(p, now), events } };
    }).catch(async (e) => {
      // The sale fell through: the piece goes back on the shelf.
      if (gearBuy?.country) await withCity(store, gearBuy.country, now, (c) => returnToStock(c, gearBuy.id)).catch(() => undefined);
      if (dogBuy?.country) await withCity(store, dogBuy.country, now, (c) => returnDog(c, dogBuy.breed)).catch(() => undefined);
      throw e;
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
    // The customs officer who made the seizure gets their bounty.
    const sz = seizure as { officerId: string; value: number; what: string; from: string } | null;
    if (sz) {
      await store
        .update(sz.officerId, (o) => {
          if (!o) return { player: o, result: null };
          tick(o, now);
          const bounty = creditSeizure(o, sz.value, sz.from, sz.what, now);
          notify(o, `Customs: you stopped ${sz.from} and seized ${sz.what}. Bounty +$${bounty.toLocaleString()}.`, "good", undefined, now);
          return { player: o, result: null };
        })
        .catch((e) => console.error(e));
    }
    // Withheld city tax goes to the treasury.
    const o = owed as { country: import("@/game/types").CountryId; amount: number } | null;
    if (o) await payTax(store, o, now).catch((e) => console.error(e));
    // A suspicious deposit lands on the compliance desk: file it on the case it followed.
    const f = flag as { caseId: string; amount: number; at: number } | null;
    if (f) {
      try {
        // Keep the pending marker on the player until the case write is durable. If this
        // transaction fails, the next action retries instead of silently losing the flag.
        const filed = await store.transaction(async (tx) => {
          const c = await tx.getCase(f.caseId);
          if (!c) return false;
          if (fileDeposit(c, { id: playerId! }, f)) {
            await tx.putCase(c);
            return true;
          }
          // An existing deposit or a closed case means this flag has already been handled.
          return !!c.deposit || !!c.trial?.verdict || !!c.hunt;
        });
        if (filed) {
          await store.update(playerId!, (p) => {
            if (p?.pendingDeposit?.caseId === f.caseId && p.pendingDeposit.at === f.at) p.pendingDeposit = null;
            return { player: p, result: null };
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    return NextResponse.json(out);
  } catch (e) {
    return failure(e);
  }
}
