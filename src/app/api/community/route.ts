import { assertActive, assertCanSpeak, checkReport, isBanned } from "@/game/moderation";
import { acceptAlliance, breakAlliance, declineAlliance, proposeAlliance } from "@/game/batch7";
import { ceremonyBlock, isMade, makeMember } from "@/game/family";
import { bringCharges, buyGun, courtMartialBlock, declineGun, offerGun, sellableGear } from "@/game/military";
import { torchBusiness, torchTargets } from "@/game/arson";
import { cancelHit, contractBlock, executeHit, hitCost, hitView, HIT, orderHit, scoutTarget } from "@/game/hit";
import { canUseForum, closeForum, createForum, forumChannel, inviteToForum, removeFromForum } from "@/game/forum";
import { buildLab, flagLaundering, flagsView, frisk, friskBlock, isBankStaff, labCook, labTips, labView, launderWithBanker, probeLaundering, raidLab, setLaunderService } from "@/game/batch6";
import { isDrug } from "@/game/drugs";
import { cancelHeist, heistView, planHeist, runHeist, takeRole } from "@/game/heist";
import * as AM from "@/game/ambush";
import { robberLead, specTier } from "@/game/specialties";
import { dispose } from "@/game/daily_life";
import { breakIn, breakInBlock, carTheftBlock, hasAlarm, homeIn, homeJobBlock, ownerHome, runHomeJob, stealCar } from "@/game/breakin";
import { CARS } from "@/game/vehicles";
import { dogAt } from "@/game/dogs";
import { hireMechanic, isMechService, mechanicCard } from "@/game/mechanic";
import { SHOP, SHOP_KINDS } from "@/game/shops";
import { ambientLines, chatLine, defFor, isHeavy, isRegularId, REGULAR_OPS, REGULARS } from "@/game/regulars";

const HEAVY_WIN_REP = 8;
import { DISTRICTS } from "@/game/content/districts";
import { addJournal, tieOf, tieShift, tieView } from "@/game/journal";
import { COUNTRY_BY_ID } from "@/game/content/world";
import { realOnlineCount, regularsOnStreet } from "@/server/regulars";
import { assertNotAlt } from "@/game/anticheat";
import { setSurgeryFee, surgery, surgeryBlock, woundsOf } from "@/game/wounds";
import { cityEvent } from "@/game/events";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { countryOf, inHospital, inJail, tick } from "@/game/engine";
import { BALANCE } from "@/game/balance";
import {
  acceptJoin,
  attackPlayer,
  createCrew,
  crewFoundBlock,
  crewJoinBlock,
  setLeads,
  crewLog,
  declineInvite,
  inviteToCrew,
  joinCrew,
  policyOf,
  setPolicy,
  depositToVault,
  leaveCrew,
  notify,
  postBounty,
  profileFor,
  validateCrew,
  vouchFor,
  withdrawFromVault,
} from "@/game/social";
import {
  canReadCases,
  caseCold,
  fileLost,
  caseView,
  commitCrime,
  crimeBlock,
  crimeDistrict,
  CRIME_KINDS,
  ignoreSighting,
  investigate,
  isCrimeKind,
  reportSighting,
  suspectsFor,
} from "@/game/crime";
import { arrest, isDetective, isJudge, isLawyer, joinTrial, lawyerPower, offerBribe, postBail, trialView } from "@/game/justice";
import { acceptLoan, collectLoan, contractView, lenderKind, offerLoan, postContract, repayLoan, workContract } from "@/game/batch4";
import { backAlleyFee, backAlleyTreat, hireLawyer, retainerFee, searchHome, setBackAlley } from "@/game/batch3";
import { settleTrial } from "@/server/justice";
import {
  answerPayoff,
  audit,
  auditBlock,
  corruptionIn,
  intimidate,
  isInternalAffairs,
  isMafia,
  isOfficial,
  myCaseView,
  offerPayoff,
  withdrawPayoff,
} from "@/game/racket";
import { rankTitle } from "@/game/content/paths";
import { advanceCity, newCity, crackdownOn, isChief, isMayor as isCityMayor, protectWitnesses } from "@/game/city";
import { inmateView, prisonWork, yardChannel, yardFight } from "@/game/prison";
import { breakoutView, cancelBreakout, executeBreakout, joinBreakout, planBlock, planBreakout, serving } from "@/game/breakout";
import {
  coldCaseView,
  depositView,
  examine,
  hunt,
  isBanker,
  isMedic,
  isVigilante,
  patientView,
  reviewDeposit,
} from "@/game/casework";
import { GameError, type AmbushRole, type CaseFile, type CountryId, type HeistRole, type Crew, type CrewPolicy, type GameEvent, type Player } from "@/game/types";
import { toView } from "@/game/view";
import { assertJson } from "@/server/auth";
import { resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError, type Tx } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  if ((e as { code?: string })?.code === "23505") return NextResponse.json({ error: "That crew tag is taken." }, { status: 400 });
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

async function me(): Promise<Player> {
  const { playerId } = await resolveIdentity(false);
  const p = playerId ? await getStore().get(playerId) : null;
  if (!p) throw new GameError("Create a character first.");
  return p;
}

function channelsFor(p: Player): string[] {
  // Inmates also get the yard, a chat only people behind bars in this country can see.
  return [
    "global",
    `country:${countryOf(p)}`,
    ...(p.crewId ? [`crew:${p.crewId}`] : []),
    ...(inJail(p, Date.now()) ? [yardChannel(p)] : []),
  ];
}

/** Public crew info: never includes anyone's private data. */
function crewView(c: Crew, viewer: Player) {
  const member = viewer.crewId === c.id;
  return {
    id: c.id,
    name: c.name,
    tag: c.tag,
    size: c.members.length,
    policy: policyOf(c),
    leader: c.members.find((m) => m.id === c.leaderId)?.name ?? "",
    members: c.members.map((m) => ({ id: m.id, name: m.name, role: m.role })),
    // Alliances are public: the street knows who stands with whom.
    allies: (c.allies ?? []).map((a) => ({ id: a.id, name: a.name, tag: a.tag })),
    ...(member
      ? {
          vault: c.vault,
          log: c.log,
          requests: viewer.id === c.leaderId ? c.requests : [],
          isLeader: viewer.id === c.leaderId,
          allyOffers: viewer.id === c.leaderId ? (c.allyOffers ?? []).map((o) => ({ id: o.id, name: o.name, tag: o.tag })) : [],
        }
      : {
          requested: c.requests.some((r) => r.id === viewer.id),
          invited: (c.invites ?? []).some((i) => i.id === viewer.id),
        }),
  };
}

/** Crewmates serving time, and the crew's breakout plan, for a member of that crew. */
async function crewJailView(store: ReturnType<typeof getStore>, crew: Crew, viewer: Player, now: number) {
  const mates = (await Promise.all(crew.members.filter((m) => m.id !== viewer.id).map((m) => store.get(m.id)))).filter(
    (m): m is Player => !!m,
  );
  mates.forEach((m) => tick(m, now));
  const city = await store.getCity(countryOf(viewer));
  const crack = crackdownOn(city, now);
  const teamIds = new Set(crew.breakout?.team.map((t) => t.id) ?? []);
  const team = [viewer, ...mates].filter((m) => teamIds.has(m.id));
  return {
    jailed: mates
      .filter((m) => serving(m, now))
      .map((m) => ({ id: m.id, name: m.name, until: m.jailUntil ?? now, reason: m.jailReason ?? "", canPlan: planBlock(crew, viewer, m, now) })),
    plan: breakoutView(crew, viewer, team, now, crack),
  };
}

export async function GET(req: Request) {
  try {
    const store = getStore();
    const p = await me();
    const now = Date.now();
    tick(p, now);
    const url = new URL(req.url);
    if (url.searchParams.get("cases")) {
      const country = countryOf(p);
      let cases = await store.listCases(country, 100);
      // Trials nobody ruled on in time are closed by the court clerk.
      const overdue = cases.filter((c) => c.trial && !c.trial.verdict && now >= c.trial.deadline).slice(0, 3);
      if (overdue.length) {
        for (const c of overdue) await settleTrial(store, c.id, now).catch((e) => console.error(e));
        cases = await store.listCases(country, 100);
      }
      const all = cases;
      // A file a bent cop "lost" is gone for everyone working cases.
      cases = cases.filter((c) => !fileLost(c));
      const cityHall = await store.getCity(country);
      // The mayor and the police chief can read the files too (to order witness protection).
      const official = !!cityHall && (isCityMayor(cityHall, p) || isChief(cityHall, p));
      const block = official ? null : canReadCases(p);
      const detective = isDetective(p);
      const medic = isMedic(p);
      const banker = isBanker(p);
      const vigilante = isVigilante(p);
      let pool: { player: Player; crewTag: string | null }[] = [];
      const mafia = isMafia(p);
      const ia = isInternalAffairs(p);
      const city = ia ? cityHall : null;
      let people: Player[] = [];
      if (detective || vigilante || mafia || ia) people = await store.listPlayers(country, 200);
      if (detective || vigilante) {
        const crews = await store.listCrews(200);
        const tags = new Map(crews.map((c) => [c.id, c.tag]));
        pool = people.filter((o) => o.id !== p.id).map((o) => ({ player: o, crewTag: o.crewId ? tags.get(o.crewId) ?? null : null }));
      }
      // Bloodhounds work out (part of) who robbed them.
      const leads = new Map<string, string>();
      if (specTier(p, "private_eye")) {
        for (const r of (p.robbedIn ?? []).slice(0, 8)) {
          const c = all.find((x) => x.id === r.caseId);
          const who = c?.culpritId ? await store.get(c.culpritId) : null;
          const lead = who ? robberLead(p, who.name) : null;
          if (lead) leads.set(r.caseId, lead);
        }
      }
      return NextResponse.json({
        block,
        detective,
        lawyer: isLawyer(p),
        judge: isJudge(p),
        canProtect: official,
        cases: block
          ? []
          : cases
              .filter((c) => !c.trial?.verdict)
              .slice(0, 20)
              .map((c) => caseView(c, p, now, detective && !c.trial ? suspectsFor(c, pool) : undefined)),
        court: cases.filter((c) => c.trial).slice(0, 20).map((c) => trialView(c, p, now)),
        labTips: detective ? labTips(await store.listCrews(200), country, now) : [],
        launderFlags: detective && cityHall ? flagsView(cityHall, p, now) : [],
        roles: { medic, banker, vigilante },
        patients: medic
          ? cases.filter((c) => c.kind !== "pickpocket" && !c.examinedBy && !c.trial?.verdict && !c.hunt && !caseCold(c, now)).slice(0, 10).map((c) => patientView(c, p, now))
          : [],
        deposits: banker ? cases.filter((c) => c.deposit && !c.deposit.review && !caseCold(c, now) && !c.trial?.verdict).slice(0, 10).map((c) => depositView(c, p, now)) : [],
        contracts: mafia
          ? all.filter((c) => c.contract && !c.contract.done && c.victimId !== p.id).slice(0, 10).map((c) => contractView(c, p, now))
          : [],
        robbed: (p.robbedIn ?? []).map((r) => {
          const c = all.find((x) => x.id === r.caseId);
          return {
            caseId: r.caseId,
            amount: r.amount,
            district: r.district,
            at: r.at,
            contract: c?.contract ? { reward: c.contract.reward, done: c.contract.done } : null,
            closed: !c || c.trial?.verdict === "guilty",
            lead: leads.get(r.caseId) ?? null,
          };
        }),
        racket: mafia
          ? {
              myCases: (p.myCases ?? []).map((m) => myCaseView(all.find((c) => c.id === m.caseId) ?? null, m, p, now)),
              cops: people
                .filter((o) => o.id !== p.id && !o.dead && o.path === "police" && o.rank >= BALANCE.racket.payoff.copMinRank)
                .slice(0, 20)
                .map((o) => ({ id: o.id, name: o.name, title: rankTitle(o) ?? "" })),
            }
          : null,
        envelopes: all
          .filter((c) => c.payoff?.status === "pending" && c.payoff.copId === p.id)
          .map((c) => ({ caseId: c.id, amount: c.payoff!.amount, crime: c.kind, district: c.district, victimName: c.victimName })),
        officials: ia
          ? people
              .filter((o) => o.id !== p.id && !o.dead && (isOfficial(o) || city?.mayor?.id === o.id || !!city?.candidates.some((x) => x.id === o.id)))
              .slice(0, 30)
              .map((o) => {
                const mayor = city?.mayor?.id === o.id || !!city?.candidates.some((x) => x.id === o.id);
                return { id: o.id, name: o.name, title: mayor ? "Mayor" : rankTitle(o) ?? "", path: o.path, canAudit: auditBlock(p, o, now, mayor) };
              })
          : [],
        scandals: all
          .flatMap((c) => (c.exposed ?? []).map((e) => ({ caseId: c.id, name: e.name, role: e.role, at: e.at, by: e.by })))
          .sort((a, b) => b.at - a.at)
          .slice(0, 10),
        coldCases: vigilante
          ? cases.filter((c) => !c.trial && caseCold(c, now)).slice(0, 10).map((c) => coldCaseView(c, p, now, c.hunt ? [] : suspectsFor(c, pool)))
          : [],
      });
    }
    if (url.searchParams.get("yard")) {
      if (!inJail(p, now)) return NextResponse.json({ inmates: [], open: false });
      const [people, crews, myCrew] = await Promise.all([
        store.listPlayers(countryOf(p), 200),
        store.listCrews(200),
        p.crewId ? store.getCrew(p.crewId) : null,
      ]);
      const tags = new Map(crews.map((c) => [c.id, c.tag]));
      const leading = myCrew && myCrew.leaderId === p.id ? myCrew : null;
      const inmates = people
        .filter((o) => o.id !== p.id && !o.dead && inJail(o, now))
        .slice(0, 40)
        .map((o) => {
          tick(o, now);
          const canInvite = !!leading && !o.crewId && !(leading.invites ?? []).some((i) => i.id === o.id) && leading.members.length < BALANCE.crew.maxMembers;
          return inmateView(p, o, now, o.crewId ? tags.get(o.crewId) ?? null : null, canInvite);
        });
      return NextResponse.json({ inmates, open: true, channel: yardChannel(p) });
    }
    if (url.searchParams.get("directory")) {
      const country = countryOf(p);
      const [locals, city] = await Promise.all([store.listPlayers(country, 200), store.getCity(country)]);
      const here = locals.filter((o) => o.id !== p.id && !o.dead && !o.travel && !isBanned(o, now));
      const online = (o: Player) => now - (o.seenAt ?? 0) < BALANCE.onlineMs;
      const base = (o: Player) => ({ id: o.id, name: o.name, photo: o.profile?.photo ?? null, online: online(o), away: inJail(o, now) ? "In a cell" : inHospital(o, now) ? "In the clinic" : null });
      const ownerIds = [...new Set(Object.values(city?.shops ?? {}).map((h) => h!.ownerId))];
      const owners = new Map((await Promise.all(ownerIds.map((id) => store.get(id)))).filter((o): o is Player => !!o).map((o) => [o.id, o]));
      return NextResponse.json({
        city: COUNTRY_BY_ID[country].capital,
        bankers: here.filter((o) => o.launderService).map((o) => ({ ...base(o), fee: o.launderService!.fee })),
        lawyers: here
          .filter((o) => o.path === "courts" && o.rank >= BALANCE.justice.lawyerRank)
          .map((o) => ({ ...base(o), title: rankTitle(o) ?? "Attorney", fee: retainerFee(o) })),
        doctors: here.filter((o) => o.backAlley).map((o) => ({ ...base(o), fee: backAlleyFee(o) })),
        mechanics: here.filter((o) => o.path === "mechanic" && o.garageService?.open).map((o) => ({ ...base(o), ...mechanicCard(o, p, now) })),
        shops: SHOP_KINDS.flatMap((k) => {
          const h = city?.shops?.[k];
          if (!h) return [];
          const o = owners.get(h.ownerId);
          return [{ kind: k, shop: SHOP.kinds[k].name, icon: SHOP.kinds[k].icon, id: h.ownerId, name: h.ownerName, markup: h.markup, online: o ? online(o) : false }];
        }),
      });
    }
    if (url.searchParams.get("property")) {
      const country = countryOf(p);
      const myCrewNow = p.crewId ? await store.getCrew(p.crewId) : null;
      const leading = myCrewNow?.leaderId === p.id ? myCrewNow : null;
      const owners = (await store.listPropertyOwners(country, 60)).filter((o) => o.id !== p.id);
      owners.forEach((o) => tick(o, now));
      const homes = owners
        .filter((o) => homeIn(o, country) >= 1)
        .slice(0, 20)
        .map((o) => ({
          id: o.id,
          name: o.name,
          photo: o.profile?.photo ?? null,
          home: BALANCE.housing[homeIn(o, country)].name,
          tier: homeIn(o, country),
          alarm: hasAlarm(o, country),
          dog: !!dogAt(o, country, now),
          inTown: ownerHome(o, country, now),
          block: breakInBlock(p, o, now),
          crewJob: leading ? homeJobBlock(leading, p, o, now) ?? (leading.heist ? "Your crew already has a job planned." : null) : "Only a crew leader can plan a crew job.",
        }));
      const cars = owners
        .flatMap((o) => (o.garage ?? []).filter((c) => c.country === country && o.travel?.carId !== c.id).map((c) => ({ o, c })))
        .slice(0, 20)
        .map(({ o, c }) => ({
          ownerId: o.id,
          ownerName: o.name,
          carId: c.id,
          model: c.model,
          name: CARS[c.model].name,
          color: CARS[c.model].color,
          block: carTheftBlock(p, o, c, now),
        }));
      return NextResponse.json({ homes, cars, crewLeader: !!leading });
    }
    if (url.searchParams.get("bankers")) {
      const bankers = (await store.listPlayers(countryOf(p), 200))
        .filter((o) => o.id !== p.id && o.launderService && !o.dead && !inJail(o, now))
        .slice(0, 10)
        .map((o) => ({ id: o.id, name: o.name, fee: o.launderService!.fee }));
      return NextResponse.json({ bankers, mine: p.launderService ?? null, staff: isBankStaff(p) });
    }
    if (url.searchParams.get("backalley")) {
      // Doctors in this city who'll patch you up off the books (only shown to patients).
      if (!inHospital(p, now)) return NextResponse.json({ doctors: [] });
      const doctors = (await store.listPlayers(countryOf(p), 200))
        .filter((o) => o.id !== p.id && o.backAlley && !o.dead && !inJail(o, now))
        .slice(0, 10)
        .map((o) => ({ id: o.id, name: o.name, fee: backAlleyFee(o) }));
      return NextResponse.json({ doctors });
    }
    if (url.searchParams.get("pulse")) {
      // The street feed (what's happening in the city) and what your crew needs from you.
      const country = countryOf(p);
      const [city, real, myCrew] = await Promise.all([store.getCity(country), store.listPlayers(country, 40), p.crewId ? store.getCrew(p.crewId) : null]);
      const { out, all } = await regularsOnStreet(store, country, realOnlineCount(real, now), now);
      const districts = DISTRICTS.filter((d) => d.country === country).map((d) => d.name);
      const outIds = new Set(out.map((o) => o.id));
      const heavies = all.filter(isHeavy).map((o) => {
        const prof = profileFor(p, o, now);
        return {
          id: o.id, name: o.name, photo: o.profile?.photo ?? null, title: prof.title, path: o.path,
          out: outIds.has(o.id), status: prof.status, canAttack: prof.canAttack,
          hours: defFor(o)?.hours ?? null, reputation: o.reputation, tie: o.regular ? tieView(p, o.regular.country, o.regular.key) : null,
        };
      });
      const feed = [...(city?.log ?? []).slice(0, 10).map((l) => ({ at: l.at, text: l.text, kind: "city" as const })), ...ambientLines(out, districts, now).map((l) => ({ ...l, kind: "street" as const }))]
        .filter((l) => now - l.at < 24 * 60 * 60_000)
        .sort((x, y) => y.at - x.at)
        .slice(0, 12);
      const needs: { kind: string; text: string; cta: string; go: string; until: number | null }[] = [];
      const am = myCrew?.ambush;
      if (myCrew && am && am.expiresAt > now) {
        const inIt = [...am.attackers, am.driver, am.lookout].some((x) => x?.id === p.id);
        const open = [am.attackers.length < AM.AMBUSH.maxAttackers ? "attackers" : null, am.driver ? null : "a driver", am.lookout ? null : "a lookout"].filter(Boolean);
        if (myCrew.leaderId === p.id && am.attackers.length) needs.push({ kind: "ambush", text: `The ambush on ${am.targetName} is set.${open.length ? ` Still open: ${open.join(", ")}.` : ""}`, cta: "Give the signal", go: "people:crew", until: am.expiresAt });
        else if (!inIt && open.length) needs.push({ kind: "ambush", text: `Your crew is jumping ${am.targetName}. They need ${open.join(", ")}.`, cta: "Take a role", go: "people:crew", until: am.expiresAt });
      }
      const h = myCrew?.heist;
      if (myCrew && h && !Object.values(h.roles).some((x) => x?.id === p.id)) needs.push({ kind: "heist", text: h.target ? `Your crew is planning a job on ${h.target.name}'s ${h.target.home.toLowerCase()} in ${COUNTRY_BY_ID[h.country].capital}.` : `Your crew is planning a bank job in ${COUNTRY_BY_ID[h.country].capital}.`, cta: "Join the job", go: "people:crew", until: null });
      const br = myCrew?.breakout;
      if (myCrew && br && !br.team.some((x) => x.id === p.id)) needs.push({ kind: "breakout", text: `Your crew is breaking ${br.targetName} out of prison.`, cta: "Join in", go: "people:crew", until: null });
      return NextResponse.json({ feed, needs, heavies });
    }
    if (url.searchParams.get("online")) {
      // Players in this city with the game open right now, with quick actions.
      const [people, crews] = await Promise.all([store.listPlayers(countryOf(p), 80), store.listCrews(200)]);
      const tags = new Map(crews.map((c) => [c.id, c.tag]));
      const real = people.filter((o) => o.id !== p.id && !o.dead && !isBanned(o, now) && now - (o.seenAt ?? 0) < BALANCE.onlineMs);
      const { out } = await regularsOnStreet(store, countryOf(p), real.length + 1, now);
      const online = [...real.slice(0, 30), ...out]
        .map((o) => {
          tick(o, now);
          const prof = profileFor(p, o, now);
          return {
            id: o.id,
            name: o.name,
            title: prof.streetTitle ?? prof.title,
            path: o.path,
            photo: prof.photo,
            crewTag: o.crewId ? tags.get(o.crewId) ?? null : null,
            status: prof.status,
            protected: prof.protected,
            canAttack: prof.canAttack,
            canCrime: Object.fromEntries(CRIME_KINDS.map((k) => [k, crimeBlock(p, o, k, now)])),
            bounty: prof.bounty,
            regular: !!o.regular,
            heavy: !!o.regular && isHeavy(o),
            tie: o.regular ? tieView(p, o.regular.country, o.regular.key) : null,
          };
        });
      return NextResponse.json({ online });
    }
    const channel = url.searchParams.get("channel");
    if (channel) {
      if (channel.startsWith("forum:")) {
        if (!canUseForum(await store.getCrew(channel.slice(6)), p)) throw new GameError("You can't read that forum.");
      } else if (!channelsFor(p).includes(channel)) throw new GameError("You can't read that channel.");
      const blocked = new Set(p.blocked ?? []);
      if (channel === `country:${countryOf(p)}`) await regularChat(store, countryOf(p), now);
      const messages = (await store.listMessages(channel, 60)).filter((m) => !blocked.has(m.authorId));
      return NextResponse.json({ messages });
    }
    const [players0, crews, myCrew, hubCity] = await Promise.all([
      store.listPlayers(countryOf(p), 40),
      store.listCrews(20),
      p.crewId ? store.getCrew(p.crewId) : null,
      store.getCity(countryOf(p)),
    ]);
    const crewTags = new Map(crews.map((c) => [c.id, c.tag]));
    if (myCrew) crewTags.set(myCrew.id, myCrew.tag);
    const leading = myCrew && myCrew.leaderId === p.id ? myCrew : null;
    // Street regulars: the ones out now are always listed; while the city is small, all of them.
    const regs = await regularsOnStreet(store, countryOf(p), realOnlineCount(players0, now), now);
    const outIds = new Set(regs.out.map((r) => r.id));
    const shownRegs = players0.length < 20 ? regs.all : regs.out;
    // Regulars out now count as just seen; the ones off the street go last.
    const seen = (o: Player) => (outIds.has(o.id) ? now : o.regular ? 0 : o.tickAt);
    const players = [...players0, ...shownRegs].sort((a, b) => seen(b) - seen(a));
    const regularRow = (o: Player) => {
      const prof = profileFor(p, o, now);
      const plan = myCrew?.ambush;
      const hire = leading && plan && plan.expiresAt > now && outIds.has(o.id)
        ? (["attacker", "driver", "lookout"] as const).filter((r) => !AM.hireBlock(leading, p, o, r, now))
        : [];
      return {
        ...prof,
        lastSeen: outIds.has(o.id) ? now : prof.lastSeen,
        regular: { out: outIds.has(o.id), line: defFor(o)?.lines[0] ?? null, heavy: isHeavy(o) },
        tie: o.regular ? tieView(p, o.regular.country, o.regular.key) : null,
        crewTag: null, canInvite: false, canForum: false, canCourtMartial: "n/a", canSellGun: false, lawyerFee: null, canFrisk: "n/a",
        canVouch: "n/a", torch: [], contract: null, surgery: null, bounty: 0,
        // Crews can plan to jump one of the city's heavies.
        ambush: leading && isHeavy(o) && !myCrew?.ambush ? AM.planBlock(leading, p, o, now) : "n/a",
        canCrime: Object.fromEntries(CRIME_KINDS.map((k) => [k, crimeBlock(p, o, k, now)])),
        hire,
      };
    };
    // Keep the player's own "leads a crew" record in step (older crews predate it).
    if (!!leading !== !!p.family?.leads) {
      await store.update(p.id, (x) => {
        if (!x) throw new GameError("Create a character first.");
        setLeads(x, !!leading);
        return { player: x, result: null };
      });
    }
    return NextResponse.json({
      players: players
        .filter((o) => o.id !== p.id && !o.dead && !isBanned(o, now))
        .map((o) => {
          if (o.regular) return regularRow(o);
          tick(o, now);
          const prof = profileFor(p, o, now);
          const canInvite = !!leading && !o.crewId && o.path === BALANCE.crew.path && !(leading.invites ?? []).some((i) => i.id === o.id);
          const canForum = !!leading?.forum && o.crewId !== leading.id && !leading.forum.guests.some((g) => g.id === o.id);
          const canCourtMartial = p.path === "military" && o.path === "military" ? courtMartialBlock(p, o, now) : "n/a";
          const canSellGun = sellableGear(p).length > 0 && o.path === "enforcer" && !(o.gunOffers ?? []).some((x) => x.sellerId === p.id);
          const lawyerFee = o.path === "courts" && o.rank >= BALANCE.justice.lawyerRank ? retainerFee(o) : null;
          const canCrime = Object.fromEntries(CRIME_KINDS.map((k) => [k, crimeBlock(p, o, k, now)]));
          const canFrisk = p.path === "police" ? friskBlock(p, o, now) : "n/a";
          return { ...prof, crewTag: prof.crewId ? crewTags.get(prof.crewId) ?? null : null, canInvite, canForum, canCourtMartial, canSellGun, canCrime, lawyerFee, canFrisk, torch: torchTargets(p, o, now),
            contract: leading && !leading.hit && o.crewId !== leading.id ? { cost: hitCost(o), block: contractBlock(leading, p, o, now) } : null,
            ambush: leading && o.crewId !== leading.id ? AM.planBlock(leading, p, o, now) : "n/a",
            surgery: o.surgeryFee && woundsOf(p) ? { fee: o.surgeryFee, block: surgeryBlock(p, o) } : null };
        }),
      invites: p.crewInvites ?? [],
      foundBlock: crewFoundBlock(p),
      joinBlock: crewJoinBlock(p),
      forums: await forumsFor(store, p, myCrew),
      ceremony: leading ? await ceremonyList(store, leading, p) : [],
      crews: crews.map((c) => crewView(c, p)),
      myCrew: myCrew ? crewView(myCrew, p) : null,
      breakout: myCrew ? await crewJailView(store, myCrew, p, now) : null,
      heist: myCrew ? heistView(myCrew, p, now) : null,
      ambush: myCrew ? AM.ambushView(myCrew, p, now) : null,
      contacts: await contactsView(store, p, now),
      hit: myCrew ? hitView(myCrew, p, now) : null,
      hitmen: leading ? await hitmenFor(store, leading, p) : [],
      lab: myCrew ? labView(myCrew, p, now) : null,
      labBuild: myCrew && myCrew.leaderId === p.id && !myCrew.lab,
      police: p.path === "police" && p.rank >= BALANCE.drugBust.minRank,
      channels: channelsFor(p),
      blocked: p.blocked ?? [],
      readsCases: !canReadCases(p) || (!!hubCity && (isCityMayor(hubCity, p) || isChief(hubCity, p))),
      lender: lenderKind(p),
    });
  } catch (e) {
    return failure(e);
  }
}

/** The secret forums this player can open: their own crew's, and any they were invited to. */
async function forumsFor(store: ReturnType<typeof getStore>, p: Player, myCrew: Crew | null) {
  const out: { crewId: string; name: string; tag: string; channel: string; own: boolean; isLeader: boolean; guests: { id: string; name: string }[] }[] = [];
  if (myCrew?.forum) {
    out.push({
      crewId: myCrew.id,
      name: myCrew.forum.name,
      tag: myCrew.tag,
      channel: forumChannel(myCrew.id),
      own: true,
      isLeader: myCrew.leaderId === p.id,
      guests: myCrew.forum.guests.map((g) => ({ id: g.id, name: g.name })),
    });
  }
  for (const f of p.forums ?? []) {
    if (f.crewId === myCrew?.id) continue;
    const crew = await store.getCrew(f.crewId);
    if (!canUseForum(crew, p)) continue;
    out.push({ crewId: f.crewId, name: crew!.forum!.name, tag: crew!.tag, channel: forumChannel(f.crewId), own: false, isLeader: false, guests: [] });
  }
  return out;
}

/** For the leader: made men in the crew who could take a contract (the leader included). */
async function hitmenFor(store: ReturnType<typeof getStore>, crew: Crew, leader: Player) {
  const mates = (await Promise.all(crew.members.map((m) => (m.id === leader.id ? leader : store.get(m.id))))).filter((m): m is Player => !!m);
  return mates.filter((m) => m.path === "enforcer" && m.rank >= HIT.minRank && isMade(m)).map((m) => ({ id: m.id, name: m.name }));
}

/** For the leader: who in the crew could be made, and why not. */
async function ceremonyList(store: ReturnType<typeof getStore>, crew: Crew, leader: Player) {
  const mates = (await Promise.all(crew.members.filter((m) => m.id !== leader.id).map((m) => store.get(m.id)))).filter((m): m is Player => !!m);
  return mates
    .filter((m) => m.path === BALANCE.crew.path)
    .map((m) => ({ id: m.id, name: m.name, made: isMade(m), block: isMade(m) ? null : ceremonyBlock(crew, leader, m) }));
}

/** Loads the acting player and another player, ticks both, and saves both. */
/** Your people: where they are and whether they're around. */
async function contactsView(store: ReturnType<typeof getStore>, p: Player, now: number) {
  const ids = (p.contacts ?? []).slice(0, 30);
  const rows = (await Promise.all(ids.map((id) => store.get(id)))).filter((o): o is Player => !!o && !o.dead && !isBanned(o, now));
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    photo: o.profile?.photo ?? null,
    path: o.path,
    title: rankTitle(o) ?? "Nobody",
    city: COUNTRY_BY_ID[countryOf(o)].capital,
    sameCity: countryOf(o) === countryOf(p),
    online: now - (o.seenAt ?? 0) < BALANCE.onlineMs,
    lastSeen: o.seenAt ?? o.tickAt,
    status: inJail(o, now) ? "jail" : inHospital(o, now) ? "clinic" : o.travel ? "travel" : "ok",
  }));
}

/** Ids of street regulars out right now who might see a crime (one or two of them). */
async function regularWitnesses(store: ReturnType<typeof getStore>, country: CountryId, now: number): Promise<string[]> {
  const real = await store.listPlayers(country, 40);
  const { out } = await regularsOnStreet(store, country, realOnlineCount(real, now), now);
  return out.sort(() => Math.random() - 0.5).slice(0, 2).map((r) => r.id);
}

/** Regulars who saw a crime sometimes talk to the police. */
function regularsTalk(witnesses: Player[], c: CaseFile, culprit: Player | null, now: number) {
  for (const w of witnesses) {
    if (!w.regular || !(w.sightings ?? []).some((s) => s.caseId === c.id)) continue;
    // Friends keep quiet; people you've crossed can't wait to talk.
    const tie = culprit ? tieOf(culprit, w.regular.country, w.regular.key)?.t ?? 0 : 0;
    const chance = tie >= 2 ? 0 : tie <= -2 ? 1 : REGULARS.reportChance;
    if (Math.random() < chance) reportSighting(w, c, culprit && culprit.id !== w.id ? culprit : null, now, Math.random);
    else {
      w.sightings = (w.sightings ?? []).filter((s) => s.caseId !== c.id);
      if (culprit && tie >= 2) notify(culprit, `${w.name} saw what you did. They won't say a word.`, "good", undefined, now);
    }
  }
}

/** Now and then, one of the regulars out on the street says something in city chat. */
async function regularChat(store: ReturnType<typeof getStore>, country: CountryId, now: number) {
  const city = await store.getCity(country);
  if (!city || now - (city.regularChatAt ?? 0) < REGULARS.chatGapMs) return;
  const real = await store.listPlayers(country, 40);
  const { out } = await regularsOnStreet(store, country, realOnlineCount(real, now), now);
  const line = chatLine(out, city.regularChatAt ?? 0, now);
  if (!line) return;
  const posted = await store.transaction(async (tx) => {
    const c = await tx.getCity(country);
    if (!c || now - (c.regularChatAt ?? 0) < REGULARS.chatGapMs) return false;
    c.regularChatAt = now;
    await tx.putCity(c);
    return true;
  });
  if (posted) await store.postMessage({ channel: `country:${country}`, authorId: line.who.id, authorName: `${line.who.name} · regular`, body: line.text });
}

async function withPair<T>(tx: Tx, myId: string, otherId: string, now: number, fn: (a: Player, b: Player) => T): Promise<T> {
  const [a, b] = await tx.getPlayers([myId, otherId]);
  if (!a) throw new GameError("Create a character first.");
  if (!b) throw new GameError("That player doesn't exist.");
  tick(a, now);
  tick(b, now);
  const out = fn(a, b);
  await tx.putPlayer(a);
  await tx.putPlayer(b);
  return out;
}

const cleanBody = (raw: unknown) => {
  const body = typeof raw === "string" ? raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
  if (!body) throw new GameError("Say something.");
  if (body.length > BALANCE.chat.maxLength) throw new GameError(`Keep it under ${BALANCE.chat.maxLength} characters.`);
  return body;
};

const str = (v: unknown) => {
  if (typeof v !== "string" || !v || v.length > 80) throw new GameError("Bad request.");
  return v;
};

export async function POST(req: Request) {
  try {
    assertJson(req);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const { playerId } = await resolveIdentity(false);
    if (!playerId) throw new GameError("Create a character first.");
    const store = getStore();
    const now = Date.now();
    // Suspended characters can look around but not act.
    assertActive(await store.get(playerId), now);
    let events: GameEvent[] = [];
    if (!REGULAR_OPS.has(String(b.op)) && Object.values(b).some(isRegularId)) {
      throw new GameError("They're a street regular. They keep to themselves.");
    }

    switch (b.op) {
      case "say": {
        const channel = str(b.channel);
        const body = cleanBody(b.body);
        const forumCrew = channel.startsWith("forum:") ? await store.getCrew(channel.slice(6)) : null;
        const author = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          if (channel.startsWith("forum:") ? !canUseForum(forumCrew, p) : !channelsFor(p).includes(channel)) throw new GameError("You can't post there.");
          assertCanSpeak(p, now);
          if (now - (p.lastChatAt ?? 0) < BALANCE.chat.cooldownMs) throw new GameError("Slow down a little.");
          p.lastChatAt = now;
          return { player: p, result: p };
        });
        await store.postMessage({ channel, authorId: author.id, authorName: author.name, body });
        break;
      }
      case "block":
      case "unblock": {
        const target = str(b.targetId);
        await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          const set = new Set(p.blocked ?? []);
          if (b.op === "block") set.add(target);
          else set.delete(target);
          p.blocked = [...set].slice(0, 200);
          return { player: p, result: null };
        });
        break;
      }
      case "attack": {
        const target = str(b.targetId);
        events = await store.transaction((tx) =>
          withPair(tx, playerId, target, now, (a, t) => {
            const small = !!t.regular && a.reputation > t.reputation * 3 + 15;
            const out = attackPlayer(a, t, now, Math.random).events;
            if (t.regular) {
              tieShift(a, t.regular.country, t.regular.key, -2, "You attacked them.", now);
              const won = !!out.find((e) => e.fight)?.fight?.won;
              if (small) {
                a.reputation = Math.max(0, a.reputation - 2);
                out.push({ tone: "info", text: "Beating up nobodies doesn't impress anyone. -2 reputation." });
              } else if (won && isHeavy(t)) {
                a.reputation += HEAVY_WIN_REP;
                addJournal(a, now, "street", `Took down ${t.name}, one of the city's heavies.`);
                out.push({ tone: "story", text: `You put ${t.name} on the ground. The whole city will hear about this. +${HEAVY_WIN_REP} reputation.` });
              }
            }
            return out;
          }),
        );
        break;
      }
      case "crime": {
        const target = str(b.targetId);
        if (!isCrimeKind(b.kind)) throw new GameError("Bad request.");
        const kind = b.kind;
        const self = await store.get(playerId);
        if (!self) throw new GameError("Create a character first.");
        const country = countryOf(self);
        // Anyone active nearby in the last half hour may have seen it.
        const nearby = (await store.listPlayers(country, 40))
          .filter((o) => o.id !== playerId && o.id !== target && !o.dead && !o.travel && now - o.tickAt < BALANCE.crime.witnessWindowMs)
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(BALANCE.crime.maxWitnesses, cityEvent(country, now)?.maxWitnesses ?? 99))
          .map((o) => o.id);
        nearby.push(...(await regularWitnesses(store, country, now)).filter((id) => id !== target));
        const crewTag = self.crewId ? (await store.getCrew(self.crewId))?.tag ?? null : null;
        const city = await store.getCity(country);
        const crack = crackdownOn(city, now);
        const caseId = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        events = await store.transaction(async (tx) => {
          const [a, t, ...rest] = await tx.getPlayers([playerId, target, ...nearby]);
          if (!a) throw new GameError("Create a character first.");
          if (!t) throw new GameError("That player doesn't exist.");
          tick(a, now);
          tick(t, now);
          const witnesses = rest.filter((w): w is Player => !!w && countryOf(w) === country);
          witnesses.forEach((w) => tick(w, now));
          const out = commitCrime(a, t, kind, now, Math.random, { caseId, district: crimeDistrict(a, Math.random), crewTag, witnesses, crackdown: crack });
          if (out.caseFile) regularsTalk(witnesses, out.caseFile, a, now);
          if (t.regular) {
            tieShift(a, t.regular.country, t.regular.key, -2, `You tried to ${kind} them.`, now);
            if (a.reputation > t.reputation * 3 + 15) a.reputation = Math.max(0, a.reputation - 1);
          }
          await tx.putPlayer(a);
          await tx.putPlayer(t);
          if (out.caseFile) {
            for (const w of witnesses) await tx.putPlayer(w);
            await tx.putCase(out.caseFile);
          }
          return out.events;
        });
        break;
      }
      case "mech_hire": {
        const mechId = str(b.mechanicId);
        if (!isMechService(b.service)) throw new GameError("Bad request.");
        const service = b.service;
        const target = typeof b.target === "string" && b.target.length <= 80 ? b.target : undefined;
        events = await store.transaction(async (tx) => {
          const [me, m] = await tx.getPlayers([playerId, mechId]);
          if (!me) throw new GameError("Create a character first.");
          if (!m) throw new GameError("That mechanic doesn't exist.");
          tick(me, now);
          tick(m, now);
          if (me.travel) throw new GameError("You're on the road.");
          const out = hireMechanic(m, me, service, target, now);
          await tx.putPlayer(me);
          await tx.putPlayer(m);
          return out;
        });
        break;
      }
      case "burgle":
      case "steal_car": {
        const target = str(b.targetId);
        const carId = b.op === "steal_car" ? str(b.carId) : "";
        const self = await store.get(playerId);
        if (!self) throw new GameError("Create a character first.");
        const country = countryOf(self);
        const nearby = (await store.listPlayers(country, 40))
          .filter((o) => o.id !== playerId && o.id !== target && !o.dead && !o.travel && now - o.tickAt < BALANCE.crime.witnessWindowMs)
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(BALANCE.crime.maxWitnesses, cityEvent(country, now)?.maxWitnesses ?? 99))
          .map((o) => o.id);
        nearby.push(...(await regularWitnesses(store, country, now)).filter((id) => id !== target));
        const crewTag = self.crewId ? (await store.getCrew(self.crewId))?.tag ?? null : null;
        const caseId = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        events = await store.transaction(async (tx) => {
          const [a, t, ...rest] = await tx.getPlayers([playerId, target, ...nearby]);
          if (!a) throw new GameError("Create a character first.");
          if (!t || t.regular) throw new GameError("That player doesn't exist.");
          tick(a, now);
          tick(t, now);
          const witnesses = rest.filter((w): w is Player => !!w && countryOf(w) === country);
          witnesses.forEach((w) => tick(w, now));
          const ctx = { caseId, district: crimeDistrict(a, Math.random), crewTag, witnesses };
          const out = b.op === "burgle" ? breakIn(a, t, now, Math.random, ctx) : stealCar(a, t, carId, now, Math.random, ctx);
          if (out.caseFile) regularsTalk(witnesses, out.caseFile, a, now);
          await tx.putPlayer(a);
          await tx.putPlayer(t);
          if (out.caseFile) {
            for (const w of witnesses) await tx.putPlayer(w);
            await tx.putCase(out.caseFile);
          }
          return out.events;
        });
        break;
      }
      case "report": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          const [w, culprit] = await tx.getPlayers([playerId, c?.culpritId ?? playerId]);
          if (!w) throw new GameError("Create a character first.");
          if (!c) {
            ignoreSighting(w, caseId);
            await tx.putPlayer(w);
            return [{ tone: "info", text: "That case is closed." }] as GameEvent[];
          }
          const out = reportSighting(w, c, culprit && culprit.id !== w.id ? culprit : null, now, Math.random);
          await tx.putPlayer(w);
          if (culprit && culprit.id !== w.id) await tx.putPlayer(culprit);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "ignore": {
        const caseId = str(b.caseId);
        events = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          return { player: p, result: ignoreSighting(p, caseId) };
        });
        break;
      }
      case "investigate": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [o] = await tx.getPlayers([playerId]);
          if (!o) throw new GameError("Create a character first.");
          tick(o, now);
          const out = investigate(o, c, now, Math.random);
          await tx.putPlayer(o);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "search_home": {
        const caseId = str(b.caseId);
        const suspectId = str(b.suspectId);
        const self = await store.get(playerId);
        if (!self) throw new GameError("Create a character first.");
        const [people, crews] = await Promise.all([store.listPlayers(countryOf(self), 200), store.listCrews(200)]);
        const tags = new Map(crews.map((c) => [c.id, c.tag]));
        const tagOf = (o: Player) => (o.crewId ? tags.get(o.crewId) ?? null : null);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [o, suspect] = await tx.getPlayers([playerId, suspectId]);
          if (!o) throw new GameError("Create a character first.");
          if (!suspect) throw new GameError("That player doesn't exist.");
          tick(o, now);
          const pool = people.filter((x) => x.id !== o.id).map((x) => ({ player: x, crewTag: tagOf(x) }));
          const out = searchHome(o, suspect, c, pool, tagOf(suspect), now, Math.random);
          await tx.putPlayer(o);
          await tx.putPlayer(suspect);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "hire_lawyer": {
        const lawyerId = str(b.lawyerId);
        events = await store.transaction((tx) => withPair(tx, playerId, lawyerId, now, (client, lawyer) => hireLawyer(client, lawyer, now, lawyerPower(lawyer))));
        break;
      }
      case "back_alley_toggle": {
        events = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          return { player: p, result: setBackAlley(p, b.open === true) };
        });
        break;
      }
      case "back_alley": {
        const doctorId = str(b.doctorId);
        events = await store.transaction((tx) => withPair(tx, playerId, doctorId, now, (patient, doctor) => backAlleyTreat(patient, doctor, now)));
        break;
      }
      case "loan_offer": {
        const borrowerId = str(b.borrowerId);
        events = await store.transaction((tx) =>
          withPair(tx, playerId, borrowerId, now, (lender, borrower) => offerLoan(lender, borrower, Number(b.amount), Number(b.rate), now)),
        );
        break;
      }
      case "loan_accept": {
        const lenderId = str(b.lenderId);
        events = await store.transaction((tx) => withPair(tx, playerId, lenderId, now, (borrower, lender) => acceptLoan(borrower, lender, str(b.offerId), now)));
        break;
      }
      case "loan_decline": {
        const offerId = str(b.offerId);
        await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          p.loanOffers = (p.loanOffers ?? []).filter((o) => o.id !== offerId);
          return { player: p, result: null };
        });
        break;
      }
      case "loan_repay": {
        const lenderId = str(b.lenderId);
        events = await store.transaction((tx) => withPair(tx, playerId, lenderId, now, (borrower, lender) => repayLoan(borrower, lender, str(b.loanId), now)));
        break;
      }
      case "loan_collect": {
        const borrowerId = str(b.borrowerId);
        events = await store.transaction((tx) => withPair(tx, playerId, borrowerId, now, (lender, borrower) => collectLoan(lender, borrower, str(b.loanId), now, Math.random).events));
        break;
      }
      case "post_contract": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [v] = await tx.getPlayers([playerId]);
          if (!v) throw new GameError("Create a character first.");
          const out = postContract(v, c, Number(b.reward), now);
          await tx.putPlayer(v);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "work_contract": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const rows = await tx.getPlayers([...new Set([playerId, c.culpritId, c.victimId])]);
          const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
          byId.forEach((r) => tick(r, now));
          const m = byId.get(playerId);
          if (!m) throw new GameError("Create a character first.");
          const culprit = c.culpritId !== playerId ? byId.get(c.culpritId) ?? null : null;
          const victim = c.victimId !== playerId ? byId.get(c.victimId) ?? null : null;
          const out = workContract(m, c, culprit, victim, now, Math.random);
          for (const r of byId.values()) await tx.putPlayer(r);
          await tx.putCase(c);
          return out.events;
        });
        break;
      }
      case "launder_service": {
        events = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          return { player: p, result: setLaunderService(p, b.open === true, Number(b.fee)) };
        });
        break;
      }
      case "launder_with": {
        const bankerId = str(b.bankerId);
        events = await store.transaction(async (tx) => {
          const [client, banker] = await tx.getPlayers([playerId, bankerId]);
          if (!client) throw new GameError("Create a character first.");
          if (!banker) throw new GameError("That banker isn't taking clients.");
          tick(client, now);
          const out = launderWithBanker(client, banker, Number(b.amount), now);
          await tx.putPlayer(client);
          await tx.putPlayer(banker);
          if (out.flag) {
            const city = (await tx.getCity(countryOf(client))) ?? newCity(countryOf(client), now);
            flagLaundering(city, client.id, Math.floor(Number(b.amount)), `${banker.name}'s bank`, now);
            await tx.putCity(city);
          }
          return out.events;
        });
        break;
      }
      case "frisk": {
        const target = str(b.targetId);
        events = await store.transaction((tx) => withPair(tx, playerId, target, now, (o, t) => frisk(o, t, now, Math.random)));
        break;
      }
      case "lab_build":
      case "lab_cook": {
        const self = await store.get(playerId);
        if (!self?.crewId) throw new GameError("You're not in a crew.");
        const crewId = self.crewId;
        events = await store.transaction(async (tx) => {
          const [me] = await tx.getPlayers([playerId]);
          if (!me) throw new GameError("Create a character first.");
          tick(me, now);
          const crew = await tx.getCrew(crewId);
          if (!crew) throw new GameError("Your crew is gone.");
          const out =
            b.op === "lab_build"
              ? buildLab(crew, me, now, Math.random)
              : (() => {
                  if (!isDrug(b.drug)) throw new GameError("Bad request.");
                  return labCook(crew, me, b.drug, now, Math.random);
                })();
          await tx.putPlayer(me);
          await tx.putCrew(crew);
          return out;
        });
        break;
      }
      case "raid_lab": {
        const crewId = str(b.crewId);
        events = await store.transaction(async (tx) => {
          const [o] = await tx.getPlayers([playerId]);
          if (!o) throw new GameError("Create a character first.");
          tick(o, now);
          const crew = await tx.getCrew(crewId);
          if (!crew) throw new GameError("There's nothing there anymore.");
          const out = raidLab(o, crew, now, Math.random);
          await tx.putPlayer(o);
          await tx.putCrew(crew);
          return out;
        });
        break;
      }
      case "probe": {
        const flagId = str(b.flagId);
        const self = await store.get(playerId);
        if (!self) throw new GameError("Create a character first.");
        const pre = await store.getCity(countryOf(self));
        const suspectId = pre?.launderFlags?.find((f) => f.id === flagId)?.playerId;
        events = await store.transaction(async (tx) => {
          const [o, launderer] = await tx.getPlayers([playerId, suspectId ?? playerId]);
          if (!o) throw new GameError("Create a character first.");
          tick(o, now);
          const city = await tx.getCity(countryOf(o));
          if (!city) throw new GameError("That trail is closed.");
          const l = launderer && launderer.id !== o.id ? launderer : null;
          const out = probeLaundering(o, city, flagId, l, now, Math.random);
          await tx.putPlayer(o);
          if (l) await tx.putPlayer(l);
          await tx.putCity(city);
          return out;
        });
        break;
      }
      case "arrest": {
        const caseId = str(b.caseId);
        const suspectId = str(b.suspectId);
        const self = await store.get(playerId);
        if (!self) throw new GameError("Create a character first.");
        // Who the detective could have picked: everyone in the country who fits.
        const [people, crews] = await Promise.all([store.listPlayers(countryOf(self), 200), store.listCrews(200)]);
        const tags = new Map(crews.map((c) => [c.id, c.tag]));
        const tagOf = (o: Player) => (o.crewId ? tags.get(o.crewId) ?? null : null);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [o, suspect] = await tx.getPlayers([playerId, suspectId]);
          if (!o) throw new GameError("Create a character first.");
          if (!suspect) throw new GameError("That player doesn't exist.");
          tick(o, now);
          tick(suspect, now);
          const pool = people.filter((x) => x.id !== o.id).map((x) => ({ player: x, crewTag: tagOf(x) }));
          const out = arrest(o, suspect, c, pool, tagOf(suspect), now);
          await tx.putPlayer(o);
          await tx.putPlayer(suspect);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "court_join": {
        const caseId = str(b.caseId);
        const side = b.side === "defender" ? "defender" : b.side === "prosecutor" ? "prosecutor" : null;
        if (!side) throw new GameError("Bad request.");
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c?.trial) throw new GameError("There's no trial to join.");
          const [l, suspect] = await tx.getPlayers([playerId, c.trial.suspectId]);
          if (!l) throw new GameError("Create a character first.");
          const out = joinTrial(l, c, side, suspect && suspect.id !== l.id ? suspect : null, now);
          if (suspect && suspect.id !== l.id) await tx.putPlayer(suspect);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "bribe": {
        const caseId = str(b.caseId);
        const amount = Number(b.amount);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [s] = await tx.getPlayers([playerId]);
          if (!s) throw new GameError("Create a character first.");
          tick(s, now);
          const out = offerBribe(s, c, amount);
          await tx.putPlayer(s);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "bail": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c?.trial) throw new GameError("There's no one to bail out.");
          const [payer, suspect] = await tx.getPlayers([playerId, c.trial.suspectId]);
          if (!payer) throw new GameError("Create a character first.");
          if (!suspect) throw new GameError("They're not around anymore.");
          tick(payer, now);
          const s = suspect.id === payer.id ? payer : suspect;
          const out = postBail(payer, s, c, now);
          await tx.putPlayer(payer);
          if (s !== payer) await tx.putPlayer(s);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "protect_witnesses": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [me] = await tx.getPlayers([playerId]);
          if (!me) throw new GameError("Create a character first.");
          const city = await tx.getCity(c.country);
          if (!city) throw new GameError("City hall is empty.");
          advanceCity(city, now);
          const out = protectWitnesses(city, me, c, now);
          await tx.putCase(c);
          await tx.putCity(city);
          return out;
        });
        break;
      }
      case "rule": {
        const caseId = str(b.caseId);
        const takeBribe = b.takeBribe === true;
        const verdict = b.verdict === "guilty" || b.verdict === "not_guilty" ? b.verdict : undefined;
        if (!takeBribe && !verdict) throw new GameError("Guilty or not guilty?");
        events = await settleTrial(store, caseId, now, { judgeId: playerId, verdict, takeBribe });
        break;
      }
      case "examine": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [d, victim] = await tx.getPlayers([playerId, c.victimId]);
          if (!d) throw new GameError("Create a character first.");
          tick(d, now);
          const v = victim && victim.id !== d.id ? victim : null;
          if (v) tick(v, now);
          const out = examine(d, c, v, now, Math.random);
          await tx.putPlayer(d);
          if (v) await tx.putPlayer(v);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "review_deposit": {
        const caseId = str(b.caseId);
        const choice = b.choice === "bury" ? "bury" : b.choice === "report" ? "report" : null;
        if (!choice) throw new GameError("Bad request.");
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [banker, depositor] = await tx.getPlayers([playerId, c.culpritId]);
          if (!banker) throw new GameError("Create a character first.");
          const dep = depositor && depositor.id !== banker.id ? depositor : null;
          const out = reviewDeposit(banker, c, dep, choice, now, Math.random);
          await tx.putPlayer(banker);
          if (dep) await tx.putPlayer(dep);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "hunt": {
        const caseId = str(b.caseId);
        const suspectId = str(b.suspectId);
        const self = await store.get(playerId);
        if (!self) throw new GameError("Create a character first.");
        const [people, crews] = await Promise.all([store.listPlayers(countryOf(self), 200), store.listCrews(200)]);
        const tags = new Map(crews.map((c) => [c.id, c.tag]));
        const tagOf = (o: Player) => (o.crewId ? tags.get(o.crewId) ?? null : null);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case doesn't exist.");
          const [v, suspect, victim] = await tx.getPlayers([playerId, suspectId, c.victimId]);
          if (!v) throw new GameError("Create a character first.");
          if (!suspect) throw new GameError("That player doesn't exist.");
          tick(v, now);
          tick(suspect, now);
          const vic = victim && victim.id !== v.id && victim.id !== suspect.id ? victim : null;
          const pool = people.filter((x) => x.id !== v.id).map((x) => ({ player: x, crewTag: tagOf(x) }));
          const out = hunt(v, suspect, vic, c, pool, tagOf(suspect), now, Math.random);
          await tx.putPlayer(v);
          await tx.putPlayer(suspect);
          if (vic) await tx.putPlayer(vic);
          await tx.putCase(c);
          return out.events;
        });
        break;
      }
      case "intimidate": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case is closed.");
          const witnessIds = [...new Set(c.tips.filter((t) => t.source === "witness" && t.byId).map((t) => t.byId!))].filter((id) => id !== playerId);
          const [m, ...ws] = await tx.getPlayers([playerId, ...witnessIds]);
          if (!m) throw new GameError("Create a character first.");
          tick(m, now);
          const witnesses = ws.filter((w): w is Player => !!w);
          const out = intimidate(m, c, witnesses, now, Math.random);
          await tx.putPlayer(m);
          for (const w of witnesses) await tx.putPlayer(w);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "payoff": {
        const caseId = str(b.caseId);
        const copId = str(b.copId);
        const amount = Number(b.amount);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case is closed.");
          const [m, cop] = await tx.getPlayers([playerId, copId]);
          if (!m) throw new GameError("Create a character first.");
          if (!cop) throw new GameError("Pick an officer.");
          tick(m, now);
          const out = offerPayoff(m, c, cop, amount, now);
          await tx.putPlayer(m);
          await tx.putPlayer(cop);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "payoff_withdraw": {
        const caseId = str(b.caseId);
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c) throw new GameError("That case is closed.");
          const [m] = await tx.getPlayers([playerId]);
          if (!m) throw new GameError("Create a character first.");
          const out = withdrawPayoff(m, c);
          await tx.putPlayer(m);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "payoff_answer": {
        const caseId = str(b.caseId);
        const take = b.take === true;
        events = await store.transaction(async (tx) => {
          const c = await tx.getCase(caseId);
          if (!c?.payoff) throw new GameError("There's no envelope for you.");
          const [cop, briber, victim] = await tx.getPlayers([playerId, c.payoff.fromId, c.victimId]);
          if (!cop) throw new GameError("Create a character first.");
          const br = briber && briber.id !== cop.id ? briber : null;
          const vic = victim && victim.id !== cop.id && victim.id !== br?.id ? victim : null;
          const out = answerPayoff(cop, c, br, vic, take, now, Math.random);
          await tx.putPlayer(cop);
          if (br) await tx.putPlayer(br);
          if (vic) await tx.putPlayer(vic);
          await tx.putCase(c);
          return out;
        });
        break;
      }
      case "audit": {
        const targetId = str(b.targetId);
        const self = await store.get(playerId);
        if (!self) throw new GameError("Create a character first.");
        // Find the cases worth pulling first, then lock them.
        const suspectCases = (await store.listCases(countryOf(self), 300)).filter((c) => corruptionIn(c, targetId)).map((c) => c.id);
        events = await store.transaction(async (tx) => {
          const [a, t] = await tx.getPlayers([playerId, targetId]);
          if (!a) throw new GameError("Create a character first.");
          tick(a, now);
          if (t) tick(t, now);
          const locked = [];
          for (const id of suspectCases) {
            const c = await tx.getCase(id);
            if (c) locked.push(c);
          }
          const city = await tx.getCity(countryOf(a));
          const out = audit(a, t!, locked, now, city);
          await tx.putPlayer(a);
          if (t) await tx.putPlayer(t);
          for (const c of out.changed) await tx.putCase(c);
          if (city && out.cityChanged) await tx.putCity(city);
          return out.events;
        });
        break;
      }
      case "yard_fight": {
        const target = str(b.targetId);
        events = await store.transaction((tx) => withPair(tx, playerId, target, now, (a, t) => yardFight(a, t, now, Math.random).events));
        break;
      }
      case "yard_work": {
        events = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          tick(p, now);
          return { player: p, result: prisonWork(p, now, Math.random) };
        });
        break;
      }
      case "post_bounty": {
        const target = str(b.targetId);
        const amount = Number(b.amount);
        events = await store.transaction((tx) => withPair(tx, playerId, target, now, (a, t) => postBounty(a, t, amount, now)));
        break;
      }
      case "torch": {
        const targetId = str(b.targetId);
        const propertyId = str(b.propertyId);
        events = await store.transaction(async (tx) => {
          const [a, owner] = await tx.getPlayers([playerId, targetId]);
          if (!a) throw new GameError("Create a character first.");
          if (!owner) throw new GameError("That player doesn't exist.");
          tick(a, now);
          tick(owner, now);
          const city = await tx.getCity(countryOf(a));
          const out = torchBusiness(a, owner, propertyId, city, now, Math.random);
          await tx.putPlayer(a);
          await tx.putPlayer(owner);
          if (city) await tx.putCity(city);
          return out;
        });
        break;
      }
      case "hit_order": {
        const targetId = str(b.targetId);
        const hitmanId = str(b.hitmanId);
        events = await store.transaction(async (tx) => {
          const rows = await tx.getPlayers([...new Set([playerId, hitmanId, targetId])]);
          const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
          const leader = byId.get(playerId);
          const target = byId.get(targetId);
          const hitman = byId.get(hitmanId) ?? null;
          if (!leader?.crewId) throw new GameError("You're not in a crew.");
          if (!target) throw new GameError("That player doesn't exist.");
          for (const x of byId.values()) tick(x, now);
          const crew = await tx.getCrew(leader.crewId);
          if (!crew) throw new GameError("Your crew is gone.");
          const out = orderHit(crew, leader, hitman!, target, now);
          for (const x of byId.values()) await tx.putPlayer(x);
          await tx.putCrew(crew);
          return out;
        });
        break;
      }
      case "hit_scout":
      case "hit_cancel": {
        const self0 = await store.get(playerId);
        const pre = self0?.crewId ? await store.getCrew(self0.crewId) : null;
        const targetId = pre?.hit?.targetId;
        events = await store.transaction(async (tx) => {
          const rows = await tx.getPlayers([...new Set([playerId, ...(targetId ? [targetId] : [])])]);
          const me = rows.find((r) => r?.id === playerId);
          const target = rows.find((r) => r?.id === targetId) ?? null;
          if (!me?.crewId) throw new GameError("You're not in a crew.");
          tick(me, now);
          if (target) tick(target, now);
          const crew = await tx.getCrew(me.crewId);
          if (!crew) throw new GameError("Your crew is gone.");
          let out: GameEvent[];
          if (b.op === "hit_cancel") out = cancelHit(crew, me, now);
          else {
            if (!target) throw new GameError("The target is gone.");
            out = scoutTarget(crew, me, target, now);
            await tx.putPlayer(target);
          }
          await tx.putPlayer(me);
          await tx.putCrew(crew);
          return out;
        });
        break;
      }
      case "hit_execute": {
        const self0 = await store.get(playerId);
        if (!self0?.crewId) throw new GameError("You're not in a crew.");
        const pre = await store.getCrew(self0.crewId);
        const targetId = pre?.hit?.targetId;
        if (!targetId) throw new GameError("You don't have a contract.");
        const country = countryOf(self0);
        const nearby = (await store.listPlayers(country, 40))
          .filter((o) => o.id !== playerId && o.id !== targetId && !o.dead && !o.travel && now - o.tickAt < BALANCE.crime.witnessWindowMs)
          .sort(() => Math.random() - 0.5)
          .slice(0, BALANCE.crime.maxWitnesses)
          .map((o) => o.id);
        const caseId = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        events = await store.transaction(async (tx) => {
          const [hitman, target, ...rest] = await tx.getPlayers([playerId, targetId, ...nearby]);
          if (!hitman || !target) throw new GameError("The target is gone.");
          tick(hitman, now);
          tick(target, now);
          const witnesses = rest.filter((w): w is Player => !!w && countryOf(w) === country);
          witnesses.forEach((w) => tick(w, now));
          const crew = await tx.getCrew(self0.crewId!);
          if (!crew) throw new GameError("Your crew is gone.");
          const city = await tx.getCity(country);
          const out = executeHit(crew, hitman, target, city, now, Math.random, { caseId, crewTag: crew.tag, witnesses });
          await tx.putPlayer(hitman);
          await tx.putPlayer(target);
          await tx.putCrew(crew);
          if (out.caseFile) {
            for (const w of witnesses) await tx.putPlayer(w);
            await tx.putCase(out.caseFile);
          }
          if (city) await tx.putCity(city);
          return out.events;
        });
        break;
      }
      case "report_player": {
        // A report to the moderators: a player (their photo and intro as they are now) or a chat message.
        const targetId = str(b.targetId);
        const messageId = typeof b.messageId === "number" ? b.messageId : null;
        const msg = messageId !== null ? await store.getMessage(messageId) : null;
        if (messageId !== null && (!msg || msg.authorId !== targetId)) throw new GameError("That message is gone.");
        const target = await store.get(targetId);
        if (!target) throw new GameError("That player doesn't exist.");
        const reporter = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          const reason = checkReport(p, targetId, b.reason, now);
          return { player: p, result: { p, reason } };
        });
        await store.addReport({
          reporterId: playerId,
          reporterName: reporter.p.name,
          targetId,
          targetName: target.name,
          kind: msg ? "message" : "player",
          reason: reporter.reason,
          excerpt: msg ? msg.body : target.profile?.bio ?? "",
          photo: msg ? null : target.profile?.photo ?? null,
          ...(msg ? { messageId: msg.id, channel: msg.channel } : {}),
        });
        events = [{ tone: "good", text: "Thanks. A moderator will look at it." }];
        break;
      }
      case "court_martial": {
        const target = str(b.targetId);
        events = await store.transaction((tx) => withPair(tx, playerId, target, now, (o, s) => bringCharges(o, s, now)));
        break;
      }
      case "gun_offer": {
        const target = str(b.targetId);
        const itemId = str(b.itemId);
        events = await store.transaction((tx) => withPair(tx, playerId, target, now, (s, buyer) => offerGun(s, buyer, itemId, Number(b.price), now)));
        break;
      }
      case "gun_buy": {
        const sellerId = str(b.sellerId);
        const offerId = str(b.offerId);
        events = await store.transaction((tx) => withPair(tx, playerId, sellerId, now, (buyer, seller) => buyGun(buyer, seller, offerId, now)));
        break;
      }
      case "gun_decline": {
        const offerId = str(b.offerId);
        events = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          return { player: p, result: declineGun(p, offerId) };
        });
        break;
      }
      case "vouch": {
        const target = str(b.targetId);
        events = await store.transaction((tx) => withPair(tx, playerId, target, now, (v, t) => vouchFor(v, t, now)));
        break;
      }
      case "crew_create": {
        const { name, tag } = validateCrew(b.name, b.tag);
        const policy = (["open", "request", "invite"].includes(b.policy as string) ? b.policy : "request") as CrewPolicy;
        const taken = (await store.listCrews(500)).some((c) => c.tag === tag);
        if (taken) throw new GameError("That crew tag is taken.");
        await store.transaction(async (tx) => {
          const [p] = await tx.getPlayers([playerId]);
          if (!p) throw new GameError("Create a character first.");
          tick(p, now);
          const crew = createCrew(p, randomUUID().slice(0, 12), name, tag, now, policy);
          await tx.putCrew(crew);
          await tx.putPlayer(p);
        });
        events = [{ tone: "good", text: `${name} [${tag}] is on the map. Invite people to join.` }];
        break;
      }
      case "crew_request":
      case "crew_join": {
        const crewId = str(b.crewId);
        const outcome = await store.transaction(async (tx) => {
          const crew = await tx.getCrew(crewId);
          if (!crew) throw new GameError("That crew doesn't exist.");
          const [p, leader] = await tx.getPlayers([playerId, crew.leaderId]);
          if (!p) throw new GameError("Create a character first.");
          const result = joinCrew(crew, p, now);
          if (leader && leader.id !== p.id) {
            notify(leader, result === "joined" ? `${p.name} joined ${crew.name}.` : `${p.name} wants to join ${crew.name}.`, "info", p, now);
            await tx.putPlayer(leader);
          }
          await tx.putCrew(crew);
          await tx.putPlayer(p);
          return { result, name: crew.name };
        });
        events = [
          outcome.result === "joined"
            ? { tone: "good", text: `You're in ${outcome.name}. Crew members earn 5% more on every job.` }
            : { tone: "info", text: "Request sent. The crew leader decides." },
        ];
        break;
      }
      case "crew_decline_invite": {
        const crewId = str(b.crewId);
        await store.transaction(async (tx) => {
          const [p] = await tx.getPlayers([playerId]);
          if (!p) throw new GameError("Create a character first.");
          const crew = await tx.getCrew(crewId);
          declineInvite(crew, p, crewId);
          if (crew) await tx.putCrew(crew);
          await tx.putPlayer(p);
        });
        break;
      }
      case "crew_invite": {
        const targetId = str(b.playerId);
        await store.transaction(async (tx) => {
          const [leader, target] = await tx.getPlayers([playerId, targetId]);
          if (!leader?.crewId) throw new GameError("You're not in a crew.");
          if (!target) throw new GameError("That player doesn't exist.");
          const crew = await tx.getCrew(leader.crewId);
          if (!crew) throw new GameError("Your crew is gone.");
          inviteToCrew(crew, leader, target, now);
          await tx.putCrew(crew);
          await tx.putPlayer(target);
        });
        events = [{ tone: "good", text: "Invite sent." }];
        break;
      }
      case "crew_policy": {
        const policy = str(b.policy) as CrewPolicy;
        await store.transaction(async (tx) => {
          const [p] = await tx.getPlayers([playerId]);
          const crew = p?.crewId ? await tx.getCrew(p.crewId) : null;
          if (!p || !crew) throw new GameError("You're not in a crew.");
          setPolicy(crew, p, policy, now);
          await tx.putCrew(crew);
        });
        break;
      }
      case "crew_accept":
      case "crew_decline": {
        const recruitId = str(b.playerId);
        await store.transaction(async (tx) => {
          const [leader, recruit] = await tx.getPlayers([playerId, recruitId]);
          if (!leader?.crewId) throw new GameError("You're not in a crew.");
          const crew = await tx.getCrew(leader.crewId);
          if (!crew || crew.leaderId !== leader.id) throw new GameError("Only the leader can do that.");
          if (b.op === "crew_decline" || !recruit) {
            crew.requests = crew.requests.filter((r) => r.id !== recruitId);
          } else {
            acceptJoin(crew, leader, recruit, now);
            await tx.putPlayer(recruit);
          }
          await tx.putCrew(crew);
        });
        break;
      }
      case "crew_leave": {
        await store.transaction(async (tx) => {
          const [p] = await tx.getPlayers([playerId]);
          if (!p?.crewId) throw new GameError("You're not in a crew.");
          const crew = await tx.getCrew(p.crewId);
          if (!crew) {
            p.crewId = null;
          } else if (leaveCrew(crew, p, now)) {
            await tx.deleteCrew(crew.id);
          } else {
            await tx.putCrew(crew);
          }
          // Whoever takes over now leads (the family's rules care).
          const next = crew && crew.members.length ? crew.leaderId : null;
          if (next && next !== playerId) {
            const [heir] = await tx.getPlayers([next]);
            if (heir) {
              setLeads(heir, true);
              await tx.putPlayer(heir);
            }
          }
          await tx.putPlayer(p);
        });
        events = [{ tone: "info", text: "You left the crew." }];
        break;
      }
      case "crew_deposit":
      case "crew_withdraw": {
        const amount = Number(b.amount);
        await store.transaction(async (tx) => {
          const [p] = await tx.getPlayers([playerId]);
          if (!p?.crewId) throw new GameError("You're not in a crew.");
          const crew = await tx.getCrew(p.crewId);
          if (!crew) throw new GameError("Your crew is gone.");
          tick(p, now);
          if (b.op === "crew_deposit") depositToVault(crew, p, amount, now);
          else withdrawFromVault(crew, p, amount, now);
          await tx.putCrew(crew);
          await tx.putPlayer(p);
        });
        break;
      }
      case "breakout_plan":
      case "breakout_join":
      case "breakout_cancel":
      case "breakout_go": {
        const self = await store.get(playerId);
        if (!self?.crewId) throw new GameError("You're not in a crew.");
        const crewNow = await store.getCrew(self.crewId);
        if (!crewNow) throw new GameError("Your crew is gone.");
        const city = await store.getCity(countryOf(self));
        const crack = crackdownOn(city, now);
        // Lock everyone involved: you, the prisoner, and the team.
        const targetId = b.op === "breakout_plan" ? str(b.playerId) : crewNow.breakout?.targetId;
        const ids = [playerId, ...(targetId ? [targetId] : []), ...(crewNow.breakout?.team.map((t) => t.id) ?? [])];
        events = await store.transaction(async (tx) => {
          const rows = await tx.getPlayers([...new Set(ids)]);
          const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
          byId.forEach((r) => tick(r, now));
          const me = byId.get(playerId);
          if (!me) throw new GameError("Create a character first.");
          const crew = await tx.getCrew(crewNow.id);
          if (!crew) throw new GameError("Your crew is gone.");
          let out: GameEvent[];
          if (b.op === "breakout_plan") out = planBreakout(crew, me, byId.get(targetId!) ?? null, now);
          else if (b.op === "breakout_join") out = joinBreakout(crew, me, now);
          else if (b.op === "breakout_cancel") out = cancelBreakout(crew, me, now);
          else {
            if (!crew.breakout) throw new GameError("There's no plan.");
            const target = byId.get(crew.breakout.targetId);
            if (!target) throw new GameError("They're not around anymore.");
            const team = crew.breakout.team.map((t) => byId.get(t.id)).filter((x): x is Player => !!x);
            out = executeBreakout(crew, me, team, target, now, Math.random, crack);
          }
          for (const r of byId.values()) await tx.putPlayer(r);
          await tx.putCrew(crew);
          return out;
        });
        break;
      }
      case "heist_plan":
      case "heist_role":
      case "heist_cancel":
      case "heist_go": {
        const self = await store.get(playerId);
        if (!self?.crewId) throw new GameError("You're not in a crew.");
        const crewNow = await store.getCrew(self.crewId);
        if (!crewNow) throw new GameError("Your crew is gone.");
        const teamIds = Object.values(crewNow.heist?.roles ?? {}).map((x) => x!.id);
        const targetId = b.op === "heist_plan" && typeof b.targetId === "string" ? str(b.targetId) : b.op === "heist_go" ? crewNow.heist?.target?.id ?? null : null;
        // Witnesses for a home job, the same as any break-in.
        const country = countryOf(self);
        const nearby = targetId && b.op === "heist_go"
          ? (await store.listPlayers(country, 40))
              .filter((o) => o.id !== targetId && !teamIds.includes(o.id) && !o.dead && !o.travel && now - o.tickAt < BALANCE.crime.witnessWindowMs)
              .sort(() => Math.random() - 0.5)
              .slice(0, BALANCE.crime.maxWitnesses)
              .map((o) => o.id)
          : [];
        const caseId = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        events = await store.transaction(async (tx) => {
          const rows = await tx.getPlayers([...new Set([playerId, ...teamIds, ...(targetId ? [targetId] : []), ...nearby])]);
          const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
          byId.forEach((r) => tick(r, now));
          const me = byId.get(playerId);
          if (!me) throw new GameError("Create a character first.");
          const crew = await tx.getCrew(crewNow.id);
          if (!crew) throw new GameError("Your crew is gone.");
          let out: GameEvent[];
          let city = null;
          const target = targetId ? byId.get(targetId) ?? null : null;
          let caseFile: CaseFile | null = null;
          if (b.op === "heist_plan" && targetId) {
            if (!target || target.regular) throw new GameError("That player doesn't exist.");
            const block = homeJobBlock(crew, me, target, now);
            if (block) throw new GameError(block);
            out = planHeist(crew, me, now, { id: target.id, name: target.name, home: BALANCE.housing[homeIn(target, countryOf(me))].name });
          } else if (b.op === "heist_plan") out = planHeist(crew, me, now);
          else if (b.op === "heist_role") {
            const role = b.role as HeistRole;
            if (!["driver", "safecracker", "lookout", "muscle"].includes(role)) throw new GameError("Bad request.");
            out = takeRole(crew, me, role, now);
          } else if (b.op === "heist_cancel") out = cancelHeist(crew, me);
          else {
            const roles = crew.heist?.roles ?? {};
            const team = Object.fromEntries(Object.entries(roles).map(([r, x]) => [r, byId.get(x!.id)]).filter(([, v]) => !!v));
            if (crew.heist?.target) {
              if (!target || target.dead) {
                crew.heist = null;
                throw new GameError("They're not around anymore. The job is off.");
              }
              const witnesses = nearby.map((id) => byId.get(id)).filter((w): w is Player => !!w && countryOf(w) === crew.heist!.country);
              const crewTag = crew.tag ?? null;
              const res = runHomeJob(crew, me, team, target, now, Math.random, { caseId, district: crimeDistrict(me, Math.random), crewTag, witnesses });
              out = res.events;
              caseFile = res.caseFile;
            } else {
              city = crew.heist ? await tx.getCity(crew.heist.country) : null;
              out = runHeist(crew, me, team, city, now, Math.random);
            }
          }
          for (const r of byId.values()) await tx.putPlayer(r);
          await tx.putCrew(crew);
          if (city) await tx.putCity(city);
          if (caseFile) await tx.putCase(caseFile);
          return out;
        });
        break;
      }
      case "contact_add":
      case "contact_remove": {
        const who = str(b.playerId);
        if (b.op === "contact_add" && isRegularId(who)) throw new GameError("Regulars don't keep in touch.");
        events = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          if (who === p.id) throw new GameError("That's you.");
          const list = (p.contacts ?? []).filter((x) => x !== who);
          if (b.op === "contact_add") {
            if (list.length >= 30) throw new GameError("Your little black book is full (30). Remove someone first.");
            list.unshift(who);
          }
          p.contacts = list;
          return { player: p, result: [{ tone: "info", text: b.op === "contact_add" ? "Added to your people." : "Removed from your people." }] as GameEvent[] };
        });
        break;
      }
      case "dispose": {
        const choice = b.choice;
        if (choice !== "leave" && choice !== "sea" && choice !== "parlour") throw new GameError("Bad request.");
        events = await store.transaction(async (tx) => {
          const [me] = await tx.getPlayers([playerId]);
          if (!me) throw new GameError("Create a character first.");
          tick(me, now);
          const c = me.disposal ? await tx.getCase(me.disposal.caseId) : null;
          const out = dispose(me, c, choice, now, Math.random);
          await tx.putPlayer(me);
          if (c) await tx.putCase(c);
          return out;
        });
        break;
      }
      case "surgery_fee": {
        const fee = b.fee === null ? null : Number(b.fee);
        events = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          tick(p, now);
          return { player: p, result: setSurgeryFee(p, fee) };
        });
        break;
      }
      case "surgery": {
        const doctorId = str(b.doctorId);
        events = await store.transaction((tx) =>
          withPair(tx, playerId, doctorId, now, (me, doc) => {
            assertNotAlt(me, doc);
            if (countryOf(me) !== countryOf(doc)) throw new GameError("They practice in another city.");
            const out = surgery(me, doc, now);
            notify(doc, `You operated on ${me.name}'s old wounds. +$${doc.surgeryFee}`, "good", me, now);
            return out;
          }),
        );
        break;
      }
      case "ambush_plan":
      case "ambush_hire":
      case "ambush_role":
      case "ambush_leave":
      case "ambush_cancel":
      case "ambush_go": {
        const self = await store.get(playerId);
        if (!self?.crewId) throw new GameError("You're not in a crew.");
        const crewNow = await store.getCrew(self.crewId);
        if (!crewNow) throw new GameError("Your crew is gone.");
        const plan = crewNow.ambush;
        const targetId = b.op === "ambush_plan" ? str(b.targetId) : plan?.targetId ?? null;
        const hireId = b.op === "ambush_hire" ? str(b.regularId) : null;
        if (hireId && !isRegularId(hireId)) throw new GameError("Only street regulars are for hire.");
        const roleIds = plan ? [...plan.attackers.map((x) => x.id), plan.driver?.id, plan.lookout?.id].filter((x): x is string => !!x) : [];
        let backupIds: string[] = [];
        let witnessIds: string[] = [];
        let crewTag: string | null = crewNow.tag;
        if (b.op === "ambush_go" && plan) {
          const country = plan.country;
          const target = await store.get(plan.targetId);
          const nearby = (await store.listPlayers(country, 60)).filter((o) => !o.dead && !o.travel && now - o.tickAt < BALANCE.crime.witnessWindowMs);
          backupIds = target?.crewId
            ? nearby.filter((o) => o.crewId === target.crewId && o.id !== target.id).slice(0, AM.AMBUSH.defenderWeights.length).map((o) => o.id)
            : [];
          witnessIds = nearby
            .filter((o) => o.id !== plan.targetId && o.crewId !== crewNow.id && !backupIds.includes(o.id))
            .sort(() => Math.random() - 0.5)
            .slice(0, Math.min(BALANCE.crime.maxWitnesses, cityEvent(country, now)?.maxWitnesses ?? 99))
            .map((o) => o.id);
          witnessIds.push(...(await regularWitnesses(store, country, now)).filter((id) => !roleIds.includes(id)));
        }
        const caseId = randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
        events = await store.transaction(async (tx) => {
          // Planning tells the whole crew, so they can take a role in time.
          const memberIds = b.op === "ambush_plan" ? crewNow.members.map((m) => m.id) : [];
          const ids = [...new Set([playerId, ...roleIds, ...memberIds, ...(targetId ? [targetId] : []), ...(hireId ? [hireId] : []), ...backupIds, ...witnessIds])];
          const rows = await tx.getPlayers(ids);
          const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
          byId.forEach((r) => tick(r, now));
          const me = byId.get(playerId);
          if (!me) throw new GameError("Create a character first.");
          const crew = await tx.getCrew(crewNow.id);
          if (!crew) throw new GameError("Your crew is gone.");
          let out: GameEvent[];
          if (b.op === "ambush_plan") {
            const t = byId.get(targetId!);
            if (!t) throw new GameError("That player doesn't exist.");
            out = AM.planAmbush(crew, me, t, now);
            for (const id of memberIds) {
              const m = byId.get(id);
              if (m && m.id !== me.id) notify(m, `${me.name} is planning to jump ${t.name}. Take a role in the Crew tab: you have two hours.`, "info", me, now);
            }
          } else if (b.op === "ambush_role") {
            const role = b.role as AmbushRole;
            if (!["attacker", "driver", "lookout"].includes(role)) throw new GameError("Bad request.");
            out = AM.takeRole(crew, me, role, now);
          } else if (b.op === "ambush_hire") {
            const role = b.role as AmbushRole;
            if (!["attacker", "driver", "lookout"].includes(role)) throw new GameError("Bad request.");
            const reg = byId.get(hireId!);
            if (!reg) throw new GameError("They're not around.");
            const { out: outNow } = await regularsOnStreet(store, crew.ambush?.country ?? countryOf(me), 0, now);
            if (!outNow.some((r) => r.id === reg.id)) throw new GameError(`${reg.name} isn't out on the street right now.`);
            out = AM.hireRegular(crew, me, reg, role, now);
          } else if (b.op === "ambush_leave") out = AM.leaveRole(crew, me);
          else if (b.op === "ambush_cancel") out = AM.cancelAmbush(crew, me, now);
          else {
            const a = crew.ambush;
            if (!a) throw new GameError("There's no ambush planned.");
            const target = byId.get(a.targetId);
            if (!target) throw new GameError("They're not around anymore.");
            const ok = (x: Player | undefined): x is Player => !!x && (x.crewId === crew.id || !!x.regular);
            const attackers = a.attackers.map((x) => byId.get(x.id)).filter(ok);
            const driver0 = a.driver ? byId.get(a.driver.id) : undefined;
            const lookout0 = a.lookout ? byId.get(a.lookout.id) : undefined;
            const driver = ok(driver0) ? driver0 : null;
            const lookout = ok(lookout0) ? lookout0 : null;
            const city = await tx.getCity(a.country);
            const res = AM.executeAmbush(crew, me, attackers, driver, lookout, target, city, now, Math.random, {
              caseId,
              crewTag,
              backup: backupIds.map((id) => byId.get(id)).filter((x): x is Player => !!x),
              witnesses: witnessIds.map((id) => byId.get(id)).filter((x): x is Player => !!x),
            });
            if (res.caseFile) {
              regularsTalk(witnessIds.map((id) => byId.get(id)).filter((x): x is Player => !!x), res.caseFile, attackers[0] ?? null, now);
              await tx.putCase(res.caseFile);
            }
            if (city) await tx.putCity(city);
            out = res.events;
          }
          for (const r of byId.values()) await tx.putPlayer(r);
          await tx.putCrew(crew);
          return out;
        });
        break;
      }
      case "crew_ally": {
        // Alliances between crews: propose, accept, decline, break.
        const what = str(b.what);
        const theirId = str(b.crewId);
        const pre = await store.getCrew(theirId);
        await store.transaction(async (tx) => {
          const ids = [playerId, ...(pre && pre.leaderId !== playerId ? [pre.leaderId] : [])];
          const rows = await tx.getPlayers(ids);
          const me = rows.find((r) => r?.id === playerId) ?? null;
          const theirLeader = rows.find((r) => r?.id === pre?.leaderId) ?? null;
          if (!me?.crewId) throw new GameError("You're not in a crew.");
          // Lock both crews in a fixed order.
          const [firstId, secondId] = [me.crewId, theirId].sort();
          const first = await tx.getCrew(firstId);
          const second = firstId === secondId ? first : await tx.getCrew(secondId);
          const mine = first?.id === me.crewId ? first : second;
          const theirs = first?.id === theirId ? first : second;
          if (!mine) throw new GameError("Your crew is gone.");
          if (what === "decline") {
            events = declineAlliance(mine, me, theirId);
          } else if (what === "break") {
            events = breakAlliance(mine, theirs, me, theirId, theirLeader, now);
            if (theirs) await tx.putCrew(theirs);
          } else {
            if (!theirs) throw new GameError("That crew is gone.");
            events = what === "accept" ? acceptAlliance(mine, theirs, me, theirLeader, now) : proposeAlliance(mine, theirs, me, theirLeader, now);
            await tx.putCrew(theirs);
          }
          await tx.putCrew(mine);
          if (theirLeader) await tx.putPlayer(theirLeader);
        });
        break;
      }
      case "crew_make": {
        // The making ceremony: the leader swears a soldier in.
        const targetId = str(b.playerId);
        await store.transaction(async (tx) => {
          const [leader, target] = await tx.getPlayers([playerId, targetId]);
          if (!leader?.crewId) throw new GameError("You're not in a crew.");
          if (!target) throw new GameError("That player doesn't exist.");
          const crew = await tx.getCrew(leader.crewId);
          if (!crew) throw new GameError("Your crew is gone.");
          tick(target, now);
          events = makeMember(crew, leader, target, now);
          await tx.putPlayer(target);
          await tx.putCrew(crew);
        });
        break;
      }
      case "forum_create":
      case "forum_invite":
      case "forum_remove":
      case "forum_leave":
      case "forum_close": {
        const crewId = b.op === "forum_leave" ? str(b.crewId) : null;
        const pre = crewId ? await store.getCrew(crewId) : null;
        const self0 = await store.get(playerId);
        const own = self0?.crewId ? await store.getCrew(self0.crewId) : null;
        const otherIds =
          b.op === "forum_invite" || b.op === "forum_remove"
            ? [str(b.playerId)]
            : b.op === "forum_close"
              ? (own?.forum?.guests ?? []).map((g) => g.id)
              : [];
        await store.transaction(async (tx) => {
          const rows = await tx.getPlayers([...new Set([playerId, ...otherIds])]);
          const byId = new Map(rows.filter((r): r is Player => !!r).map((r) => [r.id, r]));
          const me = byId.get(playerId);
          if (!me) throw new GameError("Create a character first.");
          if (b.op === "forum_leave") {
            const crew = pre ? await tx.getCrew(pre.id) : null;
            events = removeFromForum(crew, me, me, crewId!);
            if (crew) await tx.putCrew(crew);
            await tx.putPlayer(me);
            return;
          }
          const crew = me.crewId ? await tx.getCrew(me.crewId) : null;
          if (!crew) throw new GameError("You're not in a crew.");
          const other = otherIds[0] ? byId.get(otherIds[0]) ?? null : null;
          if (b.op === "forum_create") events = createForum(crew, me, b.name, now);
          else if (b.op === "forum_invite") {
            if (!other) throw new GameError("That player doesn't exist.");
            events = inviteToForum(crew, me, other, now);
          } else if (b.op === "forum_remove") {
            if (!other) throw new GameError("That player doesn't exist.");
            events = removeFromForum(crew, me, other, crew.id);
          } else {
            events = closeForum(crew, me, [...byId.values()].filter((x) => x.id !== playerId), now);
          }
          for (const x of byId.values()) await tx.putPlayer(x);
          await tx.putCrew(crew);
        });
        break;
      }
      case "crew_note": {
        // Leaders can pin a short message in the crew log.
        const body = cleanBody(b.body);
        await store.transaction(async (tx) => {
          const [p] = await tx.getPlayers([playerId]);
          const crew = p?.crewId ? await tx.getCrew(p.crewId) : null;
          if (!p || !crew || crew.leaderId !== p.id) throw new GameError("Only the leader can post notes.");
          assertCanSpeak(p, now);
          crewLog(crew, `📌 ${body}`, now);
          await tx.putCrew(crew);
        });
        break;
      }
      default:
        throw new GameError("Bad request.");
    }

    const p = await store.get(playerId);
    if (!p) throw new GameError("Create a character first.");
    tick(p, now);
    return NextResponse.json({ view: toView(p, now), events });
  } catch (e) {
    return failure(e);
  }
}
