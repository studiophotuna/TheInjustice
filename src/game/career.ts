// Changing careers. A player can walk away from their career at any rank: they keep their hidden
// stats (everything they learned), but start over with no career. Coming back to a career they
// held before is quicker (veteran), and finishing a career (rank 8) leaves a permanent legacy.
//
// Guard rails: not while locked up or awaiting trial; the Mafia must leave their crew first (a
// made man walking out still breaks omertà); made status is lost; and there's a day between
// careers before a new one can be accepted.

import { PATHS } from "./content/paths";
import { inJail, issueGear } from "./engine";
import { BALANCE } from "./balance";
import { dirtyOf } from "./money";
import { GameError, type GameEvent, type PathId, type Player, type StatKey } from "./types";
import { statValue } from "./stats";

export const CAREER = {
  /** Time between leaving a career and accepting (or applying for) another one. */
  gapMs: 24 * 60 * 60_000,
  /** A veteran returning to a career needs this share of the usual merit, up to their old best rank. */
  veteranMerit: 0.5,
  /** Pay bonus per finished career (rank 8 when they left it). */
  legacyPay: 0.05,
  legacyMax: 3,
};

/** The best rank this player ever held in a career (from their record). */
export const bestRank = (p: Player, path: PathId) => Math.max(0, ...(p.careerHistory ?? []).filter((c) => c.path === path).map((c) => c.rank));

/** Merit multiplier: veterans climb back to their old best rank twice as fast. */
export function veteranFactor(p: Player): number {
  if (!p.path) return 1;
  return p.rank < bestRank(p, p.path) ? CAREER.veteranMerit : 1;
}

/** Careers finished at the top rank. */
export const legacies = (p: Player): PathId[] => p.legacy ?? [];
export const legacyPayBonus = (p: Player) => 1 + CAREER.legacyPay * Math.min(CAREER.legacyMax, legacies(p).length);

// ── Getting out ────────────────────────────────────────────────────────────
//
// You can't just walk out of a dirty life. The Mafia always has to get clean first, and so does
// anyone in a legit career whose record is dirty (a cop on the take, a banker washing mob money).
// The checklist is about the record, not the badge: an honest lawyer simply resigns.

export const EXIT = {
  /** Honest jobs needed per rank: the higher you climbed, the longer the way back. */
  jobsPerRank: { enforcer: 5, other: 3 },
  /** Conscience you have to get back to (-100..100): not a saint, someone who can live with it. */
  conscience: -25,
  /** Each honest job while getting out mends the conscience a little. */
  consciencePerJob: 2,
};

/** A record the city would call dirty. */
export const dirtyRecord = (p: Player) => p.heat >= BALANCE.cleanRecordHeat || dirtyOf(p) > 0 || p.stats.integrity < EXIT.conscience;

/** Does leaving this career need the checklist at all? */
export function mustGetOut(p: Player): boolean {
  if (!p.path) return false;
  return p.path === "enforcer" || dirtyRecord(p) || !!p.exiting;
}

export function exitJobsNeeded(p: Player): number {
  return Math.max(1, p.rank) * (p.path === "enforcer" ? EXIT.jobsPerRank.enforcer : EXIT.jobsPerRank.other);
}

/** The checklist for getting out. */
export function exitChecklist(p: Player, now: number) {
  const need = exitJobsNeeded(p);
  const done = p.exiting?.jobs ?? 0;
  const items = [
    { id: "jobs", label: `Do ${need} honest jobs`, detail: `${Math.min(done, need)} of ${need}. Any crooked job sets you back to zero.`, done: !!p.exiting && done >= need },
    { id: "heat", label: "Let the heat die down", detail: p.heat >= BALANCE.cleanRecordHeat ? "The police still know your name. Heat fades with time and clean work." : "Clean.", done: p.heat < BALANCE.cleanRecordHeat },
    { id: "dirty", label: "Get rid of the dirty money", detail: dirtyOf(p) > 0 ? `$${dirtyOf(p).toLocaleString("en")} still dirty. Launder it at the bank, or spend it.` : "None left.", done: dirtyOf(p) <= 0 },
    { id: "conscience", label: "Clear your conscience", detail: p.stats.integrity < EXIT.conscience ? "It's still heavy. Every honest job eases it, and so do good choices on the street." : "You can live with yourself.", done: p.stats.integrity >= EXIT.conscience },
    { id: "case", label: "No open case against you", detail: p.onBail || p.custodyCase ? "You're out on bail. The trial has to end first." : "Nothing pending.", done: !p.onBail && !p.custodyCase && !inJail(p, now) },
  ];
  if (p.path === "enforcer") {
    items.push({ id: "crew", label: "Walk away from the crew", detail: p.crewId ? "Leave your crew first. If you were made, the family will remember." : "You're on your own now.", done: !p.crewId });
  }
  return items;
}

/** Starts getting out: from now on, honest jobs count. */
export function startExit(p: Player, now: number): GameEvent[] {
  if (!p.path) throw new GameError("You don't have a career to leave.");
  if (p.exiting) throw new GameError("You're already getting out.");
  p.exiting = { at: now, jobs: 0 };
  return [{ tone: "story", text: p.path === "enforcer" ? "You've decided to get out. Nobody in the family can know yet. Start living straight." : "You've decided to clean up before you resign. Start living straight." }];
}

export function abandonExit(p: Player): GameEvent[] {
  if (!p.exiting) throw new GameError("You weren't getting out.");
  p.exiting = null;
  return [{ tone: "info", text: "You put the idea away. Back to the life." }];
}

/** Called after every job: honest work counts, crooked work resets the count. */
export function exitJobDone(p: Player, criminal: boolean, events: GameEvent[]) {
  if (!p.exiting) return;
  if (criminal) {
    if (p.exiting.jobs > 0) events.push({ tone: "bad", text: "One crooked job and you're back at square one. Getting out means getting out." });
    p.exiting.jobs = 0;
  } else {
    p.exiting.jobs += 1;
    p.stats.integrity = Math.min(100, p.stats.integrity + EXIT.consciencePerJob);
    const need = exitJobsNeeded(p);
    if (p.exiting.jobs === need) events.push({ tone: "good", text: `${need} honest jobs. People are starting to believe you've changed.` });
  }
}

export function leaveBlock(p: Player, now: number): string | null {
  if (!p.path) return "You don't have a career to leave.";
  if (p.custodyCase || inJail(p, now)) return "Not from a cell. Finish what you're in for first.";
  if (mustGetOut(p)) {
    if (!p.exiting) return p.path === "enforcer" ? "Nobody just walks out of the family. Start getting out first." : "Your record is dirty. Clean up before you resign.";
    const left = exitChecklist(p, now).filter((i) => !i.done);
    if (left.length) return `Not clean yet: ${left.map((i) => i.label.toLowerCase()).join(", ")}.`;
  }
  return null;
}

/** Walks away from the career. Stats stay; rank, made status and issued gear go. */
export function leaveCareer(p: Player, now: number): GameEvent[] {
  const block = leaveBlock(p, now);
  if (block) throw new GameError(block);
  const path = p.path!;
  const def = PATHS[path];
  const title = def.ranks[p.rank - 1];
  const finished = p.rank >= def.ranks.length;
  p.careerHistory = [...(p.careerHistory ?? []), { path, rank: p.rank, title, at: now, finished }].slice(-20);
  if (finished && !legacies(p).includes(path)) p.legacy = [...legacies(p), path];
  p.path = null;
  p.rank = 0;
  p.jobsSinceRank = 0;
  p.school = null;
  p.application = null;
  p.careerChangeAt = now;
  p.exiting = null;
  // The street notices again: old offers are gone, and refusals are forgotten.
  p.offers = [];
  p.flags = p.flags.filter((f) => !f.startsWith("declined_"));
  if (path === "enforcer" && p.family) {
    p.family.madeAt = undefined;
    p.family.madeBy = undefined;
    p.family.leads = false;
  }
  issueGear(p);
  const lines: Record<PathId, string> = {
    police: "You hand in your badge and your service pistol. The desk sergeant doesn't look up.",
    enforcer: "You tell Kozak you're out. He says nobody is ever really out. Then he lets you go.",
    courts: "You clear your desk at the firm. The files stay; what you learned leaves with you.",
    vigilante: "You hang up the mask. The city will have to look after itself for a while.",
    medicine: "You hand back your badge at St. Brigid's. Your hands still know the work.",
    banking: "You resign. Your access cards stop working before you reach the lobby.",
    military: "Honorable discharge. You hand in your rifle and walk out of the gate a civilian.",
  };
  const events: GameEvent[] = [{ tone: "story", text: `${lines[path]} You were a ${title}. Everything you learned stays with you.` }];
  if (finished) events.push({ tone: "good", text: `Legacy: a retired ${title}. People remember. You earn ${Math.round(CAREER.legacyPay * 100)}% more on every job, for good.` });
  events.push({ tone: "info", text: "Give it a day before taking on a new career." });
  return events;
}

/** Blocks a new career for a day after leaving the last one. */
export function careerGapBlock(p: Player, now: number): string | null {
  const left = (p.careerChangeAt ?? 0) + CAREER.gapMs - now;
  return left > 0 ? `You only just left your last career. Give it ${Math.ceil(left / 3_600_000)} more hours.` : null;
}

/** For the Me tab. */
export function careerRecordView(p: Player, now: number) {
  return {
    history: (p.careerHistory ?? []).map((c) => ({ path: c.path, name: PATHS[c.path].name, title: c.title, finished: c.finished, at: c.at })),
    legacy: legacies(p).map((path) => `Retired ${PATHS[path].ranks[PATHS[path].ranks.length - 1]}`),
    legacyBonus: Math.round((legacyPayBonus(p) - 1) * 100),
    canLeave: leaveBlock(p, now),
    exit: mustGetOut(p)
      ? { started: !!p.exiting, items: exitChecklist(p, now), ready: !!p.exiting && exitChecklist(p, now).every((i) => i.done) }
      : null,
    veteran: p.path ? bestRank(p, p.path) > p.rank : false,
    gap: careerGapBlock(p, now),
  };
}

// ── How the job changed you ────────────────────────────────────────────────
//
// Each promotion asks one question: what did this rank make you better at? Two answers per
// career, each strengthening two stats. You never see numbers; you feel it.

export const PROMO_PICKS: Record<PathId, [Pick, Pick]> = {
  police: [
    { label: "The beat", text: "Long nights on the street made you harder to put down.", stats: ["toughness", "strength"] },
    { label: "The case", text: "The paperwork taught you to notice what others miss.", stats: ["perception", "wits"] },
  ],
  enforcer: [
    { label: "Muscle", text: "Collecting taught your fists to do the talking.", stats: ["strength", "toughness"] },
    { label: "Respect", text: "People step aside now. You learned to let them.", stats: ["nerve", "charisma"] },
  ],
  courts: [
    { label: "The courtroom", text: "You learned to own a room and hold a jury.", stats: ["charisma", "nerve"] },
    { label: "The casework", text: "You read every file twice. Details stick.", stats: ["wits", "perception"] },
  ],
  vigilante: [
    { label: "The rooftops", text: "Running and jumping until nothing hurts anymore.", stats: ["agility", "toughness"] },
    { label: "The watch", text: "Hours of watching taught you patience and nerve.", stats: ["perception", "nerve"] },
  ],
  medicine: [
    { label: "The ward", text: "Double shifts and worse sights hardened you.", stats: ["toughness", "nerve"] },
    { label: "The diagnosis", text: "You see what's wrong before anyone says it.", stats: ["wits", "perception"] },
  ],
  banking: [
    { label: "The deal", text: "You learned to close, and to never blink first.", stats: ["charisma", "nerve"] },
    { label: "The numbers", text: "Columns of figures taught you where money hides.", stats: ["wits", "perception"] },
  ],
  military: [
    { label: "Assault", text: "Drills made you faster and hit harder.", stats: ["strength", "agility"] },
    { label: "Endurance", text: "Marches and cold nights taught you to outlast.", stats: ["toughness", "nerve"] },
  ],
};
interface Pick {
  label: string;
  text: string;
  stats: [StatKey, StatKey];
}

/** The boost a promotion choice gives (in stat value): grows a little with rank. */
export const promoBoost = (rank: number) => 2 + 0.5 * (rank - 1);

export function promoChoiceView(p: Player) {
  const c = p.promoChoice;
  if (!c || c.path !== p.path) return null;
  return { rank: c.rank, title: PATHS[c.path].ranks[c.rank - 1], options: PROMO_PICKS[c.path].map((o, i) => ({ id: i === 0 ? "a" : "b", label: o.label, text: o.text })) };
}

export function choosePromo(p: Player, pick: "a" | "b"): GameEvent[] {
  const c = p.promoChoice;
  if (!c || c.path !== p.path) throw new GameError("There's nothing to choose right now.");
  const o = PROMO_PICKS[c.path][pick === "a" ? 0 : 1];
  const delta = promoBoost(c.rank);
  for (const k of o.stats) {
    const target = statValue(p.stats[k]) + delta;
    p.stats[k] = Math.max(p.stats[k], ((target - 10) / 4) ** 2);
  }
  p.promoChoice = null;
  return [{ tone: "good", text: `${o.label}. ${o.text}` }];
}
