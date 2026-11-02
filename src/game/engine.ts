// Server-side game rules. Pure functions over a Player: no I/O, so they can run in an
// API route today and a database function (or worker) later without changes.

import { BALANCE, maxEnergy, regenMs } from "./balance";
import { gutRead, npcFighter, playerFighter, resolveFight } from "./combat";
import { DISTRICT_BY_ID } from "./content/districts";
import { ITEM_BY_ID } from "./content/items";
import { JOB_BY_ID, type JobDef } from "./content/jobs";
import { mugger, NPC_BY_ID, type NpcDef } from "./content/npcs";
import { keyStatAvg, PATHS } from "./content/paths";
import { emptyStats, statValue, sv, tierOf, TIER_UP_LINES } from "./stats";
import {
  GameError,
  STAT_KEYS,
  type Action,
  type GameEvent,
  type PathId,
  type Player,
  type Rng,
  type StatKey,
} from "./types";

const ALLOWED_FLAGS = new Set(["seen_prologue"]);
const FIGHT_ENERGY = 10;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const randInt = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, arr: T[]) => arr[Math.floor(rng() * arr.length)];

export function cleanName(raw: string): string {
  const name = raw.replace(/\s+/g, " ").trim();
  if (name.length < 2 || name.length > 20 || !/^[\p{L}\p{N} ._'-]+$/u.test(name)) {
    throw new GameError("Pick a street name of 2–20 letters, numbers, spaces or . _ ' -");
  }
  return name;
}

export function createPlayer(id: string, rawName: string, now: number): Player {
  return {
    id,
    name: cleanName(rawName),
    createdAt: now,
    cash: 0,
    bank: 0,
    hasBankAccount: false,
    energy: maxEnergy(0),
    tickAt: now,
    hp: BALANCE.hp.max,
    hospitalUntil: 0,
    fullUntil: 0,
    heat: 0,
    reputation: 0,
    housing: 0,
    inventory: {},
    stats: emptyStats(),
    path: null,
    rank: 0,
    offers: [],
    jobCounts: {},
    jobsSinceRank: 0,
    flags: [],
    assessmentReady: false,
    lastAssessmentAt: 0,
    log: [],
  };
}

export function inHospital(p: Player, now: number): boolean {
  return p.hospitalUntil > now;
}

/** Brings timers up to date: energy and hp regen, heat cooling, hospital discharge. */
export function tick(p: Player, now: number): void {
  const elapsed = Math.max(0, now - p.tickAt);
  if (p.hospitalUntil && p.hospitalUntil <= now) {
    p.hospitalUntil = 0;
    p.hp = BALANCE.hp.max;
  }
  const maxE = maxEnergy(p.housing);
  if (p.energy < maxE) p.energy = Math.min(maxE, p.energy + elapsed / regenMs(p.housing));
  if (!inHospital(p, now) && p.hp < BALANCE.hp.max) {
    p.hp = Math.min(BALANCE.hp.max, p.hp + elapsed / BALANCE.hp.regenMs);
  }
  p.heat = Math.max(0, p.heat - elapsed / BALANCE.heatDecayMs);
  p.tickAt = now;
}

/** Returns why a job can't be done right now, or null. Does not check energy. */
export function jobLock(p: Player, job: JobDef): string | null {
  if (job.path && p.path !== job.path) return "Not your line of work.";
  if (job.minRank && p.rank < job.minRank) return `Needs rank: ${PATHS[job.path!].ranks[job.minRank - 1]}.`;
  const d = DISTRICT_BY_ID[job.district].locked(p);
  if (d && !job.path) return d;
  return job.requires?.(p) ?? null;
}

function grantXp(p: Player, xp: Partial<Record<StatKey, number>>, mult: number, events: GameEvent[]) {
  for (const k of STAT_KEYS) {
    const gain = (xp[k] ?? 0) * mult;
    if (!gain) continue;
    const before = tierOf(statValue(p.stats[k]));
    p.stats[k] += gain;
    const after = tierOf(statValue(p.stats[k]));
    if (after > before) events.push({ tone: "info", text: TIER_UP_LINES[k][Math.min(after - 1, 4)] });
  }
}

function shiftIntegrity(p: Player, delta = 0) {
  p.stats.integrity = clamp(p.stats.integrity + delta, -100, 100);
}

function hospitalize(p: Player, now: number, rng: Rng, events: GameEvent[]) {
  p.hp = 0;
  p.hospitalUntil = now + randInt(rng, BALANCE.hp.hospitalMinMs, BALANCE.hp.hospitalMaxMs);
  p.assessmentReady = true;
  const lost = Math.floor(p.cash * 0.25);
  p.cash -= lost;
  events.push({
    tone: "bad",
    text: `You wake up in the free clinic.${lost ? ` Someone went through your pockets: -$${lost}.` : ""}`,
  });
}

function checkProgress(p: Player, events: GameEvent[]) {
  if (!p.path) {
    for (const id of Object.keys(PATHS) as PathId[]) {
      if (p.offers.includes(id) || p.flags.includes(`declined_${id}`)) continue;
      if (PATHS[id].qualifies(p)) {
        p.offers.push(id);
        events.push({
          tone: "story",
          text: `Someone's been watching you work. ${PATHS[id].contact} wants to talk.`,
          action: { label: "Hear them out", target: `offer:${id}` },
        });
      }
    }
    return;
  }
  const def = PATHS[p.path];
  if (p.rank >= def.ranks.length || p.jobsSinceRank < def.jobsPerRank) return;
  if (keyStatAvg(p, p.path) < def.promotionThresholds[p.rank - 1]) return;
  p.rank += 1;
  p.jobsSinceRank = 0;
  p.reputation += 3;
  const title = def.ranks[p.rank - 1];
  events.push({ tone: "story", text: def.promotion(title) });
  if (p.path === "police") {
    const [s1, s2] = def.keyStats;
    events.push({ tone: "info", text: `Exam notes: ${band(p, s1)} ${band(p, s2)}` });
  }
}

/** A vague comparison to the Gutter population. Accuracy grows with Perception. */
export function band(p: Player, stat: StatKey): string {
  const pct = 100 * (1 - Math.exp(-(sv(p, stat) - 10) / 18));
  const width = clamp(30 - (sv(p, "perception") - 10) / 2, 6, 30);
  const lo = Math.max(0, Math.round((pct - width / 2) / 5) * 5);
  const hi = Math.min(100, Math.max(lo + 5, Math.round((pct + width / 2) / 5) * 5));
  const word: Record<StatKey, string> = {
    strength: "stronger",
    toughness: "tougher",
    agility: "quicker",
    wits: "sharper",
    nerve: "bolder",
    charisma: "more likable",
    perception: "more observant",
  };
  return `${word[stat][0].toUpperCase()}${word[stat].slice(1)} than about ${lo}–${hi}% of people in The Gutter.`;
}

function fightNpc(p: Player, npc: NpcDef, now: number, rng: Rng, events: GameEvent[]) {
  const res = resolveFight(playerFighter(p, BALANCE.hp.max), npcFighter(npc), rng);
  p.hp = res.playerHp;
  events.push({ tone: "info", text: res.lines.join(" ") });
  grantXp(p, { toughness: 0.8, strength: res.won ? 1 : 0.4, agility: 0.5, nerve: 0.6 }, 1, events);
  if (res.won) {
    const loot = randInt(rng, npc.cash[0], npc.cash[1]);
    p.cash += loot;
    p.reputation += npc.reputation;
    p.jobCounts["fight:win"] = (p.jobCounts["fight:win"] ?? 0) + 1;
    events.push({ tone: "good", text: `You beat the ${npc.name}.${loot ? ` +$${loot}` : ""}` });
  } else if (p.hp <= 0) {
    hospitalize(p, now, rng, events);
  } else {
    events.push({ tone: "bad", text: `The ${npc.name} got the better of you.` });
  }
}

function maybeMugging(p: Player, job: JobDef, now: number, rng: Rng, events: GameEvent[]) {
  if (p.cash < BALANCE.muggingMinCash) return;
  if (job.district !== "gutter" && job.district !== "old_market") return;
  if (rng() >= BALANCE.muggingChance) return;
  const m = mugger(p.reputation);
  events.push({ tone: "bad", text: "On the way back, someone steps out of an alley. \"Wallet. Now.\"" });
  const res = resolveFight(playerFighter(p, BALANCE.hp.max), npcFighter(m), rng);
  p.hp = res.playerHp;
  grantXp(p, { toughness: 0.6, nerve: 0.6 }, 1, events);
  if (res.won) {
    p.reputation += 1;
    events.push({ tone: "good", text: "You fight him off and keep your money. (Tip: money in the bank can't be stolen.)" });
    return;
  }
  if (p.hp <= 0) {
    hospitalize(p, now, rng, events);
    return;
  }
  const lost = Math.floor(p.cash * 0.5);
  p.cash -= lost;
  events.push({
    tone: "bad",
    text: `He takes half your cash: -$${lost}. (Money in the bank can't be stolen.)`,
    action: { label: "Go to bank", target: "tab:profile" },
  });
}

function doJob(p: Player, jobId: string, now: number, rng: Rng, events: GameEvent[]) {
  const job = JOB_BY_ID[jobId];
  if (!job) throw new GameError("That job doesn't exist.");
  const lock = jobLock(p, job);
  if (lock) throw new GameError(lock);
  if (p.energy < job.energy) throw new GameError("You're too tired. Rest or eat something.");
  p.energy -= job.energy;
  p.jobCounts[job.id] = (p.jobCounts[job.id] ?? 0) + 1;
  if (job.path) p.jobsSinceRank += 1;
  const falloff = 1 / (1 + (p.jobCounts[job.id] - 1) / BALANCE.repeatFalloff);

  if (job.risk) {
    const avg = job.risk.stats.reduce((s, k) => s + sv(p, k), 0) / job.risk.stats.length;
    const chance = clamp(0.5 + (avg - job.risk.difficulty) / 30, 0.15, 0.95);
    if (rng() >= chance) {
      p.heat += job.risk.failHeat ?? 0;
      grantXp(p, job.xp, falloff * 0.5, events);
      events.push({ tone: "bad", text: job.risk.failText });
      if (job.risk.failHp) {
        p.hp -= job.risk.failHp;
        if (p.hp <= 0) hospitalize(p, now, rng, events);
      }
      checkProgress(p, events);
      return;
    }
  }

  let pay = randInt(rng, job.pay[0], job.pay[1]);
  if (job.payStat) pay = Math.round(pay * (1 + (sv(p, job.payStat) - 10) / 40));
  p.cash += pay;
  p.heat += job.heat ?? 0;
  p.reputation += job.reputation ?? 0;
  shiftIntegrity(p, job.integrity);
  events.push({ tone: "good", text: `${pick(rng, job.lines)} +$${pay}` });
  grantXp(p, job.xp, falloff, events);

  if (job.find && rng() < job.find.chance) {
    const item = ITEM_BY_ID[job.find.itemId];
    p.inventory[item.id] = (p.inventory[item.id] ?? 0) + 1;
    events.push({ tone: "good", text: `You found: ${item.icon} ${item.name}.` });
  }
  checkProgress(p, events);
  maybeMugging(p, job, now, rng, events);
}

function buy(p: Player, itemId: string, events: GameEvent[]) {
  const item = ITEM_BY_ID[itemId];
  if (!item) throw new GameError("That item doesn't exist.");
  if (p.cash < item.price) throw new GameError("You can't afford that. (Cash on hand only.)");
  if (item.kind === "housing") {
    if (p.housing >= (item.housing ?? 0)) throw new GameError("You already have a better place.");
    p.housing = item.housing!;
  } else if (item.kind === "weapon" || item.kind === "armor") {
    if (p.inventory[item.id]) throw new GameError("You already own one.");
    p.inventory[item.id] = 1;
  } else {
    p.inventory[item.id] = (p.inventory[item.id] ?? 0) + 1;
  }
  p.cash -= item.price;
  events.push({ tone: "good", text: `Bought ${item.icon} ${item.name}.` });
}

function useItem(p: Player, itemId: string, now: number, events: GameEvent[]) {
  const item = ITEM_BY_ID[itemId];
  if (!item || !p.inventory[itemId]) throw new GameError("You don't have that.");
  if (item.kind === "food") {
    if (p.fullUntil > now) throw new GameError("You're still full. Try again later.");
    p.energy = Math.min(maxEnergy(p.housing), p.energy + (item.energy ?? 0));
    p.fullUntil = now + BALANCE.foodCooldownMs;
    events.push({ tone: "good", text: `You eat the ${item.name.toLowerCase()}. Energy restored.` });
  } else if (item.kind === "medical") {
    if (inHospital(p, now)) {
      p.hospitalUntil = now + Math.round((p.hospitalUntil - now) / 2);
      events.push({ tone: "good", text: "The nurse patches you up faster. Hospital time halved." });
    } else {
      if (p.hp >= BALANCE.hp.max) throw new GameError("You're not hurt.");
      p.hp = Math.min(BALANCE.hp.max, p.hp + (item.heal ?? 0));
      events.push({ tone: "good", text: "You patch yourself up." });
    }
  } else {
    throw new GameError("You can't use that.");
  }
  p.inventory[itemId] -= 1;
  if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
}

function bank(p: Player, op: "open" | "deposit" | "withdraw", amount: number | undefined, events: GameEvent[]) {
  if (op === "open") {
    if (p.hasBankAccount) throw new GameError("You already have an account.");
    if (p.cash < BALANCE.bankOpenCost) throw new GameError(`Opening an account costs $${BALANCE.bankOpenCost}.`);
    p.cash -= BALANCE.bankOpenCost;
    p.hasBankAccount = true;
    events.push({ tone: "good", text: "Old Market Credit Union: account opened. Your money is safe here." });
    return;
  }
  if (!p.hasBankAccount) throw new GameError("Open an account first.");
  const amt = Math.floor(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new GameError("Enter an amount.");
  if (op === "deposit") {
    if (amt > p.cash) throw new GameError("You don't have that much cash.");
    p.cash -= amt;
    p.bank += amt;
    events.push({ tone: "good", text: `Deposited $${amt}.` });
  } else {
    if (amt > p.bank) throw new GameError("You don't have that much in the bank.");
    p.bank -= amt;
    p.cash += amt;
    events.push({ tone: "good", text: `Withdrew $${amt}.` });
  }
}

function answerOffer(p: Player, path: PathId, accept: boolean, events: GameEvent[]) {
  if (!p.offers.includes(path)) throw new GameError("No such offer.");
  p.offers = p.offers.filter((o) => o !== path);
  if (!accept) {
    p.flags.push(`declined_${path}`);
    events.push({ tone: "info", text: `You turn ${PATHS[path].contact} down. They won't ask twice.` });
    return;
  }
  if (p.path) throw new GameError("You've already chosen your path.");
  p.path = path;
  p.rank = 1;
  p.jobsSinceRank = 0;
  // Choosing one path closes the others in this version.
  for (const o of p.offers) p.flags.push(`declined_${o}`);
  p.offers = [];
  events.push({ tone: "story", text: PATHS[path].accepted });
  events.push({
    tone: "good",
    text: `You are now: ${PATHS[path].ranks[0]}.`,
    action: { label: "See new jobs", target: "tab:jobs" },
  });
}

function assess(p: Player, now: number, events: GameEvent[]) {
  if (!p.assessmentReady) throw new GameError("Doc Mercy only sees patients who've been through the clinic.");
  if (now - p.lastAssessmentAt < BALANCE.assessmentCooldownMs) {
    throw new GameError("Doc Mercy is busy. Come back next week.");
  }
  p.assessmentReady = false;
  p.lastAssessmentAt = now;
  events.push({
    tone: "story",
    text: `Doc Mercy checks your ribs and frowns. "${band(p, "toughness")} ${band(p, "strength")}"`,
  });
}

export function applyAction(p: Player, action: Action, now: number, rng: Rng): GameEvent[] {
  tick(p, now);
  const events: GameEvent[] = [];
  const blockedInHospital = action.type === "job" || action.type === "fight" || action.type === "bank";
  if (blockedInHospital && inHospital(p, now)) throw new GameError("You're in the hospital. Rest up.");

  switch (action.type) {
    case "job":
      doJob(p, action.jobId, now, rng, events);
      break;
    case "fight": {
      const npc = NPC_BY_ID[action.npcId];
      if (!npc) throw new GameError("Nobody by that name around here.");
      const lock = DISTRICT_BY_ID[npc.district].locked(p);
      if (lock) throw new GameError(lock);
      if (p.energy < FIGHT_ENERGY) throw new GameError("You're too tired to fight.");
      if (p.hp < 20) throw new GameError("You're too hurt to fight. Heal up first.");
      p.energy -= FIGHT_ENERGY;
      fightNpc(p, npc, now, rng, events);
      checkProgress(p, events);
      break;
    }
    case "buy":
      buy(p, action.itemId, events);
      break;
    case "use":
      useItem(p, action.itemId, now, events);
      break;
    case "bank":
      bank(p, action.op, action.amount, events);
      break;
    case "offer":
      answerOffer(p, action.path, action.accept, events);
      break;
    case "assess":
      assess(p, now, events);
      break;
    case "flag":
      if (!ALLOWED_FLAGS.has(action.flag)) throw new GameError("Unknown flag.");
      if (!p.flags.includes(action.flag)) p.flags.push(action.flag);
      break;
    case "create":
      throw new GameError("You already have a character.");
    default:
      throw new GameError("Unknown action.");
  }

  p.heat = Math.max(0, p.heat);
  for (const e of events) p.log.unshift({ at: now, text: e.text, tone: e.tone });
  p.log = p.log.slice(0, BALANCE.logSize);
  return events;
}

export function scout(p: Player, npcId: string, now: number): string {
  const npc = NPC_BY_ID[npcId];
  if (!npc) throw new GameError("Nobody by that name around here.");
  const hourSeed = Math.floor(now / 3_600_000);
  return gutRead(p, playerFighter(p, BALANCE.hp.max), npcFighter(npc), `${p.id}:${npcId}:${hourSeed}`);
}

export { FIGHT_ENERGY };
