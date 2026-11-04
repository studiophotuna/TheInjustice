// Server-side game rules. Pure functions over a Player: no I/O, so they can run in an
// API route today and a database function (or worker) later without changes.

import { regularUpkeep } from "./regulars";
import { addWound, healWounds, playerMaxHp } from "./wounds";
import { careerGapBlock, leaveCareer, legacyPayBonus, veteranFactor } from "./career";
import { updateProfile } from "./profile";
import { hireBodyguards, lieLow } from "./hit";
import { ensureEquipped, equip, equippedId, repair, unequip, usesLeft, wearGear } from "./gear";
import { BALANCE, maxEnergy, regenMs } from "./balance";
import { gutRead, npcFighter, playerFighter, power, resolveFight } from "./combat";
import { DISTRICT_BY_ID, totalJobs } from "./content/districts";
import { CHAPTER_BY_ID } from "./content/story";
import { ITEM_BY_ID } from "./content/items";
import { JOB_BY_ID, type JobDef } from "./content/jobs";
import { mugger, NPC_BY_ID, roadGang, type NpcDef } from "./content/npcs";
import { isGraduation, keyStatAvg, meritNeeded, PATHS } from "./content/paths";
import { SCHOOL_BY_ID } from "./content/schools";
import { PROPERTY_BY_ID, PROPERTY_MAX_HOURS } from "./content/properties";
import { COUNTRY_BY_ID, MODE_BY_ID, tripCost, tripMs } from "./content/world";
import { cityEvent } from "./events";
import { buyDrugs, buySupplies, cook, sellDrugs, smugglingCheck } from "./drugs";
import { launder } from "./money";
import { claimTutorial } from "./tutorial";
import { bumpSeason } from "./season";
import { familyGate, passTest } from "./family";
import { emptyStats, statValue, sv, tierOf, TIER_UP_LINES } from "./stats";
import {
  GameError,
  STAT_KEYS,
  type Action,
  type CountryId,
  type DistrictId,
  type Contract,
  type ContractKind,
  type TravelMode,
  type TripIncident,
  type FightSummary,
  type GameEvent,
  type PathId,
  type Player,
  type Rng,
  type StatKey,
} from "./types";

const ALLOWED_FLAGS = new Set(["seen_prologue", "visited:people", "visited:map", "tut:hidden"]);
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

export function createPlayer(id: string, rawName: string, now: number, country: CountryId = "varrow"): Player {
  if (!COUNTRY_BY_ID[country]) throw new GameError("Pick a country to live in.");
  return {
    id,
    name: cleanName(rawName),
    country,
    homes: { [country]: 0 },
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
    dead: null,
    deaths: 0,
  };
}

export function isDead(p: Player): boolean {
  return !!p.dead;
}

/** In a cell: held for trial or serving a sentence. */
export function inJail(p: Player, now: number): boolean {
  return !!p.custodyCase || (p.jailUntil ?? 0) > now;
}

export function inHospital(p: Player, now: number): boolean {
  return p.hospitalUntil > now;
}

/** Brings timers up to date: energy and hp regen, heat cooling, hospital discharge. */
export function tick(p: Player, now: number): void {
  const elapsed = Math.max(0, now - p.tickAt);
  if (p.jailUntil && p.jailUntil <= now && !p.custodyCase) {
    p.jailUntil = 0;
    p.jailReason = null;
  }
  if (p.hospitalUntil && p.hospitalUntil <= now) {
    p.hospitalUntil = 0;
    p.hp = playerMaxHp(p);
  }
  healWounds(p, now);
  const maxE = maxEnergy(p.housing);
  if (p.energy < maxE) p.energy = Math.min(maxE, p.energy + elapsed / regenMs(p.housing));
  if (!inHospital(p, now) && p.hp < playerMaxHp(p)) {
    p.hp = Math.min(playerMaxHp(p), p.hp + elapsed / BALANCE.hp.regenMs);
  }
  p.heat = Math.max(0, p.heat - elapsed / BALANCE.heatDecayMs);
  if (!p.homes) p.homes = { [countryOf(p)]: p.housing };
  accrueInterest(p, elapsed);
  p.tickAt = now;
  decideApplication(p);
  arrive(p);
  ensureDaily(p, now);
  issueGear(p);
  ensureEquipped(p);
  regularUpkeep(p, now);
}

/**
 * Careers hand out gear at certain ranks (a police officer's service pistol, a soldier's rifle).
 * It's never for sale, and it's handed back if you leave the career.
 */
export function issueGear(p: Player): string[] {
  const issued: string[] = [];
  for (const item of Object.values(ITEM_BY_ID)) {
    if (!item.issued) continue;
    const entitled = p.path === item.issued.path && p.rank >= item.issued.rank;
    if (entitled && !p.inventory[item.id]) {
      p.inventory[item.id] = 1;
      issued.push(`${item.icon} ${item.name}`);
      // Issued gear goes straight on if it beats what you carry.
      const slot = item.kind as "weapon" | "armor";
      const current = p.equipped?.[slot] ? ITEM_BY_ID[p.equipped[slot]!] : null;
      if (p.equipped && (!current || (current.power ?? 0) < (item.power ?? 0))) p.equipped = { ...p.equipped, [slot]: item.id };
    } else if (!entitled && p.inventory[item.id]) {
      delete p.inventory[item.id];
    }
  }
  return issued;
}

/** Bankers earn interest on their savings (rate grows with rank, capped per update). */
function accrueInterest(p: Player, elapsed: number) {
  if (p.path !== "banking" || p.bank <= 0 || elapsed <= 0) return;
  const { baseRatePerDay, ratePerRankPerDay, capPerRank } = BALANCE.banking;
  const rate = baseRatePerDay + ratePerRankPerDay * p.rank;
  const earning = Math.min(p.bank, capPerRank * p.rank);
  const gain = earning * rate * (Math.min(elapsed, 86_400_000) / 86_400_000);
  p.bank = Math.round((p.bank + gain) * 100) / 100;
}

// ── Daily reward & contracts ─────────────────────────────────────────────

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

function seededPick(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const CONTRACT_POOL: { kind: ContractKind; label: (n: number) => string; target: [number, number]; reward: number }[] = [
  { kind: "jobs", label: (n) => `Finish ${n} jobs`, target: [6, 10], reward: 4 },
  { kind: "fights", label: (n) => `Win ${n} street fights`, target: [1, 3], reward: 15 },
  { kind: "earn", label: (n) => `Earn $${n} from work`, target: [60, 160], reward: 0.3 },
  { kind: "train", label: (n) => `Train at the gym ${n} times`, target: [2, 4], reward: 8 },
];

/** Three fresh contracts each UTC day, the same for a player all day long. */
function ensureDaily(p: Player, now: number) {
  const today = dayKey(now);
  if (p.daily?.day === today) return;
  const rnd = seededPick(`${p.id}:${today}`);
  const pool = [...CONTRACT_POOL].sort(() => rnd() - 0.5).slice(0, 3);
  const contracts: Contract[] = pool.map((c, i) => {
    const target = Math.round(c.target[0] + rnd() * (c.target[1] - c.target[0]));
    return {
      id: `${today}-${i}`,
      kind: c.kind,
      label: c.label(target),
      target,
      progress: 0,
      reward: Math.round(c.kind === "earn" ? target * c.reward : target * c.reward + 10),
      claimed: false,
    };
  });
  p.daily = { day: today, lastClaim: p.daily?.lastClaim ?? null, streak: p.daily?.streak ?? 0, contracts };
}

function bumpContract(p: Player, kind: ContractKind, amount = 1) {
  for (const c of p.daily?.contracts ?? []) {
    if (c.kind === kind && !c.claimed) c.progress = Math.min(c.target, c.progress + amount);
  }
}

function claimDaily(p: Player, now: number, events: GameEvent[]) {
  const today = dayKey(now);
  const d = p.daily!;
  if (d.lastClaim === today) throw new GameError("You already collected today's reward. Come back tomorrow.");
  const yesterday = dayKey(now - 86_400_000);
  d.streak = d.lastClaim === yesterday ? d.streak + 1 : 1;
  d.lastClaim = today;
  const day = ((d.streak - 1) % 7) + 1;
  const cash = 15 * day;
  p.cash += cash;
  let bonus = "";
  if (day === 3) {
    p.inventory.hot_meal = (p.inventory.hot_meal ?? 0) + 1;
    bonus = " and a hot meal";
  }
  if (day === 7) {
    p.inventory.medkit = (p.inventory.medkit ?? 0) + 1;
    p.reputation += 2;
    bonus = ", a medkit and +2 reputation";
  }
  events.push({ tone: "good", text: `Day ${d.streak} in a row. Someone left you $${cash}${bonus}.` });
}

function claimContract(p: Player, id: string, events: GameEvent[]) {
  const c = p.daily?.contracts.find((x) => x.id === id);
  if (!c) throw new GameError("No such contract.");
  if (c.claimed) throw new GameError("Already collected.");
  if (c.progress < c.target) throw new GameError("Not finished yet.");
  c.claimed = true;
  p.cash += c.reward;
  p.reputation += 1;
  events.push({ tone: "good", text: `Contract done: ${c.label}. +$${c.reward}, +1 reputation.` });
}

// ── Gym ──────────────────────────────────────────────────────────────────

const GYM_LINES: Record<"strength" | "toughness" | "agility", string[]> = {
  strength: ["The bar bends a little. So do you.", "One more rep. Then one more.", "Your grip is getting scary."],
  toughness: ["Body shots on the heavy bag. Your ribs complain, then adapt.", "Ice bath. You stop flinching.", "Ten rounds of sparring. You're still standing."],
  agility: ["Jump rope until the floor blurs.", "Footwork drills. Your feet stop tripping over each other.", "You slip a punch you never saw coming."],
};

/**
 * XP multiplier for repeating `key` right now. Recent repetitions fade by half every
 * `practiceHalfLifeMs`, so variety and rest both help. Counts this repetition.
 */
export function practiceFalloff(p: Player, key: string, now: number): number {
  const prev = p.practice?.[key];
  const recent = prev ? prev.n * Math.pow(0.5, Math.max(0, now - prev.at) / BALANCE.practiceHalfLifeMs) : 0;
  p.practice = { ...(p.practice ?? {}), [key]: { n: recent + 1, at: now } };
  return 1 / (1 + recent / BALANCE.repeatFalloff);
}

/** Hidden: the career makes you better at what it needs. Never shown as numbers. */
export function careerBonus(p: Player) {
  if (!p.path) return;
  const delta = BALANCE.careerBonus.base + BALANCE.careerBonus.perRank * (p.rank - 1);
  for (const k of PATHS[p.path].keyStats) {
    const target = sv(p, k) + delta;
    p.stats[k] = Math.max(p.stats[k], ((target - 10) / 4) ** 2);
  }
}

function train(p: Player, stat: "strength" | "toughness" | "agility", rng: Rng, events: GameEvent[], now: number) {
  const cost = itemPrice(p, BALANCE.gym.fee);
  if (p.energy < BALANCE.gym.energy) throw new GameError("You're too tired to train.");
  if (p.cash < cost) throw new GameError(`The gym fee is $${cost}. Cash only.`);
  p.energy -= BALANCE.gym.energy;
  p.cash -= cost;
  const key = `gym:${stat}`;
  p.jobCounts[key] = (p.jobCounts[key] ?? 0) + 1;
  const falloff = practiceFalloff(p, key, now);
  events.push({ tone: "good", text: `${pick(rng, GYM_LINES[stat])} -$${cost}` });
  grantXp(p, { [stat]: BALANCE.gym.xp }, falloff, events);
  bumpContract(p, "train");
}

/** Rolls the trip's danger now; it is revealed and applied on arrival. */
function rollIncident(p: Player, mode: TravelMode, rng: Rng, departAt: number): TripIncident | null {
  const def = MODE_BY_ID[mode];
  if (mode === "plane") {
    if (p.heat < BALANCE.cleanRecordHeat) return null;
    const fine = Math.round(p.heat * 6);
    return {
      kind: "customs",
      text: `Customs pulls you aside. Your name is on a list. You pay a $${fine} fine and sit in a small room for a while.`,
      fine,
      delayMs: BALANCE.travel.customsDelayMs,
    };
  }
  if (rng() >= def.riskChance) return null;
  if (mode === "train") {
    const dodge = clamp(0.2 + (sv(p, "perception") - 10) / 60, 0.2, 0.9);
    if (rng() < dodge) {
      return { kind: "pickpocket", text: "A hand slides toward your pocket. You catch the wrist. The thief runs for the next carriage.", cashLost: 0 };
    }
    const lost = Math.floor(p.cash * 0.4);
    return { kind: "pickpocket", text: `Somewhere between stations, a pickpocket lifts $${lost} from your coat.`, cashLost: lost };
  }
  // Bus: a planned ambush by a road gang.
  const me = playerFighter(p, playerMaxHp(p));
  const gang = roadGang(power(me));
  const res = resolveFight(me, npcFighter(gang), rng);
  const fight: FightSummary = { opponent: gang.name, icon: gang.icon, won: res.won, lines: res.lines, outcome: "win" };
  if (res.won) {
    return { kind: "ambush", text: "The bus stops in the middle of nowhere. A gang climbs aboard, looking for you. You fight your way off.", fight, hpAfter: res.playerHp, cashLost: 0 };
  }
  const lost = Math.floor(p.cash * 0.6);
  if (res.playerHp <= 0) {
    const died = rng() < deathChance(power(npcFighter(gang)) / power(me));
    fight.outcome = died ? "death" : "ko";
    return {
      kind: "ambush",
      text: died
        ? "The ambush was planned. They knew your seat number. You never reach your stop."
        : `The ambush was planned. They beat you, take $${lost}, and leave you by the road. A farmer drives you to a hospital.`,
      fight,
      hpAfter: 0,
      cashLost: lost,
      died,
      hospitalMs: died ? 0 : randInt(rng, BALANCE.hp.hospitalMinMs, BALANCE.hp.hospitalMaxMs),
    };
  }
  fight.outcome = "loss";
  return { kind: "ambush", text: `A gang stops the bus. You lose the fight and $${lost}, but keep your life.`, fight, hpAfter: res.playerHp, cashLost: lost };
}

function startTrip(p: Player, to: CountryId, mode: TravelMode, now: number, rng: Rng, events: GameEvent[]) {
  const from = countryOf(p);
  if (!COUNTRY_BY_ID[to] || !MODE_BY_ID[mode]) throw new GameError("Unknown destination.");
  if (to === from) throw new GameError("You're already here.");
  const cost = tripCost(from, to, mode);
  if (p.cash < cost) throw new GameError(`A ${MODE_BY_ID[mode].name.toLowerCase()} ticket costs $${cost}. Cash only.`);
  p.cash -= cost;
  const incident = rollIncident(p, mode, rng, now);
  const seized = smugglingCheck(p, mode, rng);
  if (seized) events.push({ tone: "bad", text: seized });
  p.travel = { from, to, mode, departAt: now, arriveAt: now + tripMs(from, to, mode) + (incident?.delayMs ?? 0), incident };
  p.arrival = null;
  events.push({
    tone: "info",
    text: `You board the ${MODE_BY_ID[mode].name.toLowerCase()} to ${COUNTRY_BY_ID[to].capital}. $${cost}.`,
  });
}

/** Finishes a trip whose time is up, applying whatever happened on the way. */
function arrive(p: Player) {
  const trip = p.travel;
  if (!trip || p.tickAt < trip.arriveAt) return;
  const at = trip.arriveAt;
  const inc = trip.incident;
  p.travel = null;
  // Each country has its own home: leave this one, move into whatever you have there.
  p.homes = { ...(p.homes ?? {}), [trip.from]: p.housing };
  p.country = trip.to;
  p.housing = p.homes[trip.to] ?? 0;
  p.energy = Math.min(p.energy, maxEnergy(p.housing));
  if (inc) {
    p.cash = Math.max(0, p.cash - (inc.cashLost ?? 0) - (inc.fine ?? 0));
    if (inc.fine) p.heat = Math.max(0, p.heat - 5);
    if (inc.hpAfter !== undefined) p.hp = inc.hpAfter;
    if (inc.fight) {
      grantXp(p, { toughness: 0.8, strength: inc.fight.won ? 1 : 0.4, nerve: 0.8 }, 1, []);
      if (inc.fight.won) p.reputation += 2;
    }
    if (inc.died) {
      die(p, at, "Road Gang", []);
    } else if (inc.hospitalMs) {
      p.hp = 0;
      p.hospitalUntil = at + inc.hospitalMs * (p.path === "medicine" ? 0.5 : 1);
      p.assessmentReady = true;
    }
  }
  p.arrival = { to: trip.to, mode: trip.mode, at, incident: inc };
  p.log.unshift({
    at,
    tone: inc && inc.kind !== "pickpocket" ? "bad" : "info",
    text: `Arrived in ${COUNTRY_BY_ID[trip.to].capital}.${inc ? ` ${inc.text}` : ""}`,
  });
  p.log = p.log.slice(0, BALANCE.logSize);
}

/** Returns why a job can't be done right now, or null. Does not check energy. */
/** The country the player is in (old saves predate countries and live in Varrow). */
export function countryOf(p: Player): CountryId {
  return p.country ?? "varrow";
}

export function traveling(p: Player): boolean {
  return !!p.travel;
}

export function jobLock(p: Player, job: JobDef): string | null {
  // Career work can be done wherever you live; everything else is local.
  if (!job.path && DISTRICT_BY_ID[job.district].country !== countryOf(p)) return "That's in another country.";
  if (job.path && p.path !== job.path) return "Not your line of work.";
  if (job.minRank && p.rank < job.minRank) return `Needs rank: ${PATHS[job.path!].ranks[job.minRank - 1]}.`;
  const d = DISTRICT_BY_ID[job.district].locked(p);
  if (d && !job.path) return d;
  return job.requires?.(p) ?? null;
}

/**
 * Soft cap: above an effective value of 70 (about what a top rank needs), every further 10
 * points halves what training teaches. Veterans of several careers keep growing, but slowly.
 */
export function softCap(statValueNow: number): number {
  const { start, halfEvery } = BALANCE.statSoftCap;
  return statValueNow <= start ? 1 : Math.pow(0.5, (statValueNow - start) / halfEvery);
}

function grantXp(p: Player, xp: Partial<Record<StatKey, number>>, mult: number, events: GameEvent[]) {
  for (const k of STAT_KEYS) {
    const gain = (xp[k] ?? 0) * mult * softCap(statValue(p.stats[k]));
    if (!gain) continue;
    const before = tierOf(statValue(p.stats[k]));
    p.stats[k] += gain;
    const after = tierOf(statValue(p.stats[k]));
    if (after > before) events.push({ tone: "info", text: TIER_UP_LINES[k][Math.min(after - 1, 4)] });
  }
}

export function shiftIntegrity(p: Player, delta = 0) {
  p.stats.integrity = clamp(p.stats.integrity + delta, -100, 100);
}

function hospitalize(p: Player, now: number, rng: Rng, events: GameEvent[], wound = true) {
  if (wound) addWound(p, now);
  p.hp = 0;
  // Medics know how to heal: their hospital stays are halved.
  const stay = randInt(rng, BALANCE.hp.hospitalMinMs, BALANCE.hp.hospitalMaxMs) * (p.path === "medicine" ? 0.5 : 1);
  p.hospitalUntil = now + Math.round(stay);
  p.assessmentReady = true;
  const lost = Math.floor(p.cash * 0.25);
  p.cash -= lost;
  events.push({
    tone: "bad",
    text: `You wake up in the free clinic.${lost ? ` Someone went through your pockets: -$${lost}.` : ""}`,
  });
}

/** Chance that a knockout is fatal, based on how outmatched the player was. */
export function deathChance(threat: number): number {
  const d = BALANCE.death;
  return clamp((threat - d.safeRatio) * d.slope, 0, d.maxChance);
}

function die(p: Player, now: number, cause: string, events: GameEvent[]) {
  const keep = BALANCE.death.statsKept;
  for (const k of STAT_KEYS) p.stats[k] *= keep;
  p.stats.integrity *= keep;
  p.cash = 0;
  p.dirty = 0;
  p.hp = 0;
  p.hospitalUntil = 0;
  p.dead = { at: now, cause };
  p.deaths = (p.deaths ?? 0) + 1;
  events.push({ tone: "bad", text: `Lights out. The ${cause} was too much for you. You didn't make it.` });
}

/** Knocked out: usually the clinic, sometimes the morgue when badly outmatched. */
function knockout(p: Player, now: number, rng: Rng, events: GameEvent[], cause: string, threat: number): boolean {
  if (rng() < deathChance(threat)) {
    die(p, now, cause, events);
    return true;
  }
  hospitalize(p, now, rng, events);
  return false;
}

function rebirth(p: Player, rawName: string | undefined, now: number, events: GameEvent[]) {
  if (!p.dead) throw new GameError("You're still alive.");
  if (rawName !== undefined) p.name = cleanName(rawName);
  p.dead = null;
  p.cash = 0;
  p.inventory = {};
  p.housing = 0;
  p.homes = { [countryOf(p)]: 0 };
  p.path = null;
  p.rank = 0;
  p.offers = [];
  p.jobCounts = {};
  p.jobsSinceRank = 0;
  p.heat = 0;
  p.reputation = Math.floor(p.reputation * BALANCE.death.reputationKept);
  p.energy = maxEnergy(0);
  p.hp = BALANCE.hp.max;
  p.hospitalUntil = 0;
  p.fullUntil = 0;
  p.assessmentReady = false;
  p.flags = p.flags.filter((f) => !f.startsWith("declined_"));
  if (p.application?.status !== "pending") p.application = null;
  p.tickAt = now;
  events.push({
    tone: "story",
    text: `${p.name} wakes up under the overpass again. You feel weak. Your body has forgotten half of what it learned.`,
  });
  if (p.bank > 0) events.push({ tone: "good", text: `Your bank savings survived: $${p.bank}.` });
}

/** Chapter ids whose unlock condition the player currently meets. */
export function eligibleChapters(p: Player): string[] {
  const ids: string[] = [];
  if (totalJobs(p) >= 15) ids.push("old_faces");
  if (p.path && p.rank >= 2) ids.push(`${p.path}_2`);
  if (p.path && p.rank >= 3) ids.push(`${p.path}_3`);
  return ids.filter((id) => CHAPTER_BY_ID[id]);
}

/** Story knowledge is kept forever, even across deaths. */
function unlockChapters(p: Player, events: GameEvent[]) {
  for (const id of eligibleChapters(p)) {
    if (p.flags.includes(`story:${id}`)) continue;
    p.flags.push(`story:${id}`);
    events.push({
      tone: "story",
      text: `New chapter: ${CHAPTER_BY_ID[id].title}`,
      action: { label: "Read", target: `story:${id}` },
    });
  }
}

function checkProgress(p: Player, events: GameEvent[]) {
  checkCareer(p, events);
  unlockChapters(p, events);
}

/**
 * How much a career job counts toward promotion: harder work (higher-rank, risky, more
 * demanding) counts more; work well below your rank barely counts; a botched job counts little.
 */
export function jobMerit(p: Player, job: JobDef, success: boolean): number {
  const level = job.minRank ?? 1;
  // Per energy spent: a cheap errand counts for little, a long hard shift for a lot.
  const complexity = (job.energy / 10) * (1 + 0.5 * (level - 1)) * (1 + (job.risk ? job.risk.difficulty / 80 : 0));
  const relevance = level >= p.rank - 1 ? 1 : 0.25;
  return complexity * relevance * (success ? 1 : 0.3);
}

/** A job's XP, scaled so every job teaches the same amount per energy (career work a bit more). */
export function jobXp(job: JobDef): Partial<Record<StatKey, number>> {
  const total = Object.values(job.xp).reduce((s, v) => s + (v ?? 0), 0);
  if (total <= 0) return job.xp;
  const rate = job.path ? BALANCE.progress.careerXpPerEnergy : BALANCE.progress.xpPerEnergy;
  const scale = (rate * job.energy) / total;
  return Object.fromEntries(Object.entries(job.xp).map(([k, v]) => [k, (v ?? 0) * scale]));
}

/** Casework (arrests, exams, verdicts, hunts…) also earns merit in the player's own career. */
export function addMerit(p: Player, path: PathId, amount: number): GameEvent[] {
  if (p.path !== path || amount <= 0) return [];
  p.jobsSinceRank += amount;
  const events: GameEvent[] = [];
  checkCareer(p, events);
  for (const e of events) p.log.unshift({ at: Date.now(), text: e.text, tone: e.tone });
  p.log = p.log.slice(0, BALANCE.logSize);
  return events;
}

function checkCareer(p: Player, events: GameEvent[]) {
  if (!p.path) {
    if (p.application?.status === "pending") return;
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
  if (p.rank >= def.ranks.length || p.jobsSinceRank < meritNeeded(p.path, p.rank) * veteranFactor(p)) return;
  if (keyStatAvg(p, p.path) < def.promotionThresholds[p.rank - 1]) return;
  // The family has its own rules about who moves up.
  if (familyGate(p, p.rank + 1)) return;
  p.rank += 1;
  p.jobsSinceRank = 0;
  p.reputation += 3;
  careerBonus(p);
  const title = def.ranks[p.rank - 1];
  if (isGraduation(p.path, p.rank)) {
    const school = p.school ? SCHOOL_BY_ID[p.school] : null;
    events.push({
      tone: "story",
      text: `Graduation day at ${school?.name ?? "school"}. Caps fly. Nobody came to watch you, but you came this far anyway. You are now: ${title}.`,
    });
  } else {
    events.push({ tone: "story", text: def.promotion(title) });
  }
  if (def.examStats) {
    events.push({ tone: "info", text: `${def.examName}: ${def.examStats.map((k) => band(p, k)).join(" ")}` });
  }
  const gear = issueGear(p);
  if (gear.length) events.push({ tone: "good", text: `Issued: ${gear.join(", ")}. It's yours while you serve.` });
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
  const me = playerFighter(p, playerMaxHp(p));
  const them = npcFighter(npc);
  const res = resolveFight(me, them, rng);
  p.hp = res.playerHp;
  events.push(...wearGear(p, ["weapon", "armor"]));
  const summary: FightSummary = { opponent: npc.name, icon: npc.icon, won: res.won, lines: res.lines, outcome: "win" };
  events.push({ tone: res.won ? "good" : "bad", text: `Fight: ${npc.name}`, fight: summary });
  grantXp(p, { toughness: 0.8, strength: res.won ? 1 : 0.4, agility: 0.5, nerve: 0.6 }, 1, events);
  if (res.won) {
    const loot = randInt(rng, npc.cash[0], npc.cash[1]);
    p.cash += loot;
    p.reputation += npc.reputation;
    p.jobCounts["fight:win"] = (p.jobCounts["fight:win"] ?? 0) + 1;
    bumpSeason(p, "wins", 1, now);
    bumpContract(p, "fights");
    events.push({ tone: "good", text: `You beat the ${npc.name}.${loot ? ` +$${loot}` : ""}` });
  } else if (p.hp <= 0) {
    summary.outcome = knockout(p, now, rng, events, npc.name, power(them) / power(me)) ? "death" : "ko";
  } else {
    summary.outcome = "loss";
    events.push({ tone: "bad", text: `The ${npc.name} got the better of you.` });
  }
}

function maybeMugging(p: Player, job: JobDef, now: number, rng: Rng, events: GameEvent[]) {
  if (p.cash < BALANCE.muggingMinCash) return;
  if (!["gutter", "old_market", "boardwalk", "rail_yards", "undercity"].includes(job.district)) return;
  if (rng() >= BALANCE.muggingChance) return;
  const m = mugger(p.reputation);
  events.push({ tone: "bad", text: "On the way back, someone steps out of an alley. \"Wallet. Now.\"" });
  const me = playerFighter(p, playerMaxHp(p));
  const them = npcFighter(m);
  const res = resolveFight(me, them, rng);
  p.hp = res.playerHp;
  const summary: FightSummary = { opponent: m.name, icon: m.icon, won: res.won, lines: res.lines, outcome: "win" };
  events.push({ tone: res.won ? "good" : "bad", text: "Fight: Mugger", fight: summary });
  grantXp(p, { toughness: 0.6, nerve: 0.6 }, 1, events);
  if (res.won) {
    p.reputation += 1;
    events.push({ tone: "good", text: "You fight him off and keep your money. (Tip: money in the bank can't be stolen.)" });
    return;
  }
  if (p.hp <= 0) {
    // A random mugging can put you in the clinic, but never kill you: death only comes
    // from fights you choose.
    summary.outcome = "ko";
    hospitalize(p, now, rng, events, false);
    const lost = Math.floor(p.cash * 0.5);
    p.cash -= lost;
    if (lost) events.push({ tone: "bad", text: `You wake up in the clinic. Your wallet is $${lost} lighter.` });
    return;
  }
  summary.outcome = "loss";
  const lost = Math.floor(p.cash * 0.5);
  p.cash -= lost;
  events.push({
    tone: "bad",
    text: `He takes half your cash: -$${lost}. (Money in the bank can't be stolen.)`,
    action: { label: "Go to bank", target: "place:bank" },
  });
}

/** City hall policies that affect a single player's action (loaded by the server). */
export interface ActionContext {
  /** City tax rate in each country. */
  taxRates?: Partial<Record<CountryId, number>>;
  /** Crew that runs each district (takes a cut of outsiders' pay). */
  turf?: Partial<Record<DistrictId, string>>;
  /** Crews allied with the player's crew (they don't charge protection). */
  allies?: string[];
}

/** Withholds city tax from income earned in `country`. Returns what's left. */
function withholdTax(p: Player, country: CountryId, amount: number, ctx: ActionContext): { net: number; tax: number } {
  const rate = ctx.taxRates?.[country] ?? 0;
  const tax = Math.floor(amount * rate);
  if (tax > 0) {
    const owed = p.taxOwed?.country === country ? p.taxOwed.amount : 0;
    p.taxOwed = { country, amount: owed + tax };
  }
  return { net: amount - tax, tax };
}

function doJob(p: Player, jobId: string, now: number, rng: Rng, events: GameEvent[], ctx: ActionContext = {}) {
  const job = JOB_BY_ID[jobId];
  if (!job) throw new GameError("That job doesn't exist.");
  const lock = jobLock(p, job);
  if (lock) throw new GameError(lock);
  if ((p.lieLowUntil ?? 0) > now) throw new GameError("You're lying low in a safe house. No work until it's safe.");
  if (p.energy < job.energy) throw new GameError("You're too tired. Rest or eat something.");
  p.energy -= job.energy;
  p.jobCounts[job.id] = (p.jobCounts[job.id] ?? 0) + 1;
  const falloff = practiceFalloff(p, job.id, now);

  if (job.risk) {
    const avg = job.risk.stats.reduce((s, k) => s + sv(p, k), 0) / job.risk.stats.length;
    const chance = clamp(0.5 + (avg - job.risk.difficulty) / 30, 0.15, 0.95);
    if (rng() >= chance) {
      p.heat += (job.risk.failHeat ?? 0) * COUNTRY_BY_ID[countryOf(p)].heatMult;
      grantXp(p, jobXp(job), falloff * 0.5, events);
      if (job.path) p.jobsSinceRank += jobMerit(p, job, false);
      events.push({ tone: "bad", text: job.risk.failText });
      if (job.risk.failHp) {
        events.push(...wearGear(p, ["armor"]));
        p.hp -= job.risk.failHp;
        if (p.hp <= 0) hospitalize(p, now, rng, events);
      }
      checkProgress(p, events);
      return;
    }
  }

  // Crew members get a small bonus: someone always has your back.
  const crewBonus = (p.crewId ? 1.05 : 1) * legacyPayBonus(p);
  const event = cityEvent(countryOf(p), now);
  let pay = Math.round(randInt(rng, job.pay[0], job.pay[1]) * COUNTRY_BY_ID[countryOf(p)].payMult * crewBonus * (event?.payMult ?? 1));
  if (job.payStat) pay = Math.round(pay * (1 + (sv(p, job.payStat) - 10) / 40));
  const criminal = (job.integrity ?? 0) < 0 || (job.heat ?? 0) > 0;
  const { net: afterTax, tax } = criminal ? { net: pay, tax: 0 } : withholdTax(p, countryOf(p), pay, ctx);
  // Protection money: the crew that runs this district takes a cut from outsiders.
  const turfCrew = ctx.turf?.[job.district];
  const cut = turfCrew && turfCrew !== p.crewId && !ctx.allies?.includes(turfCrew) ? Math.floor(afterTax * BALANCE.turf.cut) : 0;
  if (cut > 0) p.turfOwed = { crewId: turfCrew!, amount: (p.turfOwed?.crewId === turfCrew ? p.turfOwed?.amount ?? 0 : 0) + cut };
  const net = afterTax - cut;
  bumpSeason(p, "earned", net, now);
  // Criminal pay is dirty money: it has to be laundered before the bank or shops take it.
  if (criminal) p.dirty = (p.dirty ?? 0) + net;
  else p.cash += net;
  p.heat += (job.heat ?? 0) * COUNTRY_BY_ID[countryOf(p)].heatMult;
  p.reputation += job.reputation ?? 0;
  shiftIntegrity(p, job.integrity);
  events.push({
    tone: "good",
    text: `${pick(rng, job.lines)} +$${net}${criminal ? " dirty" : ""}${tax ? ` (city tax $${tax})` : ""}${cut ? ` (protection money $${cut})` : ""}`,
  });
  bumpContract(p, "jobs");
  bumpContract(p, "earn", pay);
  if (job.path) p.jobsSinceRank += jobMerit(p, job, true);
  grantXp(p, jobXp(job), falloff, events);
  if (job.id === "make_bones") events.push(...passTest(p, now));

  if (job.find && rng() < job.find.chance) {
    const item = ITEM_BY_ID[job.find.itemId];
    p.inventory[item.id] = (p.inventory[item.id] ?? 0) + 1;
    events.push({ tone: "good", text: `You found: ${item.icon} ${item.name}.` });
  }
  checkProgress(p, events);
  maybeMugging(p, job, now, rng, events);
}

/** Income waiting at a property, capped so absent owners don't pile up forever. */
export function propertyIncome(id: string, since: number, now: number): number {
  const prop = PROPERTY_BY_ID[id];
  const hours = Math.min(PROPERTY_MAX_HOURS, Math.max(0, now - since) / 3_600_000);
  return Math.floor(prop.incomePerHour * hours);
}

/** Shop prices follow the local cost of living. */
export function itemPrice(p: Player, base: number): number {
  return Math.round(base * COUNTRY_BY_ID[countryOf(p)].priceMult);
}

function buy(p: Player, itemId: string, events: GameEvent[]) {
  const item = ITEM_BY_ID[itemId];
  if (!item || item.issued || item.contraband) throw new GameError("That item isn't for sale.");
  const price = itemPrice(p, item.price);
  if (p.cash < price) throw new GameError("You can't afford that. (Cash on hand only.)");
  if (item.kind === "housing") {
    if (p.housing >= (item.housing ?? 0)) throw new GameError("You already have a better place here.");
    p.housing = item.housing!;
    p.homes = { ...(p.homes ?? {}), [countryOf(p)]: p.housing };
  } else if (item.kind === "weapon" || item.kind === "armor") {
    // A broken one can be replaced; a working one should be repaired instead.
    if (p.inventory[item.id] && usesLeft(p, item.id) > 0) throw new GameError("You already own one. Repair it when it wears out.");
    p.inventory[item.id] = 1;
    if (p.wear) delete p.wear[item.id];
    ensureEquipped(p);
    if (!equippedId(p, item.kind)) p.equipped = { ...p.equipped, [item.kind]: item.id };
  } else {
    p.inventory[item.id] = (p.inventory[item.id] ?? 0) + 1;
  }
  p.cash -= price;
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
      if (p.hp >= playerMaxHp(p)) throw new GameError("You're not hurt.");
      p.hp = Math.min(playerMaxHp(p), p.hp + (item.heal ?? 0));
      events.push({ tone: "good", text: "You patch yourself up." });
    }
  } else {
    throw new GameError("You can't use that.");
  }
  p.inventory[itemId] -= 1;
  if (p.inventory[itemId] <= 0) delete p.inventory[itemId];
}

function bank(p: Player, op: "open" | "deposit" | "withdraw", amount: number | undefined, now: number, events: GameEvent[]) {
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
    // A big cash deposit right after a robbery gets the compliance desk's attention.
    const { windowMs, minDeposit } = BALANCE.casework.bank;
    if (p.lastCrime && now - p.lastCrime.at < windowMs && amt >= minDeposit && !p.pendingDeposit) {
      p.pendingDeposit = { caseId: p.lastCrime.caseId, amount: amt, at: now };
      p.lastCrime = null;
    }
  } else {
    if (amt > p.bank) throw new GameError("You don't have that much in the bank.");
    p.bank -= amt;
    p.cash += amt;
    events.push({ tone: "good", text: `Withdrew $${amt}.` });
  }
}

function answerOffer(p: Player, path: PathId, accept: boolean, now: number, events: GameEvent[]) {
  if (!p.offers.includes(path)) throw new GameError("No such offer.");
  if (accept && careerGapBlock(p, now)) throw new GameError(careerGapBlock(p, now)!);
  p.offers = p.offers.filter((o) => o !== path);
  if (!accept) {
    p.flags.push(`declined_${path}`);
    events.push({ tone: "info", text: `You turn ${PATHS[path].contact} down. They won't ask twice.` });
    return;
  }
  if (p.path) throw new GameError("You've already chosen your path.");
  const school = PATHS[path].school ? SCHOOL_BY_ID[PATHS[path].school!] : null;
  if (school) {
    // School careers: the contact vouches, the dean still decides.
    if (p.application?.status === "pending") throw new GameError("You already have an application under review.");
    submitApplication(p, school.id, PATHS[path].contact, now);
    events.push({ tone: "story", text: PATHS[path].accepted });
    events.push({
      tone: "info",
      text: `${school.dean} is reviewing your application to ${school.name}. Tuition waived.`,
      action: { label: "View application", target: "place:academy" },
    });
    return;
  }
  joinPath(p, path);
  events.push({ tone: "story", text: PATHS[path].accepted });
  events.push({
    tone: "good",
    text: `You are now: ${PATHS[path].ranks[0]}.`,
    action: { label: "See new jobs", target: "tab:jobs" },
  });
}

function joinPath(p: Player, path: PathId) {
  p.path = path;
  p.rank = 1;
  p.jobsSinceRank = 0;
  careerBonus(p);
  // Choosing one path closes the others in this version.
  for (const o of p.offers) p.flags.push(`declined_${o}`);
  p.offers = [];
}

function submitApplication(p: Player, schoolId: string, vouchedBy: string | null, now: number) {
  const school = SCHOOL_BY_ID[schoolId];
  const review = BALANCE.school.reviewMs * (vouchedBy ? BALANCE.school.vouchedReviewMult : 1);
  p.application = {
    school: school.id,
    path: school.path,
    submittedAt: now,
    decideAt: now + review,
    vouchedBy,
    paid: vouchedBy ? 0 : school.tuition,
    status: "pending",
  };
}

const NEED_WORDS: Record<StatKey, string> = {
  strength: "stronger",
  toughness: "tougher",
  agility: "quicker",
  wits: "sharper",
  nerve: "bolder",
  charisma: "more persuasive",
  perception: "more observant",
};

/** The dean's decision. Deterministic, so it can run inside tick(). */
function decideApplication(p: Player) {
  const app = p.application;
  if (!app || app.status !== "pending" || p.tickAt < app.decideAt) return;
  const school = SCHOOL_BY_ID[app.school];
  const path = PATHS[app.path];
  const bar = school.entrance - (app.vouchedBy ? BALANCE.school.vouchBonus : 0);
  let reason: string | null = null;
  if (p.heat >= BALANCE.cleanRecordHeat) {
    reason = "Your background check came back dirty. Clean up your record and apply again.";
  } else if (keyStatAvg(p, app.path) < bar) {
    const weakest = [...path.keyStats].sort((a, b) => sv(p, a) - sv(p, b))[0];
    reason = `"Not yet. We need students who are ${NEED_WORDS[weakest]}." Train and apply again.`;
  }
  if (reason) {
    app.status = "rejected";
    app.reason = reason;
    const refund = Math.floor(app.paid * BALANCE.school.refundShare);
    p.bank += refund;
    p.applyCooldownUntil = p.tickAt + BALANCE.school.reapplyCooldownMs;
    p.log.unshift({ at: p.tickAt, tone: "bad", text: `${school.dean} rejected your application.${refund ? ` $${refund} refunded.` : ""}` });
  } else {
    app.status = "accepted";
    p.log.unshift({ at: p.tickAt, tone: "good", text: `Accepted to ${school.name}!` });
  }
}

function apply(p: Player, schoolId: string, now: number, events: GameEvent[]) {
  const school = SCHOOL_BY_ID[schoolId];
  if (!school) throw new GameError("No such school.");
  if (p.path) throw new GameError("You already have a career.");
  if (p.application?.status === "pending") throw new GameError("You already have an application under review.");
  if ((p.applyCooldownUntil ?? 0) > now) throw new GameError("The admissions office won't see you again so soon.");
  if (careerGapBlock(p, now)) throw new GameError(careerGapBlock(p, now)!);
  if (school.country !== countryOf(p)) {
    throw new GameError(`${school.name} is in ${COUNTRY_BY_ID[school.country].capital}. Travel there to apply in person.`);
  }
  // A pending vouch from the career's contact makes the application free (at their home school).
  if (p.offers.includes(school.path) && PATHS[school.path].school === school.id) {
    answerOffer(p, school.path, true, now, events);
    return;
  }
  // A vouch from a high-ranking player works like a contact's vouch.
  const playerVouch = p.vouches?.find((v) => v.path === school.path && PATHS[school.path].school === school.id);
  if (playerVouch) {
    // No tuition, so no bank account needed; everything else still applies.
    const lock = school.requirements(p);
    if (lock && !lock.startsWith("Tuition")) throw new GameError(lock);
    p.vouches = p.vouches!.filter((v) => v !== playerVouch);
    submitApplication(p, school.id, playerVouch.by, now);
    events.push({ tone: "info", text: `Application sent to ${school.name} with ${playerVouch.by}'s recommendation. Tuition waived.` });
    return;
  }
  const lock = school.requirements(p);
  if (lock) throw new GameError(lock);
  if (p.bank < school.tuition) throw new GameError(`Tuition is $${school.tuition}, paid from your bank account.`);
  p.bank -= school.tuition;
  submitApplication(p, school.id, null, now);
  events.push({
    tone: "info",
    text: `Application sent to ${school.name}. $${school.tuition} tuition paid. ${school.dean} will decide soon.`,
  });
}

function enroll(p: Player, events: GameEvent[]) {
  const app = p.application;
  if (!app || app.status !== "accepted") throw new GameError("You haven't been accepted anywhere.");
  if (p.path) throw new GameError("You already have a career.");
  const school = SCHOOL_BY_ID[app.school];
  joinPath(p, app.path);
  p.school = app.school;
  p.application = null;
  events.push({ tone: "story", text: `First day at ${school.name}. You find your seat in the back row. Old habits.` });
  events.push({
    tone: "good",
    text: `You are now: ${PATHS[app.path].ranks[0]}. Graduate by completing your coursework.`,
    action: { label: "See coursework", target: "tab:jobs" },
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

export function applyAction(p: Player, action: Action, now: number, rng: Rng, ctx: ActionContext = {}): GameEvent[] {
  tick(p, now);
  const events: GameEvent[] = [];
  if (isDead(p) && action.type !== "rebirth" && action.type !== "flag") {
    throw new GameError("You're dead. Start a new life to keep playing.");
  }
  const blockedInHospital = action.type === "job" || action.type === "fight" || action.type === "bank" || action.type === "travel";
  if (blockedInHospital && inHospital(p, now)) throw new GameError("You're in the hospital. Rest up.");
  const blockedOnTheRoad = ["job", "fight", "bank", "buy", "apply", "travel", "enroll", "train", "launder", "drug_buy", "drug_sell", "buy_supplies", "cook"].includes(action.type);
  if (action.type === "train" && inHospital(p, now)) throw new GameError("You're in the hospital. Rest up.");
  if (blockedOnTheRoad && traveling(p)) throw new GameError("You're still on the road. Wait until you arrive.");
  if (blockedOnTheRoad && inJail(p, now)) throw new GameError(p.custodyCase ? "You're held for trial. Wait for the verdict." : "You're in a cell. Serve your time.");

  switch (action.type) {
    case "job":
      doJob(p, action.jobId, now, rng, events, ctx);
      break;
    case "fight": {
      const npc = NPC_BY_ID[action.npcId];
      if (!npc) throw new GameError("Nobody by that name around here.");
      if (DISTRICT_BY_ID[npc.district].country !== countryOf(p)) throw new GameError("They're in another country.");
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
    case "equip":
      events.push(...equip(p, action.itemId));
      break;
    case "unequip":
      events.push(...unequip(p, action.slot));
      break;
    case "repair":
      events.push(...repair(p, action.itemId, now, (base) => itemPrice(p, base)));
      break;
    case "hire_bodyguards":
      events.push(...hireBodyguards(p, now));
      break;
    case "profile":
      events.push(...updateProfile(p, { bio: action.bio, photo: action.photo }, now));
      break;
    case "leave_career":
      events.push(...leaveCareer(p, now));
      break;
    case "lie_low":
      events.push(...lieLow(p, now));
      break;
    case "bank":
      bank(p, action.op, action.amount, now, events);
      break;
    case "offer":
      answerOffer(p, action.path, action.accept, now, events);
      break;
    case "assess":
      assess(p, now, events);
      break;
    case "flag": {
      const read = /^read:([a-z0-9_]+)$/.exec(action.flag);
      const ok = ALLOWED_FLAGS.has(action.flag) || (read && p.flags.includes(`story:${read[1]}`));
      if (!ok) throw new GameError("Unknown flag.");
      if (!p.flags.includes(action.flag)) p.flags.push(action.flag);
      break;
    }
    case "rebirth":
      rebirth(p, action.name, now, events);
      break;
    case "apply":
      apply(p, action.school, now, events);
      break;
    case "enroll":
      enroll(p, events);
      break;
    case "travel":
      startTrip(p, action.to, action.mode, now, rng, events);
      break;
    case "ack_arrival":
      p.arrival = null;
      break;
    case "buy_property": {
      const prop = PROPERTY_BY_ID[action.id];
      if (!prop) throw new GameError("No such property.");
      if (prop.country !== countryOf(p)) throw new GameError("You have to be in the country to sign the deed.");
      if (p.properties?.[prop.id]) throw new GameError("You already own it.");
      if (p.bank < prop.price) throw new GameError(`It costs $${prop.price}, paid from your bank account.`);
      p.bank -= prop.price;
      p.properties = { ...(p.properties ?? {}), [prop.id]: now };
      events.push({ tone: "good", text: `You bought ${prop.name}. It earns about $${prop.incomePerHour} an hour.` });
      break;
    }
    case "collect_property": {
      const prop = PROPERTY_BY_ID[action.id];
      const since = prop && p.properties?.[prop.id];
      if (!prop || !since) throw new GameError("You don't own that.");
      if ((p.closed?.[prop.id] ?? 0) > now) throw new GameError(`${prop.name} is a burned-out shell. It reopens in ${Math.ceil(((p.closed![prop.id]) - now) / 3_600_000)} hours.`);
      const income = propertyIncome(prop.id, since, now);
      if (income < 1) throw new GameError("Nothing to collect yet.");
      p.properties![prop.id] = now;
      const { net, tax } = withholdTax(p, prop.country, income, ctx);
      p.bank += net;
      events.push({ tone: "good", text: `${prop.name}: $${net} deposited to your bank.${tax ? ` (City tax: $${tax}.)` : ""}` });
      break;
    }
    case "read_inbox":
      for (const n of p.inbox ?? []) n.read = true;
      break;
    case "claim_daily":
      claimDaily(p, now, events);
      break;
    case "claim_contract":
      claimContract(p, action.id, events);
      break;
    case "train":
      if (!["strength", "toughness", "agility"].includes(action.stat)) throw new GameError("Unknown exercise.");
      train(p, action.stat, rng, events, now);
      break;
    case "dismiss_application":
      if (p.application?.status !== "rejected") throw new GameError("Nothing to dismiss.");
      p.application = null;
      break;
    case "launder":
      events.push(...launder(p, action.method, action.amount, now));
      break;
    case "drug_buy":
      events.push(...buyDrugs(p, action.drug, action.qty, now));
      break;
    case "drug_sell":
      events.push(...sellDrugs(p, action.drug, action.qty, now));
      break;
    case "buy_supplies":
      events.push(...buySupplies(p, action.qty));
      break;
    case "cook":
      events.push(...cook(p, action.drug, rng));
      break;
    case "tutorial":
      events.push(...claimTutorial(p, action.step));
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
  return gutRead(p, playerFighter(p, playerMaxHp(p)), npcFighter(npc), `${p.id}:${npcId}:${hourSeed}`);
}

export { FIGHT_ENERGY };
