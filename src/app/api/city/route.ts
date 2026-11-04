import { assertActive } from "@/game/moderation";
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
import { frontPage, weekStories } from "@/game/paper";
import { declareMartialLaw, joinPeacekeepers, peaceSettle, standGuard } from "@/game/military";
import { reportThreat, stakeOut, stakeoutBlock } from "@/game/hit";
import { appointEditor, buryStory, dismissEditor, EDITOR, editorSalary, isEditor, setBuryPrice, toggleStory, writeEditorial } from "@/game/batch7";
import { buyVote, campaign } from "@/game/batch4";
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
    let editorPicks: { id: string; name: string }[] = [];
    if (isMayor(c, p)) {
      const people = await store.listPlayers(c.country, 200);
      editorPicks = people
        .filter((o) => o.id !== p.id && !o.dead && o.reputation >= EDITOR.minReputation && o.id !== c.editor?.id)
        .slice(0, 20)
        .map((o) => ({ id: o.id, name: o.name }));
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
    // Candidates see who lives here (to campaign door to door... or to buy votes).
    const residents = c.candidates.some((x) => x.id === p.id)
      ? (await store.listPlayers(c.country, 100)).filter((o) => o.id !== p.id && !o.dead).slice(0, 40).map((o) => ({ id: o.id, name: o.name }))
      : [];
    const paper = frontPage(c.country, c, await store.listCases(c.country, 100), now, { editor: isEditor(c, p) });
    // Detectives see reported threats (never who's behind them); the person who reported sees it's on file.
    const threats = !stakeoutBlock({ ...p, energy: 999 }, now) ? (c.threats ?? []).filter((t) => !t.solved).map((t) => ({ id: t.id, targetName: t.targetName, at: t.at })) : [];
    const myThreatReported = (c.threats ?? []).some((t) => t.targetId === p.id && !t.solved);
    return NextResponse.json({ city: view, prisoners, officers, editorPicks, turf: turfView(c, p, crew, now), paper, residents, threats, myThreatReported });
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
    assertActive(self, now);
    const country = countryOf(self);

    // Lock order everywhere: players first, the city last.
    const events: GameEvent[] = await store.transaction(async (tx) => {
      // A war being settled locks everyone who fought in it.
      const pre = b.op === "settle_war" || b.op === "bury_story" || b.op === "stakeout" ? await store.getCity(country) : null;
      const editorId = b.op === "bury_story" ? pre?.editor?.id : undefined;
      // A stakeout may catch the hitman, so lock them and the person they're after.
      const threat = b.op === "stakeout" ? pre?.threats?.find((t) => t.id === str(b.threatId)) : undefined;
      const hitCrewPre = threat ? await store.getCrew(threat.crewId) : null;
      const stakeIds = hitCrewPre?.hit ? [hitCrewPre.hit.hitmanId, hitCrewPre.hit.targetId] : threat ? [threat.targetId] : [];
      const war = pre?.turf?.[str(b.district) as DistrictId]?.war;
      const fighters = war ? [...war.attackers, ...war.defenders, ...(war.peacekeepers ?? [])].map((x) => x.id) : [];
      const ids = [
        playerId,
        ...(b.op === "pardon" || b.op === "appoint_chief" || b.op === "buy_vote" || b.op === "appoint_editor" ? [str(b.playerId)] : []),
        ...(editorId ? [editorId] : []),
        ...stakeIds,
        ...fighters,
      ];
      const rows = await tx.getPlayers([...new Set(ids)]);
      const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
      const p = byId.get(playerId);
      const other = ids[1] ? byId.get(ids[1]) ?? null : null;
      if (!p) throw new GameError("Create a character first.");
      const crew = ["claim_turf", "declare_war", "join_war"].includes(b.op as string) && p.crewId ? await tx.getCrew(p.crewId) : null;
      const hitCrew = threat ? await tx.getCrew(threat.crewId) : null;
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
        case "campaign":
          out = campaign(c, p, Number(b.amount), now);
          break;
        case "buy_vote": {
          if (!other) throw new GameError("That player doesn't exist.");
          out = buyVote(c, p, other, Number(b.amount), now);
          await tx.putPlayer(other);
          break;
        }
        case "claim_turf":
          out = claimTurf(c, crew!, p, str(b.district) as DistrictId, now);
          if (crew) await tx.putCrew(crew);
          break;
        case "declare_war":
          out = declareWar(c, crew!, p, str(b.district) as DistrictId, now);
          break;
        case "join_war":
          out = joinWar(c, p, str(b.district) as DistrictId, now, (crew?.allies ?? []).map((a) => a.id));
          break;
        case "settle_war": {
          const h = c.turf?.[str(b.district) as DistrictId];
          if (!h?.war) throw new GameError("There's no war there.");
          const side = (list: { id: string }[]) => list.map((x) => byId.get(x.id)).filter((x): x is Player => !!x);
          if (now < h.war.endsAt) throw new GameError("The fighting isn't over yet.");
          // Under martial law the army may break it up before anyone wins.
          out =
            peaceSettle(c, str(b.district) as DistrictId, side(h.war.attackers), side(h.war.defenders), side(h.war.peacekeepers ?? []), now) ??
            settleWar(c, str(b.district) as DistrictId, side(h.war.attackers), side(h.war.defenders), now, Math.random);
          for (const f of byId.values()) if (f.id !== playerId) await tx.putPlayer(f);
          break;
        }
        case "appoint_editor": {
          if (!other) throw new GameError("That player doesn't exist.");
          out = appointEditor(c, p, other, now);
          await tx.putPlayer(other);
          break;
        }
        case "dismiss_editor":
          out = dismissEditor(c, p, now);
          break;
        case "editor_salary":
          out = editorSalary(c, p, now);
          break;
        case "bury_price":
          out = setBuryPrice(c, p, Number(b.price));
          break;
        case "editorial":
          out = writeEditorial(c, p, b.text, now);
          break;
        case "pull_story":
          out = toggleStory(c, p, str(b.storyId));
          break;
        case "bury_story": {
          const editor = editorId ? byId.get(editorId) : null;
          if (!editor || c.editor?.id !== editor.id) throw new GameError("The paper has no editor to lean on.");
          const ids = weekStories(c.country, c, await store.listCases(c.country, 100), now).stories.map((s) => s.id);
          out = buryStory(c, p, editor, str(b.storyId), ids, now);
          await tx.putPlayer(editor);
          break;
        }
        case "martial_law":
          out = declareMartialLaw(c, p, now);
          break;
        case "peacekeep":
          out = joinPeacekeepers(c, p, str(b.district) as DistrictId, now);
          break;
        case "report_threat":
          out = reportThreat(c, p, now);
          break;
        case "stakeout": {
          const h = hitCrew?.hit;
          const hitman = h ? byId.get(h.hitmanId) ?? null : null;
          const target = threat ? byId.get(threat.targetId) ?? null : null;
          for (const x of [hitman, target]) if (x && x.id !== p.id) tick(x, now);
          out = stakeOut(c, p, str(b.threatId), hitCrew, hitman, target, now, Math.random);
          for (const x of [hitman, target]) if (x && x.id !== p.id) await tx.putPlayer(x);
          if (hitCrew) await tx.putCrew(hitCrew);
          break;
        }
        case "guard_bank":
          out = standGuard(c, p, now);
          break;
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
