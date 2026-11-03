import { NextResponse } from "next/server";
import {
  advanceCity,
  appointChief,
  chiefSalary,
  cityView,
  collectSalary,
  crackdown,
  dismissChief,
  eatSoup,
  fundSoup,
  isMayor,
  newCity,
  pardon,
  runForMayor,
  setBounty,
  setTax,
  signRecall,
  skim,
  vote,
} from "@/game/city";
import { BALANCE } from "@/game/balance";
import { frontPage } from "@/game/paper";
import { claimTurf, declareWar, joinWar, settleWar, turfView } from "@/game/turf";
import { rankTitle } from "@/game/content/paths";
import { countryOf, inJail, tick } from "@/game/engine";
import { GameError, type DistrictId, type GameEvent, type Player } from "@/game/types";
import { toView } from "@/game/view";
import { assertJson } from "@/server/auth";
import { readCity } from "@/server/city";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

const str = (v: unknown) => {
  if (typeof v !== "string" || !v || v.length > 80) throw new GameError("Bad request.");
  return v;
};

export async function GET() {
  try {
    const { playerId } = await resolveIdentity(false);
    const store = getStore();
    const p = playerId ? await store.get(playerId) : null;
    if (!p) throw new GameError("Create a character first.");
    const now = Date.now();
    tick(p, now);
    const c = await readCity(store, countryOf(p), now);
    const view = cityView(c, p, now);
    // The mayor sees who's serving time in the city (for pardons).
    let prisoners: { id: string; name: string; reason: string }[] = [];
    let officers: { id: string; name: string; title: string }[] = [];
    if (isMayor(c, p)) {
      const people = await store.listPlayers(c.country, 200);
      prisoners = people
        .filter((o) => o.id !== p.id && !o.custodyCase && inJail(o, now))
        .slice(0, 20)
        .map((o) => ({ id: o.id, name: o.name, reason: o.jailReason ?? "" }));
      officers = people
        .filter((o) => o.id !== p.id && !o.dead && o.path === "police" && o.rank >= BALANCE.city.chiefRank)
        .slice(0, 20)
        .map((o) => ({ id: o.id, name: o.name, title: rankTitle(o) ?? "" }));
    }
    const crew = p.crewId ? await store.getCrew(p.crewId) : null;
    const paper = frontPage(c.country, c, await store.listCases(c.country, 100), now);
    return NextResponse.json({ city: view, prisoners, officers, turf: turfView(c, p, crew, now), paper });
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { playerId } = await resolveIdentity(false);
    if (!playerId) throw new GameError("Create a character first.");
    const store = getStore();
    const now = Date.now();
    const self = await store.get(playerId);
    if (!self) throw new GameError("Create a character first.");
    const country = countryOf(self);

    // Lock order everywhere: players first, the city last.
    const events: GameEvent[] = await store.transaction(async (tx) => {
      // A war being settled locks everyone who fought in it.
      const pre = b.op === "settle_war" ? await store.getCity(country) : null;
      const war = pre?.turf?.[str(b.district) as DistrictId]?.war;
      const fighters = war ? [...war.attackers, ...war.defenders].map((x) => x.id) : [];
      const ids = [playerId, ...(b.op === "pardon" || b.op === "appoint_chief" ? [str(b.playerId)] : []), ...fighters];
      const rows = await tx.getPlayers([...new Set(ids)]);
      const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
      const p = byId.get(playerId);
      const other = ids[1] ? byId.get(ids[1]) ?? null : null;
      if (!p) throw new GameError("Create a character first.");
      const crew = ["claim_turf", "declare_war"].includes(b.op as string) && p.crewId ? await tx.getCrew(p.crewId) : null;
      const c = (await tx.getCity(country)) ?? newCity(country, now);
      advanceCity(c, now);
      tick(p, now);
      let out: GameEvent[];
      switch (b.op) {
        case "run":
          out = runForMayor(c, p, b.pitch, now);
          break;
        case "vote":
          out = vote(c, p, str(b.candidateId), now);
          break;
        case "tax":
          out = setTax(c, p, Number(b.rate), now);
          break;
        case "bounty":
          out = setBounty(c, p, Number(b.amount), now);
          break;
        case "crackdown":
          out = crackdown(c, p, now);
          break;
        case "salary":
          out = collectSalary(c, p, now);
          break;
        case "skim":
          out = skim(c, p, Number(b.amount), now);
          break;
        case "appoint_chief": {
          if (!other) throw new GameError("That player doesn't exist.");
          out = appointChief(c, p, other as Player, now);
          await tx.putPlayer(other);
          break;
        }
        case "dismiss_chief":
          out = dismissChief(c, p, now);
          break;
        case "chief_salary":
          out = chiefSalary(c, p, now);
          break;
        case "fund_soup":
          out = fundSoup(c, p, Number(b.amount), now);
          break;
        case "claim_turf":
          out = claimTurf(c, crew!, p, str(b.district) as DistrictId, now);
          if (crew) await tx.putCrew(crew);
          break;
        case "declare_war":
          out = declareWar(c, crew!, p, str(b.district) as DistrictId, now);
          break;
        case "join_war":
          out = joinWar(c, p, str(b.district) as DistrictId, now);
          break;
        case "settle_war": {
          const h = c.turf?.[str(b.district) as DistrictId];
          if (!h?.war) throw new GameError("There's no war there.");
          const side = (list: { id: string }[]) => list.map((x) => byId.get(x.id)).filter((x): x is Player => !!x);
          out = settleWar(c, str(b.district) as DistrictId, side(h.war.attackers), side(h.war.defenders), now, Math.random);
          for (const f of byId.values()) if (f.id !== playerId) await tx.putPlayer(f);
          break;
        }
        case "recall":
          out = signRecall(c, p, now);
          break;
        case "soup":
          out = eatSoup(c, p, now);
          break;
        case "pardon": {
          if (!other) throw new GameError("That player doesn't exist.");
          tick(other, now);
          out = pardon(c, p, other as Player, now);
          await tx.putPlayer(other);
          break;
        }
        default:
          throw new GameError("Bad request.");
      }
      await tx.putPlayer(p);
      await tx.putCity(c);
      return out;
    });

    const p = await store.get(playerId);
    if (!p) throw new GameError("Create a character first.");
    tick(p, now);
    return NextResponse.json({ view: toView(p, now), events });
  } catch (e) {
    return failure(e);
  }
}
