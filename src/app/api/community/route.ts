import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { countryOf, tick } from "@/game/engine";
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
  return ["global", `country:${countryOf(p)}`, ...(p.crewId ? [`crew:${p.crewId}`] : [])];
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

export async function GET(req: Request) {
  try {
    const store = getStore();
    const p = await me();
    const now = Date.now();
    tick(p, now);
    const url = new URL(req.url);
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
          return { ...prof, crewTag: prof.crewId ? crewTags.get(prof.crewId) ?? null : null, canInvite };
        }),
      invites: p.crewInvites ?? [],
      foundBlock: crewFoundBlock(p),
      crews: crews.map((c) => crewView(c, p)),
      myCrew: myCrew ? crewView(myCrew, p) : null,
      channels: channelsFor(p),
      blocked: p.blocked ?? [],
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
