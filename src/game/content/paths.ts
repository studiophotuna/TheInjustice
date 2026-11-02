import { BALANCE } from "../balance";
import { sv } from "../stats";
import type { PathId, Player, StatKey } from "../types";

export interface PathDef {
  id: PathId;
  name: string;
  side: "law" | "street";
  ranks: string[];
  /** Stats that decide promotions on this path. */
  keyStats: StatKey[];
  /** Average key-stat value needed to reach rank index+2 (rank 2, rank 3…). */
  promotionThresholds: number[];
  /** Jobs needed at rank 1 before a promotion is considered (grows with rank). */
  jobsPerRank: number;
  /** School that trains this career; careers without one are invitation-only. */
  school?: string;
  /** Rank reached on graduating from the school. */
  graduationRank?: number;
  contact: string;
  /** Portrait key for the contact (see components/art/Portraits). */
  contactId: string;
  /** Short description shown on the career card. */
  blurb: string;
  /** Whether a player qualifies for the offer (hidden check). */
  qualifies: (p: Player) => boolean;
  offer: string[];
  accepted: string;
  promotion: (rankTitle: string) => string;
  /** Stats revealed (as vague bands) at each promotion. */
  examStats?: StatKey[];
  examName?: string;
}

const avg = (p: Player, keys: StatKey[]) => keys.reduce((s, k) => s + sv(p, k), 0) / keys.length;

export const PATHS: Record<PathId, PathDef> = {
  police: {
    id: "police",
    name: "Police",
    side: "law",
    ranks: ["Academy Cadet", "Patrol Officer", "Senior Officer", "Detective", "Sergeant", "Lieutenant", "Captain", "Commissioner"],
    keyStats: ["toughness", "perception", "strength"],
    promotionThresholds: [20, 27, 34, 42, 50, 59, 68],
    school: "grayhaven_academy",
    graduationRank: 2,
    jobsPerRank: 10,
    contact: "Sgt. Dana Reyes",
    contactId: "reyes",
    blurb: "Wear the badge. Reopen your own case from the inside.",
    examStats: ["toughness", "perception"],
    examName: "Exam notes",
    qualifies: (p) =>
      p.housing >= 2 &&
      p.heat < BALANCE.cleanRecordHeat &&
      (p.jobCounts.security ?? 0) >= 4 &&
      sv(p, "toughness") + sv(p, "perception") >= 44,
    offer: [
      "A squad car slows down next to you outside the warehouse.",
      "\"I'm Sergeant Reyes. I've seen you on the night shift. You don't sleep on the job, and you notice things.\"",
      "\"The Academy is short on recruits who know the street. I can vouch for you. Interested?\"",
      "She hands you a card. On the back, someone has written your old case number.",
    ],
    accepted:
      "Reyes signs a recommendation and walks it to the Academy herself. \"The Commander still decides. Don't make me look stupid.\"",
    promotion: (t) =>
      `Academy exam passed. The instructor reads your results out loud: you're promoted to ${t}.`,
  },
  enforcer: {
    id: "enforcer",
    name: "Enforcer",
    side: "street",
    ranks: ["Muscle", "Collector", "Enforcer", "Crew Chief", "Fixer", "Lieutenant", "Underboss", "Boss of Iron Row"],
    keyStats: ["strength", "nerve", "toughness"],
    promotionThresholds: [20, 27, 34, 42, 50, 59, 68],
    jobsPerRank: 10,
    contact: "Mr. Kozak",
    contactId: "kozak",
    blurb: "Muscle for a loan shark. Get strong enough that no one can touch you.",
    qualifies: (p) =>
      ((p.jobCounts.debt_run ?? 0) >= 3 || (p.jobCounts["fight:win"] ?? 0) >= 3) &&
      sv(p, "strength") + sv(p, "nerve") >= 42,
    offer: [
      "A man in a camel coat steps out of a black sedan.",
      "\"Name's Kozak. I hear you can handle yourself, and you don't flinch.\"",
      "\"I pay well for people who don't flinch.\"",
      "He leaves a matchbook from a card club on Iron Row. Under the flap: a tiny gavel logo.",
    ],
    accepted: "Kozak shakes your hand. His grip says: now you belong to someone.",
    promotion: (t) => `Kozak pours you a drink. \"You've earned it.\" You're now his ${t}.`,
  },
  courts: {
    id: "courts",
    name: "Courts",
    side: "law",
    ranks: ["Law Student", "Junior Attorney", "Associate", "Senior Attorney", "Partner", "Deputy District Attorney", "Judge", "Chief Justice"],
    keyStats: ["wits", "charisma", "perception"],
    promotionThresholds: [20, 27, 34, 42, 50, 59, 68],
    school: "halloway_law",
    graduationRank: 2,
    jobsPerRank: 10,
    contact: "Counselor Vivian Marsh",
    contactId: "marsh",
    blurb: "Learn the law that buried you, then use it to dig your way out.",
    examStats: ["wits", "charisma"],
    examName: "Bar review",
    qualifies: (p) =>
      p.heat < BALANCE.cleanRecordHeat &&
      (p.jobCounts.court_janitor ?? 0) + (p.jobCounts.court_runner ?? 0) >= 5 &&
      sv(p, "wits") + sv(p, "perception") >= 44,
    offer: [
      "A woman in a gray suit steps around your mop bucket, then stops.",
      "\"You read the case files while you clean, don't you? Nobody else does.\"",
      "\"I'm Vivian Marsh, public defender. You belong in law school, not behind a mop. I can vouch for you.\"",
      "She glances at the name on your cleaning badge, then looks again, like she's seen it before.",
    ],
    accepted: 'Marsh writes to Dean Halloway on your behalf. "He owes me a favor. He hates owing favors. Be brilliant."',
    promotion: (t) => `Marsh signs your papers without looking up. "Congratulations, ${t}. Now the real work starts."`,
  },
  vigilante: {
    id: "vigilante",
    name: "Vigilante",
    side: "law",
    ranks: ["Watcher", "Night Patroller", "Bounty Hunter", "Masked Vigilante", "Protector", "Hunter", "Legend", "Symbol"],
    keyStats: ["agility", "nerve", "perception"],
    promotionThresholds: [20, 27, 34, 42, 50, 59, 68],
    jobsPerRank: 10,
    contact: "Silas, the Night Watchman",
    contactId: "silas",
    blurb: "The system failed you. Protect the streets your own way, outside the law.",
    examStats: ["agility", "nerve"],
    examName: "The Mirror",
    qualifies: (p) =>
      p.stats.integrity >= 0 &&
      (p.jobCounts.watch_walk ?? 0) + (p.jobCounts.break_fight ?? 0) >= 5 &&
      sv(p, "agility") + sv(p, "nerve") >= 44,
    offer: [
      "On a Southside rooftop, an old man in a long scarf is waiting for you.",
      "\"I've watched you walk folks home. Break up fights. Nobody pays you for that.\"",
      "\"Name's Silas. Thirty years a cop, until I testified against the wrong people. Now I watch.\"",
      "\"The law won't protect this street. We will. Just know: the police won't love you for it.\"",
    ],
    accepted: 'Silas hands you a scarf like his. "Cover your face. They can\'t arrest a rumor."',
    promotion: (t) => `Silas nods from the shadows. "The street's started talking about you. ${t}."`,
  },
};

export function rankTitle(p: Player): string | null {
  if (!p.path) return null;
  return PATHS[p.path].ranks[p.rank - 1] ?? null;
}

/** Jobs needed at the given rank before the next promotion review. */
export function jobsNeeded(path: PathId, rank: number): number {
  return PATHS[path].jobsPerRank + 2 * (rank - 1);
}

export function isGraduation(path: PathId, newRank: number): boolean {
  return PATHS[path].graduationRank === newRank;
}

export function keyStatAvg(p: Player, path: PathId): number {
  return avg(p, PATHS[path].keyStats);
}

const NEEDS: Record<StatKey, string> = {
  strength: "stronger",
  toughness: "tougher",
  agility: "quicker on your feet",
  wits: "sharper",
  nerve: "bolder",
  charisma: "better with people",
  perception: "more observant",
};

/** A vague hint about the next promotion. Never reveals numbers. */
export function promotionHint(p: Player): string | null {
  if (!p.path) return null;
  const def = PATHS[p.path];
  if (p.rank >= def.ranks.length) return "You've reached the top rank available for now.";
  const left = jobsNeeded(p.path, p.rank) - p.jobsSinceRank;
  if (left > 0) return `Put in ${left} more job${left === 1 ? "" : "s"} before your next review.`;
  const weakest = [...def.keyStats].sort((a, b) => sv(p, a) - sv(p, b))[0];
  return `${def.contact} says you're not ready yet. You need to get ${NEEDS[weakest]}. Try different kinds of work.`;
}
