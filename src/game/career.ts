// Changing careers. A player can walk away from their career at any rank: they keep their hidden
// stats (everything they learned), but start over with no career. Coming back to a career they
// held before is quicker (veteran), and finishing a career (rank 8) leaves a permanent legacy.
//
// Guard rails: not while locked up or awaiting trial; the Mafia must leave their crew first (a
// made man walking out still breaks omertà); made status is lost; and there's a day between
// careers before a new one can be accepted.

import { PATHS } from "./content/paths";
import { inJail, issueGear } from "./engine";
import { GameError, type GameEvent, type PathId, type Player } from "./types";

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

export function leaveBlock(p: Player, now: number): string | null {
  if (!p.path) return "You don't have a career to leave.";
  if (p.custodyCase || inJail(p, now)) return "Not from a cell. Finish what you're in for first.";
  if (p.path === "enforcer" && p.crewId) return "Leave your crew first. The family doesn't let you walk out with its secrets.";
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
    veteran: p.path ? bestRank(p, p.path) > p.rank : false,
    gap: careerGapBlock(p, now),
  };
}
