import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { countryOf, inJail, tick } from "@/game/engine";
import { BALANCE } from "@/game/balance";
import {
  acceptJoin,
  attackPlayer,
  createCrew,
  crewFoundBlock,
  crewLog,
  declineInvite,
  inviteToCrew,
  joinCrew,
  policyOf,
  setPolicy,
  depositToVault,
  leaveCrew,
  notify,
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
import { arrest, isDetective, isJudge, isLawyer, joinTrial, offerBribe, postBail, trialView } from "@/game/justice";
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
import { crackdownOn } from "@/game/city";
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
import { GameError, type Crew, type CrewPolicy, type GameEvent, type Player } from "@/game/types";
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
    ...(member
      ? { vault: c.vault, log: c.log, requests: viewer.id === c.leaderId ? c.requests : [], isLeader: viewer.id === c.leaderId }
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
      const block = canReadCases(p);
      const detective = isDetective(p);
      const medic = isMedic(p);
      const banker = isBanker(p);
      const vigilante = isVigilante(p);
      let pool: { player: Player; crewTag: string | null }[] = [];
      const mafia = isMafia(p);
      const ia = isInternalAffairs(p);
      const city = ia ? await store.getCity(country) : null;
      let people: Player[] = [];
      if (detective || vigilante || mafia || ia) people = await store.listPlayers(country, 200);
      if (detective || vigilante) {
        const crews = await store.listCrews(200);
        const tags = new Map(crews.map((c) => [c.id, c.tag]));
        pool = people.filter((o) => o.id !== p.id).map((o) => ({ player: o, crewTag: o.crewId ? tags.get(o.crewId) ?? null : null }));
      }
      return NextResponse.json({
        block,
        detective,
        lawyer: isLawyer(p),
        judge: isJudge(p),
        cases: block
          ? []
          : cases
              .filter((c) => !c.trial?.verdict)
              .slice(0, 20)
              .map((c) => caseView(c, p, now, detective && !c.trial ? suspectsFor(c, pool) : undefined)),
        court: cases.filter((c) => c.trial).slice(0, 20).map((c) => trialView(c, p, now)),
        roles: { medic, banker, vigilante },
        patients: medic
          ? cases.filter((c) => c.kind !== "pickpocket" && !c.examinedBy && !c.trial?.verdict && !c.hunt && !caseCold(c, now)).slice(0, 10).map((c) => patientView(c, p, now))
          : [],
        deposits: banker ? cases.filter((c) => c.deposit && !c.deposit.review && !caseCold(c, now) && !c.trial?.verdict).slice(0, 10).map((c) => depositView(c, p, now)) : [],
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
              .filter((o) => o.id !== p.id && !o.dead && (isOfficial(o) || city?.mayor?.id === o.id))
              .slice(0, 30)
              .map((o) => {
                const mayor = city?.mayor?.id === o.id;
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
    if (url.searchParams.get("online")) {
      // Players in this city with the game open right now, with quick actions.
      const [people, crews] = await Promise.all([store.listPlayers(countryOf(p), 80), store.listCrews(200)]);
      const tags = new Map(crews.map((c) => [c.id, c.tag]));
      const online = people
        .filter((o) => o.id !== p.id && !o.dead && now - (o.seenAt ?? 0) < BALANCE.onlineMs)
        .slice(0, 30)
        .map((o) => {
          tick(o, now);
          const prof = profileFor(p, o, now);
          return {
            id: o.id,
            name: o.name,
            title: prof.title,
            path: o.path,
            crewTag: o.crewId ? tags.get(o.crewId) ?? null : null,
            status: prof.status,
            protected: prof.protected,
            read: prof.read,
            danger: prof.danger,
            canAttack: prof.canAttack,
            canCrime: Object.fromEntries(CRIME_KINDS.map((k) => [k, crimeBlock(p, o, k, now)])),
          };
        });
      return NextResponse.json({ online });
    }
    const channel = url.searchParams.get("channel");
    if (channel) {
      if (!channelsFor(p).includes(channel)) throw new GameError("You can't read that channel.");
      const blocked = new Set(p.blocked ?? []);
      const messages = (await store.listMessages(channel, 60)).filter((m) => !blocked.has(m.authorId));
      return NextResponse.json({ messages });
    }
    const [players, crews, myCrew] = await Promise.all([
      store.listPlayers(countryOf(p), 40),
      store.listCrews(20),
      p.crewId ? store.getCrew(p.crewId) : null,
    ]);
    const crewTags = new Map(crews.map((c) => [c.id, c.tag]));
    if (myCrew) crewTags.set(myCrew.id, myCrew.tag);
    const leading = myCrew && myCrew.leaderId === p.id ? myCrew : null;
    return NextResponse.json({
      players: players
        .filter((o) => o.id !== p.id && !o.dead)
        .map((o) => {
          tick(o, now);
          const prof = profileFor(p, o, now);
          const canInvite = !!leading && !o.crewId && !(leading.invites ?? []).some((i) => i.id === o.id);
          const canCrime = Object.fromEntries(CRIME_KINDS.map((k) => [k, crimeBlock(p, o, k, now)]));
          return { ...prof, crewTag: prof.crewId ? crewTags.get(prof.crewId) ?? null : null, canInvite, canCrime };
        }),
      invites: p.crewInvites ?? [],
      foundBlock: crewFoundBlock(p),
      crews: crews.map((c) => crewView(c, p)),
      myCrew: myCrew ? crewView(myCrew, p) : null,
      breakout: myCrew ? await crewJailView(store, myCrew, p, now) : null,
      channels: channelsFor(p),
      blocked: p.blocked ?? [],
      readsCases: !canReadCases(p),
    });
  } catch (e) {
    return failure(e);
  }
}

/** Loads the acting player and another player, ticks both, and saves both. */
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
    let events: GameEvent[] = [];

    switch (b.op) {
      case "say": {
        const channel = str(b.channel);
        const body = cleanBody(b.body);
        const author = await store.update(playerId, (p) => {
          if (!p) throw new GameError("Create a character first.");
          if (!channelsFor(p).includes(channel)) throw new GameError("You can't post there.");
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
          withPair(tx, playerId, target, now, (a, t) => attackPlayer(a, t, now, Math.random).events),
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
          .slice(0, BALANCE.crime.maxWitnesses)
          .map((o) => o.id);
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
      case "crew_note": {
        // Leaders can pin a short message in the crew log.
        const body = cleanBody(b.body);
        await store.transaction(async (tx) => {
          const [p] = await tx.getPlayers([playerId]);
          const crew = p?.crewId ? await tx.getCrew(p.crewId) : null;
          if (!p || !crew || crew.leaderId !== p.id) throw new GameError("Only the leader can post notes.");
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
