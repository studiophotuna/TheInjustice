// Rules for players interacting with each other. Pure functions over Player/Crew objects:
// the server loads and saves both sides inside one transaction.

import { BALANCE } from "./balance";
import { gutRead, GUT_READS, playerFighter, resolveFight } from "./combat";
import { PATHS, rankTitle } from "./content/paths";
import { COUNTRY_BY_ID } from "./content/world";
import { countryOf, inHospital } from "./engine";
import { GameError, type Crew, type FightSummary, type GameEvent, type GameEventTone, type Player, type Rng } from "./types";

export function notify(p: Player, text: string, tone: GameEventTone, from?: Player, now = Date.now()) {
  p.inbox = [
    { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, at: now, text, tone, fromId: from?.id, fromName: from?.name, read: false },
    ...(p.inbox ?? []),
  ].slice(0, 30);
}

export function protectedUntil(p: Player): number {
  return p.createdAt + BALANCE.pvp.protectionMs;
}

/** Why `a` can't attack `t` right now, or null. */
export function attackBlock(a: Player, t: Player, now: number): string | null {
  if (a.id === t.id) return "You can't attack yourself.";
  if (a.dead || t.dead) return "They're not around anymore.";
  if (countryOf(a) !== countryOf(t)) return "They're in another country.";
  if (a.travel || t.travel) return "One of you is on the road.";
  if (inHospital(a, now)) return "You're in the hospital.";
  if (inHospital(t, now)) return "They're already in the hospital. Even you have limits.";
  if (now < protectedUntil(t)) return "They're new in town. The street protects newcomers for a while.";
  if (now < protectedUntil(a)) return "You're still new in town. Attacking now would end your protection... and your reputation.";
  if (a.reputation > t.reputation * 3 + 15) return "Picking on someone that small would ruin your name.";
  const last = a.attackLog?.[t.id] ?? 0;
  if (now - last < BALANCE.pvp.cooldownMs) return "You just fought them. Let it cool down.";
  if (a.energy < BALANCE.pvp.energy) return "You're too tired to start a fight.";
  if (a.hp < 20) return "You're too hurt to start a fight.";
  return null;
}

function knockOut(p: Player, now: number, rng: Rng) {
  p.hp = 0;
  const stay = BALANCE.hp.hospitalMinMs + rng() * (BALANCE.hp.hospitalMaxMs - BALANCE.hp.hospitalMinMs);
  p.hospitalUntil = now + Math.round(stay * (p.path === "medicine" ? 0.5 : 1));
  p.assessmentReady = true;
}

/** Player attacks player. Both must already be ticked to `now`. Never fatal. */
export function attackPlayer(a: Player, t: Player, now: number, rng: Rng): { events: GameEvent[]; fight: FightSummary } {
  const block = attackBlock(a, t, now);
  if (block) throw new GameError(block);
  a.energy -= BALANCE.pvp.energy;
  a.attackLog = { ...(a.attackLog ?? {}), [t.id]: now };
  a.heat += BALANCE.pvp.heat * COUNTRY_BY_ID[countryOf(a)].heatMult;

  const res = resolveFight(playerFighter(a, BALANCE.hp.max), { ...playerFighter(t, BALANCE.hp.max), hp: t.hp }, rng);
  const fight: FightSummary = { opponent: t.name, icon: "🧍", won: res.won, lines: res.lines, outcome: res.won ? "win" : "loss" };
  const events: GameEvent[] = [{ tone: res.won ? "good" : "bad", text: `Fight: ${t.name}`, fight }];

  // The defender takes roughly the damage the attacker dealt.
  if (res.won) {
    const taken = Math.floor(t.cash * BALANCE.pvp.cashShare);
    t.cash -= taken;
    a.cash += taken;
    a.reputation += 2;
    t.hp = Math.max(0, t.hp - Math.max(30, t.hp * 0.6));
    if (t.hp <= 0) knockOut(t, now, rng);
    a.hp = res.playerHp;
    events.push({ tone: "good", text: `You beat ${t.name}${taken ? ` and take $${taken}` : ""}.` });
    notify(t, `${a.name} attacked you and won${taken ? `, taking $${taken} from your pockets` : ""}.${t.hp <= 0 ? " You woke up in the clinic." : ""}`, "bad", a, now);
  } else {
    t.reputation += 1;
    a.hp = res.playerHp;
    if (a.hp <= 0) knockOut(a, now, rng);
    fight.outcome = a.hp <= 0 ? "ko" : "loss";
    events.push({ tone: "bad", text: `${t.name} fought you off.${a.hp <= 0 ? " You wake up in the clinic." : ""}` });
    notify(t, `${a.name} tried to jump you. You fought them off. +1 reputation.`, "good", a, now);
  }
  return { events, fight };
}

/** A high-ranking player recommends `t` to the school of the voucher's own career. */
export function vouchFor(v: Player, t: Player, now: number): GameEvent[] {
  if (v.id === t.id) throw new GameError("You can't vouch for yourself.");
  const path = v.path ? PATHS[v.path] : null;
  if (!path?.school) throw new GameError("Only careers with a school accept vouches.");
  if (v.rank < BALANCE.vouch.minRank) {
    throw new GameError(`You need to reach rank ${BALANCE.vouch.minRank} (${path.ranks[BALANCE.vouch.minRank - 1]}) before your word counts.`);
  }
  if (now - (v.lastVouchAt ?? 0) < BALANCE.vouch.cooldownMs) throw new GameError("You can vouch for one person a day.");
  if (t.path) throw new GameError(`${t.name} already has a career.`);
  if (t.vouches?.some((x) => x.path === path.id)) throw new GameError(`Someone already vouched for ${t.name}.`);
  v.lastVouchAt = now;
  t.vouches = [...(t.vouches ?? []), { path: path.id, by: v.name, byId: v.id, at: now }];
  notify(t, `${v.name} (${rankTitle(v)}) vouched for you. Apply to their school for free; the dean still decides.`, "story", v, now);
  return [{ tone: "good", text: `You vouched for ${t.name}. Their application to the ${path.name} school will be free.` }];
}

export interface PublicProfile {
  id: string;
  name: string;
  title: string;
  path: string | null;
  reputation: number;
  city: string;
  status: "ok" | "hospital" | "traveling" | "dead";
  crewId: string | null;
  protected: boolean;
  /** Viewer's gut feeling about a fight with them. */
  read: string;
  danger: number;
  lastSeen: number;
  canAttack: string | null;
  canVouch: string | null;
}

export function profileFor(viewer: Player, p: Player, now: number): PublicProfile {
  const read = gutRead(viewer, playerFighter(viewer, BALANCE.hp.max), playerFighter(p, BALANCE.hp.max), `${viewer.id}:${p.id}:${Math.floor(now / 3_600_000)}`);
  let canVouch: string | null = null;
  const vp = viewer.path ? PATHS[viewer.path] : null;
  if (!vp?.school) canVouch = "Only school careers can vouch.";
  else if (viewer.rank < BALANCE.vouch.minRank) canVouch = `Reach ${vp.ranks[BALANCE.vouch.minRank - 1]} to vouch.`;
  else if (p.path) canVouch = "They already have a career.";
  else if (now - (viewer.lastVouchAt ?? 0) < BALANCE.vouch.cooldownMs) canVouch = "One vouch a day.";
  else if (viewer.id === p.id) canVouch = "That's you.";
  return {
    id: p.id,
    name: p.name,
    title: rankTitle(p) ?? "Nobody",
    path: p.path,
    reputation: p.reputation,
    city: COUNTRY_BY_ID[countryOf(p)].capital,
    status: p.dead ? "dead" : p.travel ? "traveling" : inHospital(p, now) ? "hospital" : "ok",
    crewId: p.crewId ?? null,
    protected: now < protectedUntil(p),
    read,
    danger: GUT_READS.indexOf(read as (typeof GUT_READS)[number]),
    lastSeen: p.tickAt,
    canAttack: attackBlock(viewer, p, now),
    canVouch,
  };
}

// ── Crews ─────────────────────────────────────────────────────────────────

export function validateCrew(name: unknown, tag: unknown): { name: string; tag: string } {
  const n = typeof name === "string" ? name.replace(/\s+/g, " ").trim() : "";
  const t = typeof tag === "string" ? tag.trim().toUpperCase() : "";
  if (!/^[\p{L}\p{N} '&.-]{3,24}$/u.test(n)) throw new GameError("Crew name: 3–24 letters, numbers or spaces.");
  if (!/^[A-Z0-9]{2,4}$/.test(t)) throw new GameError("Crew tag: 2–4 letters or numbers.");
  return { name: n, tag: t };
}

export function createCrew(p: Player, id: string, name: string, tag: string, now: number): Crew {
  if (p.crewId) throw new GameError("Leave your crew first.");
  if (p.cash < BALANCE.crew.createCost) throw new GameError(`Starting a crew costs $${BALANCE.crew.createCost} cash.`);
  p.cash -= BALANCE.crew.createCost;
  p.crewId = id;
  return {
    id,
    name,
    tag,
    leaderId: p.id,
    members: [{ id: p.id, name: p.name, role: "leader", joinedAt: now }],
    requests: [],
    vault: 0,
    log: [{ at: now, text: `${p.name} founded the crew.` }],
    createdAt: now,
  };
}

export function crewLog(c: Crew, text: string, now: number) {
  c.log = [{ at: now, text }, ...c.log].slice(0, 30);
}

export function requestJoin(c: Crew, p: Player, now: number) {
  if (p.crewId) throw new GameError("You're already in a crew.");
  if (c.requests.some((r) => r.id === p.id)) throw new GameError("You already asked. Wait for an answer.");
  if (c.members.length >= BALANCE.crew.maxMembers) throw new GameError("That crew is full.");
  c.requests = [...c.requests, { id: p.id, name: p.name, at: now }].slice(-20);
}

export function acceptJoin(c: Crew, leader: Player, recruit: Player, now: number) {
  if (c.leaderId !== leader.id) throw new GameError("Only the leader can let people in.");
  if (!c.requests.some((r) => r.id === recruit.id)) throw new GameError("They didn't ask to join.");
  c.requests = c.requests.filter((r) => r.id !== recruit.id);
  if (recruit.crewId) throw new GameError(`${recruit.name} joined another crew.`);
  if (c.members.length >= BALANCE.crew.maxMembers) throw new GameError("The crew is full.");
  recruit.crewId = c.id;
  c.members.push({ id: recruit.id, name: recruit.name, role: "member", joinedAt: now });
  crewLog(c, `${recruit.name} joined.`, now);
  notify(recruit, `You're in. Welcome to ${c.name} [${c.tag}]. Crew members earn 5% more on every job.`, "good", leader, now);
}

/** Returns true when the crew is now empty (disbanded). */
export function leaveCrew(c: Crew, p: Player, now: number): boolean {
  if (p.crewId !== c.id) throw new GameError("You're not in that crew.");
  p.crewId = null;
  c.members = c.members.filter((m) => m.id !== p.id);
  crewLog(c, `${p.name} left.`, now);
  if (c.members.length === 0) return true;
  if (c.leaderId === p.id) {
    c.leaderId = c.members[0].id;
    c.members[0].role = "leader";
    crewLog(c, `${c.members[0].name} is the new leader.`, now);
  }
  return false;
}

export function depositToVault(c: Crew, p: Player, amount: number, now: number) {
  const amt = Math.floor(amount);
  if (p.crewId !== c.id) throw new GameError("You're not in that crew.");
  if (!(amt > 0) || amt > p.cash) throw new GameError("You don't have that much cash.");
  p.cash -= amt;
  c.vault += amt;
  crewLog(c, `${p.name} put $${amt} in the vault.`, now);
}

export function withdrawFromVault(c: Crew, p: Player, amount: number, now: number) {
  const amt = Math.floor(amount);
  if (c.leaderId !== p.id) throw new GameError("Only the leader can open the vault.");
  if (!(amt > 0) || amt > c.vault) throw new GameError("The vault doesn't hold that much.");
  c.vault -= amt;
  p.cash += amt;
  crewLog(c, `${p.name} took $${amt} from the vault.`, now);
}
