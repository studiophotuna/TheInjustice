import { NextResponse } from "next/server";
import { advanceCity, newCity } from "@/game/city";
import { COUNTRIES } from "@/game/content/world";
import { countryOf, tick } from "@/game/engine";
import { assertActive } from "@/game/moderation";
import {
  acceptOffer,
  collectTill,
  declineOffer,
  makeOffer,
  sellBack,
  setMarkup,
  SHOP,
  shopsOwnedBy,
  shopsView,
  takeLicense,
  withdrawOffer,
} from "@/game/shops";
import { notify } from "@/game/social";
import { GameError, type City, type CountryId, type GameEvent, type Player, type ShopKind } from "@/game/types";
import { toView } from "@/game/view";
import { assertJson } from "@/server/auth";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError, type Tx } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

const kindOf = (v: unknown): ShopKind => {
  if (typeof v !== "string" || !(v in SHOP.kinds)) throw new GameError("No such shop.");
  return v as ShopKind;
};

async function view(store: ReturnType<typeof getStore>, me: Player, now: number) {
  const country = countryOf(me);
  const cities = await store.listCities();
  const c = cities.find((x) => x.country === country) ?? newCity(country, now);
  const ownerIds = [...new Set(Object.values(c.shops ?? {}).map((h) => h!.ownerId))];
  const owners = Object.fromEntries((await Promise.all(ownerIds.map((id) => store.get(id)))).map((o, i) => [ownerIds[i], o]));
  const elsewhere = shopsOwnedBy(cities, me.id)
    .filter((s) => s.country !== country)
    .map((s) => {
      const h = cities.find((x) => x.country === s.country)!.shops![s.kind]!;
      return { country: s.country, city: COUNTRIES.find((x) => x.id === s.country)!.capital, kind: s.kind, name: SHOP.kinds[s.kind].name, icon: SHOP.kinds[s.kind].icon, till: h.till, offers: h.offers.length };
    });
  return {
    city: COUNTRIES.find((x) => x.id === country)!.capital,
    shops: shopsView(c, me, owners, now),
    owned: shopsOwnedBy(cities, me.id).length,
    maxOwned: SHOP.maxOwned,
    range: { min: SHOP.minMarkup, max: SHOP.maxMarkup },
    costShare: SHOP.costShare,
    elsewhere,
  };
}

export async function GET() {
  try {
    const { playerId } = await resolveIdentity(false);
    const store = getStore();
    const me = playerId ? await store.get(playerId) : null;
    if (!me) throw new GameError("Create a character first.");
    return NextResponse.json(await view(store, me, Date.now()));
  } catch (e) {
    return failure(e);
  }
}

/** Shops someone runs, counted inside the transaction (every city is small). */
async function ownedIn(tx: Tx, id: string, here: City): Promise<number> {
  const cities = await Promise.all(COUNTRIES.map((c) => (c.id === here.country ? here : tx.getCity(c.id))));
  return shopsOwnedBy(cities, id).length;
}

export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!b || typeof b.op !== "string") throw new GameError("Bad request.");
    const { playerId } = await resolveIdentity(true);
    const store = getStore();
    const now = Date.now();
    const kind = kindOf(b.kind);
    const other = typeof b.playerId === "string" && b.playerId.length <= 80 ? b.playerId : null;

    const events = await store.transaction(async (tx) => {
      const [p] = await tx.getPlayers([playerId!]);
      if (!p) throw new GameError("Create a character first.");
      assertActive(p, now);
      tick(p, now);
      // Shops are run from the city they're in.
      const country = typeof b.country === "string" && COUNTRIES.some((c) => c.id === b.country) ? (b.country as CountryId) : countryOf(p);
      const c = (await tx.getCity(country)) ?? newCity(country, now);
      advanceCity(c, now);
      const h = c.shops?.[kind] ?? null;
      const ownCity = country === countryOf(p);
      let out: GameEvent[] = [];
      const touched: Player[] = [];
      switch (b.op) {
        case "buy": {
          if (!ownCity) throw new GameError("Go there to sign for a licence.");
          const [prev] = h ? await tx.getPlayers([h.ownerId]) : [null];
          out = takeLicense(c, p, kind, await ownedIn(tx, p.id, c), now, prev);
          if (h && prev) {
            notify(prev, `You hadn't been around in a week, so city hall handed your ${SHOP.kinds[kind].name.toLowerCase()} to ${p.name}. Its takings went to your bank.`, "bad", undefined, now);
            touched.push(prev);
          }
          break;
        }
        case "markup":
          out = setMarkup(c, p, kind, Number(b.markup));
          break;
        case "collect":
          out = collectTill(c, p, kind);
          if (!out.length) throw new GameError("The till is empty.");
          break;
        case "offer": {
          if (!ownCity) throw new GameError("Go there to make an offer.");
          out = makeOffer(c, p, kind, Number(b.amount), now);
          const [owner] = await tx.getPlayers([h!.ownerId]);
          if (owner) {
            notify(owner, `${p.name} offers $${Math.floor(Number(b.amount)).toLocaleString()} for your ${SHOP.kinds[kind].name.toLowerCase()} in ${COUNTRIES.find((x) => x.id === country)!.capital}. Shop → Businesses to answer.`, "info", p, now);
            touched.push(owner);
          }
          break;
        }
        case "withdraw":
          out = withdrawOffer(c, p, kind);
          break;
        case "decline": {
          if (!other) throw new GameError("Bad request.");
          out = declineOffer(c, p, kind, other);
          const [buyer] = await tx.getPlayers([other]);
          if (buyer) {
            notify(buyer, `${p.name} turned down your offer for the ${SHOP.kinds[kind].name.toLowerCase()}.`, "info", p, now);
            touched.push(buyer);
          }
          break;
        }
        case "accept": {
          if (!other) throw new GameError("Bad request.");
          const [buyer] = await tx.getPlayers([other]);
          if (!buyer) throw new GameError("That player doesn't exist.");
          tick(buyer, now);
          out = acceptOffer(c, p, buyer, kind, await ownedIn(tx, buyer.id, c), now);
          notify(buyer, `${p.name} accepted: the ${SHOP.kinds[kind].name.toLowerCase()} in ${COUNTRIES.find((x) => x.id === country)!.capital} is yours.`, "good", p, now);
          touched.push(buyer);
          break;
        }
        case "sell":
          out = sellBack(c, p, kind, now);
          break;
        default:
          throw new GameError("Bad request.");
      }
      await tx.putPlayer(p);
      for (const o of touched) await tx.putPlayer(o);
      await tx.putCity(c);
      return out;
    });

    const p = await store.get(playerId!);
    if (!p) throw new GameError("Create a character first.");
    tick(p, now);
    return NextResponse.json({ view: toView(p, now), events, shops: await view(store, p, now) });
  } catch (e) {
    return failure(e);
  }
}
