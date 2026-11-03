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
    name: "Mafia",
    side: "street",
    // The family ladder: hang-around, sworn in, run a crew, advise, second in command, the top.
    ranks: ["Associate", "Soldier", "Made Man", "Capo", "Consigliere", "Underboss", "Boss", "Don"],
    keyStats: ["strength", "nerve", "toughness"],
    promotionThresholds: [20, 27, 34, 42, 50, 59, 68],
    jobsPerRank: 7,
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
  medicine: {
    id: "medicine",
    name: "Medicine",
    side: "law",
    ranks: ["Medical Student", "Intern", "Resident", "Doctor", "Specialist", "Surgeon", "Chief of Surgery", "Medical Director"],
    keyStats: ["wits", "perception", "toughness"],
    promotionThresholds: [20, 27, 34, 42, 50, 59, 68],
    jobsPerRank: 10,
    school: "st_brigids_med",
    graduationRank: 2,
    contact: "Doc Mercy",
    contactId: "mercy",
    blurb: "Heal the city that broke you. Doctors see everything, even what the dead can't say.",
    examStats: ["wits", "perception"],
    examName: "Board review",
    qualifies: (p) =>
      p.heat < BALANCE.cleanRecordHeat &&
      (p.jobCounts.clinic_volunteer ?? 0) + (p.jobCounts.er_mop ?? 0) >= 5 &&
      sv(p, "wits") + sv(p, "perception") >= 44,
    offer: [
      "Doc Mercy peels off her gloves and looks at you over her glasses.",
      "\"You've got steady hands and you don't faint at blood. That's half of medicine.\"",
      "\"The other half is eight years of school you can't afford. Unless someone vouches for you.\"",
      "\"I patched you up once. Let me do it properly this time.\"",
    ],
    accepted: 'Doc Mercy calls the dean at St. Brigid\'s. "Helena, I have a student for you. Yes, that one."',
    promotion: (t) => `Doc Mercy pins a new badge on your coat. "${t}. Don't let it go to your head."`,
  },
  banking: {
    id: "banking",
    name: "Banking",
    side: "law",
    ranks: ["Finance Student", "Bank Teller", "Loan Officer", "Analyst", "Investment Banker", "Fund Manager", "Bank Director", "Governor of the Exchange"],
    keyStats: ["wits", "charisma", "nerve"],
    promotionThresholds: [20, 27, 34, 42, 50, 59, 68],
    jobsPerRank: 10,
    school: "solace_finance",
    graduationRank: 2,
    contact: "Isadora Quell",
    contactId: "quell",
    blurb: "Follow the money. In Port Solace, money is the only thing that never lies.",
    examStats: ["wits", "charisma"],
    examName: "Audit",
    qualifies: (p) =>
      p.heat < BALANCE.cleanRecordHeat &&
      (p.jobCounts.count_cash ?? 0) + (p.jobCounts.broker_errands ?? 0) >= 5 &&
      sv(p, "wits") + sv(p, "charisma") >= 44,
    offer: [
      "A woman in white linen watches you count a stack of bills twice. You're never wrong.",
      "\"Isadora Quell. Private banking. I've had eleven clerks this year. None of them could count.\"",
      "\"The Institute only takes rich kids. Unless someone they respect vouches for you. I'm someone.\"",
      "She smiles. \"And I'd like to know why a Grayhaven judge keeps forty accounts in my bank.\"",
    ],
    accepted: 'Quell writes to the Institute on bank letterhead. "They won\'t say no to me. They might say no to you, so be impressive."',
    promotion: (t) => `Quell raises a glass of something expensive. "To the new ${t}. Don't let them see you count."`,
  },
  military: {
    id: "military",
    name: "Military",
    side: "law",
    ranks: ["Recruit", "Private", "Corporal", "Sergeant", "Lieutenant", "Captain", "Colonel", "General"],
    keyStats: ["strength", "toughness", "agility"],
    promotionThresholds: [22, 29, 36, 44, 52, 61, 70],
    jobsPerRank: 7.5,
    school: "ironmoor_military",
    graduationRank: 2,
    contact: "Sergeant Major Brann",
    contactId: "brann",
    blurb: "Pass basic training and the army hands you a rifle. Rise, and it hands you heavier things.",
    examStats: ["strength", "toughness"],
    examName: "Fitness report",
    qualifies: (p) =>
      p.heat < BALANCE.cleanRecordHeat &&
      (p.jobCounts["gym:strength"] ?? 0) + (p.jobCounts["gym:toughness"] ?? 0) >= 6 &&
      sv(p, "strength") + sv(p, "toughness") >= 46,
    offer: [
      "A man with a shaved head and a voice like gravel watches you finish a set at the gym.",
      "\"Sergeant Major Brann. Ironmoor garrison. You train like somebody's coming for you.\"",
      "\"Basic training is twelve weeks. Pass it and you get a rifle, a bunk and a reason to get up.\"",
      "He hands you a recruiting card. On the back, in pencil: a Grayhaven case number. Yours.",
    ],
    accepted: 'Brann signs your papers with a pen he clearly stole. "Ironmoor, then. Bring boots that fit."',
    promotion: (t) => `Brann pins the new stripes on your collar himself. "${t}. Don't make me regret it."`,
  },
};

export function rankTitle(p: Player): string | null {
  if (!p.path) return null;
  return PATHS[p.path].ranks[p.rank - 1] ?? null;
}

/** Jobs needed at the given rank before the next promotion review. */
/**
 * Merit needed for the next review. Merit comes from how hard the work was (see
 * `jobMerit` in the engine) and from casework, not from how many jobs were done.
 * Roughly `jobsPerRank` jobs at your own level; easy work below your rank barely counts.
 */
export function meritNeeded(path: PathId, rank: number): number {
  const { meritGrowth, meritScale, firstRankMult } = BALANCE.progress;
  return (PATHS[path].jobsPerRank / 10) * meritScale * 10 * Math.pow(meritGrowth, rank - 1) * (rank === 1 ? firstRankMult : 1);
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
  // Never a number: only how the people above you talk about you.
  const progress = p.jobsSinceRank / meritNeeded(p.path, p.rank);
  if (progress < 0.35) return `${def.contact} hasn't noticed you yet. Harder work gets noticed; easy work doesn't.`;
  if (progress < 0.75) return `People mention your name around ${def.contact}. Keep taking on tougher work.`;
  if (progress < 1) return `${def.contact} has been asking about you.`;
  const weakest = [...def.keyStats].sort((a, b) => sv(p, a) - sv(p, b))[0];
  return `${def.contact} says you're not ready yet. You need to get ${NEEDS[weakest]}. Try different kinds of work.`;
}
