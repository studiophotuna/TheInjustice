// Street crime between players, witnesses and police case files (stage 1 of the justice chain).
// Crimes are anonymous: the victim only learns what witnesses, bystanders and detectives
// piece together. Every tip reveals one trait, and some tips are wrong.

import { fightFace } from "./social";
import { clinicFactor } from "./specialties";
import { addWound, playerMaxHp } from "./wounds";
import { ALT_BLOCK, sameOwner } from "./anticheat";
import { BALANCE } from "./balance";
import { playerFighter, resolveFight } from "./combat";
import { DISTRICTS } from "./content/districts";
import { COUNTRY_BY_ID } from "./content/world";
import { addMerit, countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { notify, protectedUntil } from "./social";
import { cityEvent } from "./events";
import { earnDirty } from "./money";
import { DESCRIPTORS, describe, sv } from "./stats";
import {
  GameError,
  type CaseFile,
  type ClueTrait,
  type CrimeKind,
  type StreetCrime,
  type FightSummary,
  type GameEvent,
  type Player,
  type Rng,
  type Tip,
} from "./types";
import { hurtLimit } from "./engine";
import { caperEvent, witnessStep, type CaperStep } from "./caper";

export interface CrimeDef {
  id: CrimeKind;
  name: string;
  /** "snatch a bag from Rook" */
  verb: string;
  energy: number;
  share: [number, number];
  heat: number;
  integrity: number;
  blurb: string;
}

export const CRIMES: Record<CrimeKind, CrimeDef> = {
  pickpocket: {
    id: "pickpocket",
    name: "Pickpocket",
    verb: "lift a wallet from",
    energy: 8,
    share: [0.05, 0.1],
    heat: 3,
    integrity: -1,
    blurb: "Quiet and small. They may never notice.",
  },
  snatch: {
    id: "snatch",
    name: "Snatch",
    verb: "snatch a bag from",
    energy: 10,
    share: [0.1, 0.18],
    heat: 5,
    integrity: -2,
    blurb: "Grab and run. Fast hands, fast feet.",
  },
  mug: {
    id: "mug",
    name: "Mug",
    verb: "mug",
    energy: 15,
    share: [0.15, 0.25],
    heat: 8,
    integrity: -3,
    blurb: "Corner them and take it. It can turn into a fight.",
  },
  // Not street crimes: these case files come from contract hits (see hit.ts).
  murder: { id: "murder", name: "Murder", verb: "kill", energy: 0, share: [0, 0], heat: 40, integrity: -15, blurb: "" },
  attempted_murder: { id: "attempted_murder", name: "Attempted murder", verb: "try to kill", energy: 0, share: [0, 0], heat: 25, integrity: -10, blurb: "" },
  assault: { id: "assault", name: "Assault", verb: "jump", energy: 0, share: [0, 0], heat: 12, integrity: -5, blurb: "" },
  // Property crimes (see breakin.ts).
  burglary: { id: "burglary", name: "Break-in", verb: "break into the place of", energy: 20, share: [0, 0], heat: 10, integrity: -3, blurb: "" },
  car_theft: { id: "car_theft", name: "Car theft", verb: "steal a car from", energy: 15, share: [0, 0], heat: 8, integrity: -2, blurb: "" },
};

/** The crimes a player can commit from the People list. */
export const CRIME_KINDS: StreetCrime[] = ["pickpocket", "snatch", "mug"];
export const isCrimeKind = (v: unknown): v is StreetCrime => typeof v === "string" && (CRIME_KINDS as string[]).includes(v);

const TRAITS: ClueTrait[] = ["build", "reflexes", "nameStart", "nameEnd", "nameLength", "crew"];
const BYSTANDERS = ["A shopkeeper", "A bus driver", "A street vendor", "A night-shift nurse", "A kid on a bike", "A taxi driver"];
const DECOY_ENDINGS = ["son", "ova", "ski", "ez", "ton", "ard", "ina", "ick", "ell", "an", "ey", "or"];
const LETTERS = "ABCDEFGHIJKLMNOPRSTVW";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];

function nameLength(name: string): string {
  const n = name.replace(/\s/g, "").length;
  return n <= 4 ? "short" : n <= 7 ? "medium" : "long";
}

/** What the criminal looked like at the time of the crime. */
export function suspectProfile(p: Player, crewTag: string | null): Record<ClueTrait, string> {
  const d = describe(p);
  const letters = p.name.replace(/[^\p{L}\p{N}]/gu, "");
  return {
    build: d.body,
    reflexes: d.reflexes,
    nameStart: (letters[0] ?? "?").toUpperCase(),
    nameEnd: letters.slice(-(letters.length >= 5 ? 3 : 2)).toLowerCase(),
    nameLength: nameLength(p.name),
    crew: crewTag ?? "none",
  };
}

const ADVERB: Record<string, string> = { Clumsy: "clumsily", Slow: "slowly", Steady: "steadily", Quick: "quickly", Sharp: "sharply", Lightning: "like lightning" };

export function clueText(trait: ClueTrait, value: string, source?: Tip["source"]): string {
  if (source === "doctor") {
    if (trait === "build") return `The bruising points to an attacker who's ${value.toLowerCase()}.`;
    if (trait === "reflexes") return `The injuries came fast: the attacker moved ${ADVERB[value] ?? value.toLowerCase()}.`;
  }
  if (source === "bank") {
    if (trait === "nameStart") return `The account holder's name starts with "${value}…".`;
    if (trait === "nameEnd") return `The account holder's name ends in "…${value}".`;
    if (trait === "nameLength") return `The account holder has a ${value} name.`;
  }
  switch (trait) {
    case "build":
      return `Body type: ${value.toLowerCase()}.`;
    case "reflexes":
      return `Moved ${ADVERB[value] ?? value.toLowerCase()}.`;
    case "nameStart":
      return `Their name seems to start with "${value}…".`;
    case "nameEnd":
      return `Someone shouted a name ending in "…${value}".`;
    case "nameLength":
      return `A ${value} name, by the sound of it.`;
    case "crew":
      return value === "none" ? "No crew colors on them." : `Wore a [${value}] crew patch.`;
  }
}

function decoyValue(trait: ClueTrait, truth: string, rng: Rng): string {
  const other = (xs: readonly string[]) => pick(xs.filter((x) => x !== truth), rng);
  switch (trait) {
    case "build":
      return other(DESCRIPTORS.body);
    case "reflexes":
      return other(DESCRIPTORS.reflexes);
    case "nameStart":
      return other(LETTERS.split(""));
    case "nameEnd":
      return other(DECOY_ENDINGS);
    case "nameLength":
      return other(["short", "medium", "long"]);
    case "crew":
      return truth === "none" ? pick(["KZ", "IR", "SOL", "VX"], rng) : "none";
  }
}

/** Adds one clue to the case. Accuracy depends on who saw it; traits not yet reported come first. */
export function addTip(
  c: CaseFile,
  source: Tip["source"],
  accuracy: number,
  now: number,
  rng: Rng,
  byId?: string,
  label?: string,
  traits: ClueTrait[] = TRAITS,
): Tip {
  const seen = new Set(c.tips.map((t) => t.trait));
  const fresh = traits.filter((t) => !seen.has(t));
  const trait = pick(fresh.length ? fresh : traits, rng);
  const correct = rng() < accuracy;
  const value = correct ? c.suspect[trait] : decoyValue(trait, c.suspect[trait], rng);
  const tip: Tip = {
    id: `${c.id}-${c.tips.length + 1}`,
    source,
    trait,
    value,
    text: `${label ? `${label}: ` : ""}${clueText(trait, value, source)}`,
    at: now,
    correct,
    ...(byId ? { byId } : {}),
  };
  c.tips.push(tip);
  return tip;
}

/** How reliable a player's eyes are (0.5–0.92). */
export function eyeAccuracy(p: Player, bonus = 0): number {
  return clamp(0.5 + (sv(p, "perception") - 10) / 60 + bonus, 0.5, 0.92);
}

/** A bent cop took money to lose the file: nobody can work it anymore. */
export function fileLost(c: CaseFile): boolean {
  return c.payoff?.status === "taken";
}

export function caseCold(c: CaseFile, now: number): boolean {
  return fileLost(c) || now - c.at >= BALANCE.crime.coldMs;
}

/** Open for scene work and arrests: not cold, and nobody has been arrested for it yet. */
export function caseOpen(c: CaseFile, now: number): boolean {
  return !c.trial && !caseCold(c, now);
}

/** Why `a` can't commit `kind` against `t` right now, or null. */
export function crimeBlock(a: Player, t: Player, kind: CrimeKind, now: number): string | null {
  if (sameOwner(a, t)) return ALT_BLOCK;
  if (a.id === t.id) return "You can't rob yourself.";
  if (a.dead || t.dead) return "They're not around anymore.";
  if (countryOf(a) !== countryOf(t)) return "They're in another country.";
  if (a.travel || t.travel) return "One of you is on the road.";
  if (inJail(a, now)) return "You're in a cell.";
  if (inJail(t, now)) return "They're behind bars.";
  if (inHospital(a, now)) return "You're in the hospital.";
  if (inHospital(t, now)) return "They're in the clinic, behind a security guard.";
  if (now < protectedUntil(t)) return "They're new in town. The street protects newcomers for a while.";
  if (kind === "mug" && now < (t.immuneUntil ?? 0)) return "They just survived a fight. The street leaves them alone for a while.";
  if (now < protectedUntil(a)) return "You're still new in town. Learn the streets first.";
  if (!t.regular && a.reputation > t.reputation * 3 + 15) return "Robbing someone that small would ruin your name.";
  if (now - (a.attackLog?.[`crime:${t.id}`] ?? 0) < BALANCE.crime.cooldownMs) return "They'd recognize you. Give it time.";
  if (a.energy < CRIMES[kind].energy) return "You're too tired.";
  if (kind === "mug" && a.hp < hurtLimit(a, now)) return "You're too hurt to corner anyone.";
  return null;
}

/** Odds of pulling it off, from hidden stats (0.15–0.9). */
export function crimeOdds(a: Player, t: Player, kind: CrimeKind): number {
  const atk =
    kind === "pickpocket"
      ? sv(a, "agility") + sv(a, "wits") * 0.5
      : sv(a, "agility") * 1.1 + sv(a, "nerve") * 0.4;
  const def = kind === "pickpocket" ? sv(t, "perception") * 1.4 : sv(t, "agility") + sv(t, "perception") * 0.5;
  return clamp(0.5 + (atk - def) / (atk + def), 0.15, 0.9);
}

export interface CrimeContext {
  caseId: string;
  district: string;
  crewTag: string | null;
  /** Players nearby who will be asked to report. */
  witnesses: Player[];
  /** The mayor ordered a crackdown: harder, hotter, more eyes on the street. */
  crackdown?: boolean;
}

/** A random district of the country where the crime happens. */
export function crimeDistrict(p: Player, rng: Rng): string {
  const here = DISTRICTS.filter((d) => d.country === countryOf(p));
  return here.length ? pick(here, rng).name : COUNTRY_BY_ID[countryOf(p)].capital;
}

function knockOut(p: Player, now: number, rng: Rng) {
  p.hp = 0;
  const stay = BALANCE.hp.hospitalMinMs + rng() * (BALANCE.hp.hospitalMaxMs - BALANCE.hp.hospitalMinMs);
  p.hospitalUntil = now + Math.round(stay * (p.path === "medicine" ? 0.5 : 1) * clinicFactor(p));
  p.assessmentReady = true;
}

/**
 * `a` commits a crime against `t`. Both must already be ticked to `now`.
 * On success a case file is opened and nearby witnesses are asked whether to report.
 */
export function commitCrime(
  a: Player,
  t: Player,
  kind: StreetCrime,
  now: number,
  rng: Rng,
  ctx: CrimeContext,
): { events: GameEvent[]; caseFile: CaseFile | null; fight?: FightSummary } {
  const block = crimeBlock(a, t, kind, now);
  if (block) throw new GameError(block);
  const def = CRIMES[kind];
  a.energy -= def.energy;
  a.attackLog = { ...(a.attackLog ?? {}), [`crime:${t.id}`]: now };
  if (kind === "mug") {
    // A mugging is an attack: it ends the mugger's protection and protects the survivor.
    a.immuneUntil = 0;
    t.immuneUntil = now + BALANCE.pvp.immunityMs;
  }
  const event = cityEvent(countryOf(a), now);
  const crack = (ctx.crackdown ? BALANCE.city.crackdownHeat : 1) * (event?.crimeHeat ?? 1);
  a.heat += def.heat * COUNTRY_BY_ID[countryOf(a)].heatMult * crack;
  shiftIntegrity(a, def.integrity);
  a.jobCounts[`crime:${kind}`] = (a.jobCounts[`crime:${kind}`] ?? 0) + 1;

  const events: GameEvent[] = [];
  let fight: FightSummary | undefined;
  let success: boolean;

  if (kind === "mug") {
    const res = resolveFight(playerFighter(a, playerMaxHp(a)), { ...playerFighter(t, playerMaxHp(t)), hp: t.hp }, rng);
    fight = { opponent: t.name, icon: "🧍", won: res.won, lines: res.lines, beats: res.beats, start: res.start, outcome: res.won ? "win" : "loss", face: fightFace(t) };
    events.push({ tone: res.won ? "good" : "bad", text: `Mugging: ${t.name}`, fight });
    a.hp = res.playerHp;
    success = res.won;
    if (res.won) {
      t.hp = Math.max(0, t.hp - Math.max(25, t.hp * 0.5));
      if (t.hp <= 0) knockOut(t, now, rng);
    } else if (a.hp <= 0) {
      knockOut(a, now, rng);
      addWound(a, now);
      fight.outcome = "ko";
    }
    a.stats.strength += 0.5;
    a.stats.nerve += 0.4;
  } else {
    success = rng() < crimeOdds(a, t, kind) * (ctx.crackdown ? BALANCE.city.crackdownOdds : 1) * (event?.crimeOdds ?? 1);
    a.stats.agility += 0.5;
    a.stats.nerve += 0.3;
    if (kind === "pickpocket") a.stats.wits += 0.3;
    const lift = kind === "pickpocket";
    const steps: CaperStep[] = [
      { card: "case", ok: true, line: `You pick out ${t.name} in ${ctx.district}.` },
      success
        ? { card: lift ? "lift" : "snatch", ok: true, line: lift ? "Two fingers, one wallet. Smooth." : "You grab the bag and keep moving." }
        : { card: lift ? "lift" : "snatch", ok: false, line: lift ? `${t.name} feels it and grabs your wrist.` : `${t.name} holds on and starts shouting.` },
    ];
    if (success) steps.push({ card: "getaway", ok: true, line: "You melt into the crowd." }, ...witnessStep(ctx.witnesses.length));
    const ev = caperEvent(`${def.name}: ${t.name}`, steps, success ? (ctx.witnesses.length ? "seen" : "clean") : "caught");
    fight = ev.fight;
    events.push(ev);
  }

  if (!success) {
    // Caught in the act: the victim saw exactly who it was. No case needed.
    a.heat += def.heat * 0.5;
    t.reputation += 1;
    events.push({
      tone: "bad",
      text: kind === "mug" ? `${t.name} fought you off and got a good look at your face.` : `${t.name} caught you red-handed. They know your face now.`,
    });
    notify(
      t,
      kind === "mug"
        ? `${a.name} tried to mug you. You fought them off. +1 reputation.`
        : `You caught ${a.name} trying to ${def.verb} you. +1 reputation.`,
      "good",
      a,
      now,
    );
    return { events, caseFile: null, fight };
  }

  const share = def.share[0] + rng() * (def.share[1] - def.share[0]);
  const amount = Math.floor(t.cash * share);
  t.cash -= amount;
  earnDirty(a, amount);
  a.reputation += 1;
  events.push({
    tone: "good",
    text: amount ? `You ${def.verb.replace(/ from$/, "")} ${kind === "mug" ? t.name : `from ${t.name}`} and get away with $${amount}.` : `Empty pockets. You got away with nothing.`,
  });

  a.lastCrime = { caseId: ctx.caseId, at: now };
  t.robbedIn = [{ caseId: ctx.caseId, at: now, amount, district: ctx.district }, ...(t.robbedIn ?? [])].slice(0, 5);
  a.myCases = [{ caseId: ctx.caseId, at: now, kind, district: ctx.district, victimName: t.name }, ...(a.myCases ?? [])].slice(0, 8);
  const c: CaseFile = {
    id: ctx.caseId,
    country: countryOf(a),
    district: ctx.district,
    kind,
    at: now,
    victimId: t.id,
    victimName: t.name,
    amount,
    culpritId: a.id,
    suspect: suspectProfile(a, ctx.crewTag),
    tips: [],
    witnesses: ctx.witnesses.map((w) => w.id),
    investigatedBy: [],
  };

  // The victim saw something too, unless it was a clean lift.
  if (kind !== "pickpocket") addTip(c, "victim", eyeAccuracy(t), now, rng, t.id, "Victim");
  // Stand-in bystanders keep quiet streets from being crime-free zones.
  // In a blackout nobody else sees a thing; in a crackdown there are extra eyes.
  const minWitnesses = event?.maxWitnesses !== undefined ? 0 : BALANCE.crime.minWitnesses + (ctx.crackdown ? 1 : 0);
  for (let i = ctx.witnesses.length; i < minWitnesses; i++) addTip(c, "bystander", 0.6, now, rng, undefined, pick(BYSTANDERS, rng));

  const lost = amount ? `$${amount} gone` : "Nothing taken";
  const what = { pickpocket: "Someone picked your pocket", snatch: "Someone snatched your bag", mug: "Someone mugged you" }[kind];
  notify(t, `${what} in ${ctx.district} and got away. ${lost}. The police opened case #${c.id}.`, "bad", undefined, now);

  const text = `You saw someone ${def.verb} ${t.name} in ${ctx.district}.`;
  for (const w of ctx.witnesses) {
    w.sightings = [{ caseId: c.id, text, at: now, until: now + BALANCE.crime.sightingMs }, ...(w.sightings ?? []).filter((s) => s.until > now)].slice(0, 5);
  }
  events.push(...addMerit(a, "enforcer", { pickpocket: 0.6, snatch: 1, mug: 1.5 }[kind]));
  if (ctx.witnesses.length) events.push({ tone: "info", text: `${ctx.witnesses.length === 1 ? "Someone" : "People"} saw it happen.` });
  return { events, caseFile: c, fight };
}

/** Witness decides to talk. `culprit` may be null if the character no longer exists. */
export function reportSighting(w: Player, c: CaseFile, culprit: Player | null, now: number, rng: Rng): GameEvent[] {
  const s = (w.sightings ?? []).find((x) => x.caseId === c.id);
  if (!s || s.until <= now) throw new GameError("It's too late to report that.");
  w.sightings = (w.sightings ?? []).filter((x) => x.caseId !== c.id);
  if (caseCold(c, now) || c.trial?.verdict) return [{ tone: "info", text: "The case is already closed." }];
  const tip = addTip(c, "witness", eyeAccuracy(w), now, rng, w.id, "Witness");
  w.reputation += BALANCE.crime.reportRep;
  w.jobCounts.report = (w.jobCounts.report ?? 0) + 1;
  shiftIntegrity(w, 1);
  if (culprit && !culprit.dead) {
    notify(culprit, `Word on the street: someone talked to the police about what happened in ${c.district}.`, "bad", undefined, now);
  }
  return [{ tone: "good", text: `You told the police: "${tip.text.replace(/^Witness: /, "")}" Your name stays out of it.` }];
}

export function ignoreSighting(w: Player, caseId: string): GameEvent[] {
  w.sightings = (w.sightings ?? []).filter((x) => x.caseId !== caseId);
  return [{ tone: "info", text: "You look away. Not your business." }];
}

export function canReadCases(p: Player): string | null {
  if (p.path !== "police" || p.rank < BALANCE.crime.readRank) return "Only police officers can read case files.";
  return null;
}

export function investigateBlock(o: Player, c: CaseFile, now: number): string | null {
  if (o.path !== "police" || o.rank < BALANCE.crime.detectiveRank) return "Only detectives can work a scene.";
  if (countryOf(o) !== c.country) return "That case is in another country.";
  if (c.trial) return "Someone has already been arrested for this.";
  if (caseCold(c, now)) return "This case went cold.";
  if (c.investigatedBy.includes(o.id)) return "You already worked this scene.";
  if (c.culpritId === o.id) return "Better not draw attention to this one.";
  if (o.energy < BALANCE.crime.investigateEnergy) return "You're too tired.";
  return null;
}

/** A detective searches the scene: one more clue, more reliable than a witness. */
export function investigate(o: Player, c: CaseFile, now: number, rng: Rng): GameEvent[] {
  const block = investigateBlock(o, c, now);
  if (block) throw new GameError(block);
  o.energy -= BALANCE.crime.investigateEnergy;
  c.investigatedBy.push(o.id);
  const tip = addTip(c, "detective", eyeAccuracy(o, 0.1 + o.rank * 0.02), now, rng, o.id, "Detective");
  o.stats.perception += 0.5;
  o.stats.wits += 0.3;
  return [{ tone: "good", text: `You work the scene in ${c.district}. ${tip.text.replace(/^Detective: /, "")}` }, ...addMerit(o, "police", 1.5)];
}

/** Players who fit the tips, best match first. Never says who did it. */
export interface SuspectMatch {
  id: string;
  name: string;
  matches: number;
}

export function suspectsFor(c: CaseFile, people: { player: Player; crewTag: string | null }[]): SuspectMatch[] {
  if (c.tips.length < 2) return [];
  return people
    .filter(({ player }) => player.id !== c.victimId && !player.dead)
    .map(({ player, crewTag }) => {
      const prof = suspectProfile(player, crewTag);
      return { id: player.id, name: player.name, matches: c.tips.filter((t) => prof[t.trait] === t.value).length };
    })
    .filter((s) => s.matches >= Math.max(2, Math.ceil(c.tips.length / 2)))
    .sort((x, y) => y.matches - x.matches)
    .slice(0, 6);
}

/** What police see. The culprit, the true profile and tip accuracy stay on the server. */
export function caseView(c: CaseFile, viewer: Player, now: number, suspects?: SuspectMatch[]) {
  return {
    id: c.id,
    kind: c.kind,
    crime: CRIMES[c.kind].name,
    district: c.district,
    at: c.at,
    victimName: c.victimName,
    amount: c.amount,
    open: caseOpen(c, now),
    tips: c.tips.map((t) => ({ id: t.id, source: t.source, text: t.text, at: t.at })),
    canInvestigate: investigateBlock(viewer, c, now),
    suspects: suspects ?? null,
    arrested: c.trial ? { suspectName: c.trial.suspectName, officerName: c.trial.officerName } : null,
    witnessStatements: c.tips.filter((t) => t.source === "witness" && t.byId).length,
    searches: (c.searches ?? []).map((s) => ({ name: s.suspectName, found: s.found })),
    searchedByYou: !!c.searches?.some((s) => s.searcherId === viewer.id),
    protectedBy: c.protectedBy?.name ?? null,
  };
}
