import { BALANCE } from "../balance";
import type { DistrictId, PathId, Player, StatKey } from "../types";

export interface JobRisk {
  /** Stats averaged to resolve success. */
  stats: StatKey[];
  /** Stat value at which success is a coin flip. */
  difficulty: number;
  failText: string;
  failHeat?: number;
  failHp?: number;
}

export interface JobDef {
  id: string;
  name: string;
  district: DistrictId;
  /** Shown on the card; a short hint of what kind of work it is. */
  tag: string;
  energy: number;
  pay: [number, number];
  /** Hidden XP granted on success. */
  xp: Partial<Record<StatKey, number>>;
  /** Pay grows with this stat (e.g. begging with charisma). */
  payStat?: StatKey;
  integrity?: number;
  heat?: number;
  reputation?: number;
  risk?: JobRisk;
  /** Item that may be found while working. */
  find?: { itemId: string; chance: number };
  path?: PathId;
  minRank?: number;
  /** Extra lock check; returns a reason or null. */
  requires?: (p: Player) => string | null;
  lines: string[];
}

const cleanRecord = (p: Player) =>
  p.heat >= BALANCE.cleanRecordHeat ? "Your record isn't clean right now. Lie low for a while." : null;

export const JOBS: JobDef[] = [
  // ── The Gutter ────────────────────────────────────────────────
  {
    id: "cans",
    name: "Collect cans",
    district: "gutter",
    tag: "Legwork",
    energy: 4,
    pay: [2, 5],
    xp: { toughness: 1, perception: 0.5, agility: 0.3 },
    lines: [
      "You drag a bag of cans to the recycling machine.",
      "The bins behind the stadium were full tonight.",
      "Clink, clink, clink. Every one is a cent.",
    ],
  },
  {
    id: "beg",
    name: "Beg on the corner",
    district: "gutter",
    tag: "Talk",
    energy: 4,
    pay: [1, 7],
    payStat: "charisma",
    xp: { charisma: 1.2, nerve: 0.3 },
    lines: [
      "Most people walk past. A few don't.",
      "A kid drops a coin in your cup and runs.",
      "You tell a stranger your story. They listen.",
    ],
  },
  {
    id: "dumpster",
    name: "Dig through dumpsters",
    district: "gutter",
    tag: "Scavenging",
    energy: 3,
    pay: [1, 3],
    xp: { perception: 1, toughness: 0.6 },
    find: { itemId: "sandwich", chance: 0.18 },
    lines: [
      "The smell is unbearable. The haul is not bad.",
      "Someone threw out a perfectly good pair of socks.",
      "Rats got there first. Mostly.",
    ],
  },
  {
    id: "windshields",
    name: "Wash windshields at the lights",
    district: "gutter",
    tag: "Hustle",
    energy: 6,
    pay: [4, 9],
    xp: { agility: 1, charisma: 0.6, nerve: 0.3 },
    lines: [
      "Squeegee, smile, hand out. Repeat until green.",
      "A trucker tips you a whole five.",
      "One driver nearly runs you over. Another tips double.",
    ],
  },
  {
    id: "shoplift",
    name: "Shoplift from the corner store",
    district: "gutter",
    tag: "Crime",
    energy: 6,
    pay: [5, 14],
    xp: { nerve: 1.2, agility: 0.8, wits: 0.3 },
    integrity: -2,
    heat: 4,
    risk: {
      stats: ["agility", "wits"],
      difficulty: 16,
      failText: "The owner grabs your collar and throws you into the street.",
      failHeat: 12,
      failHp: 10,
    },
    lines: [
      "A few cans of soup disappear into your coat.",
      "In and out. Nobody looked up.",
      "Your heart is pounding. Your pockets are full.",
    ],
  },
  // ── Old Market ────────────────────────────────────────────────
  {
    id: "errands",
    name: "Run errands for Rosa's diner",
    district: "old_market",
    tag: "Legwork",
    energy: 7,
    pay: [5, 9],
    xp: { agility: 0.8, wits: 0.8, charisma: 0.4 },
    integrity: 1,
    reputation: 1,
    lines: [
      "Rosa hands you a list and a twenty. You bring back the change.",
      "Flour, onions, a sack of potatoes. Done before lunch.",
      "Rosa says you're the only one who never shortchanges her.",
    ],
  },
  {
    id: "unload",
    name: "Unload produce trucks",
    district: "old_market",
    tag: "Muscle",
    energy: 10,
    pay: [9, 15],
    xp: { strength: 1.6, toughness: 1 },
    reputation: 1,
    lines: [
      "Crate after crate of cabbages. Your back will remember this.",
      "The driver pays cash and says to come back tomorrow.",
      "You unload a whole truck before sunrise.",
    ],
  },
  {
    id: "pickpocket",
    name: "Pick pockets in the crowd",
    district: "old_market",
    tag: "Crime",
    energy: 7,
    pay: [6, 20],
    xp: { agility: 1.2, perception: 0.8, nerve: 0.8 },
    integrity: -2,
    heat: 5,
    risk: {
      stats: ["agility", "perception"],
      difficulty: 24,
      failText: "\"THIEF!\" The crowd turns on you. You barely get away.",
      failHeat: 15,
      failHp: 15,
    },
    lines: [
      "A fat wallet, a careless tourist.",
      "Two fingers, one smooth motion, gone.",
      "You lift a purse and vanish into the crowd.",
    ],
  },
  // ── Iron Row ──────────────────────────────────────────────────
  {
    id: "warehouse",
    name: "Haul crates in the warehouse",
    district: "iron_row",
    tag: "Muscle",
    energy: 12,
    pay: [14, 22],
    xp: { strength: 2, toughness: 1.4 },
    reputation: 1,
    lines: [
      "The foreman times you. You beat the clock.",
      "Steel parts, heavy as sin. You move them all.",
      "Sweat, rust and a fair day's pay.",
    ],
  },
  {
    id: "security",
    name: "Night security guard",
    district: "iron_row",
    tag: "Watch",
    energy: 10,
    pay: [16, 22],
    xp: { toughness: 1, perception: 1.4, wits: 0.4 },
    integrity: 1,
    reputation: 1,
    requires: (p) =>
      p.housing < 2 ? "They need an address on the form. (Rent a room.)" : cleanRecord(p),
    lines: [
      "A long, quiet night watching the gate.",
      "You chase off two kids trying the fence.",
      "You notice a truck that comes every night at 3am. Odd.",
    ],
  },
  {
    id: "debt_run",
    name: "Help a loan shark collect",
    district: "iron_row",
    tag: "Muscle · Shady",
    energy: 10,
    pay: [15, 30],
    xp: { strength: 1, nerve: 1.5, charisma: 0.4 },
    integrity: -3,
    heat: 6,
    reputation: 1,
    lines: [
      "You stand behind him and look large. It works.",
      "The man pays up before you say a word.",
      "You don't like this work. It pays anyway.",
    ],
  },

  // ── Police path ───────────────────────────────────────────────
  {
    id: "academy_drills",
    name: "Academy drills",
    district: "precinct_square",
    tag: "Training",
    path: "police",
    minRank: 1,
    energy: 10,
    pay: [18, 24],
    xp: { strength: 1, agility: 1.2, toughness: 0.6 },
    integrity: 1,
    requires: cleanRecord,
    lines: [
      "Laps, push-ups, and a sergeant who never stops yelling.",
      "Obstacle course: personal best.",
      "Hand-to-hand drills. You take a hit and keep going.",
    ],
  },
  {
    id: "study_law",
    name: "Study criminal law",
    district: "precinct_square",
    tag: "Study",
    path: "police",
    minRank: 1,
    energy: 8,
    pay: [14, 18],
    xp: { wits: 1.4, perception: 1 },
    integrity: 1,
    requires: cleanRecord,
    lines: [
      "Search and seizure, chapter four. You read it twice.",
      "You find a case file in the library that looks a lot like yours.",
      "Procedure is boring. Procedure is power.",
    ],
  },
  {
    id: "walk_beat",
    name: "Walk the beat",
    district: "precinct_square",
    tag: "Patrol",
    path: "police",
    minRank: 2,
    energy: 10,
    pay: [28, 36],
    xp: { perception: 1.2, toughness: 0.8, charisma: 0.4 },
    integrity: 1,
    reputation: 1,
    requires: cleanRecord,
    lines: [
      "You know every shopkeeper on the block by name now.",
      "You help an old man find his way home.",
      "You walk past the overpass. You remember sleeping there.",
    ],
  },
  {
    id: "respond_call",
    name: "Respond to a call",
    district: "precinct_square",
    tag: "Action",
    path: "police",
    minRank: 2,
    energy: 14,
    pay: [35, 50],
    xp: { strength: 1, agility: 1, nerve: 1 },
    integrity: 1,
    reputation: 2,
    requires: cleanRecord,
    risk: {
      stats: ["strength", "agility"],
      difficulty: 26,
      failText: "The suspect gets away and leaves you with a split lip.",
      failHp: 20,
    },
    lines: [
      "Domestic disturbance. You calm it down without a punch thrown.",
      "Robbery in progress. You make the collar.",
      "A chase across three rooftops. You win.",
    ],
  },
  {
    id: "take_bribe",
    name: "Look the other way",
    district: "precinct_square",
    tag: "Corrupt",
    path: "police",
    minRank: 2,
    energy: 6,
    pay: [60, 120],
    xp: { nerve: 0.8, charisma: 0.6 },
    integrity: -8,
    lines: [
      "An envelope in your pocket. A truck you never saw.",
      "\"Nice night for a walk, officer.\" You keep walking.",
      "The money is easy. Sleeping is harder.",
    ],
  },
  {
    id: "arrest_suspect",
    name: "Arrest a wanted suspect",
    district: "precinct_square",
    tag: "Action",
    path: "police",
    minRank: 3,
    energy: 16,
    pay: [55, 80],
    xp: { strength: 1.2, toughness: 1.2, perception: 0.8 },
    integrity: 1,
    reputation: 3,
    requires: cleanRecord,
    risk: {
      stats: ["strength", "toughness"],
      difficulty: 34,
      failText: "He fights back hard. Backup arrives just in time.",
      failHp: 30,
    },
    lines: [
      "Cuffs on. Rights read. Another one off the street.",
      "He swore he'd never be taken alive. He was.",
      "In his pocket: a business card with a gavel logo. You keep it.",
    ],
  },

  // ── Enforcer path ─────────────────────────────────────────────
  {
    id: "guard_game",
    name: "Guard Kozak's card game",
    district: "iron_row",
    tag: "Watch",
    path: "enforcer",
    minRank: 1,
    energy: 10,
    pay: [20, 30],
    xp: { toughness: 1, nerve: 1, strength: 0.5 },
    heat: 2,
    lines: [
      "Smoke, cards, and you by the door with your arms crossed.",
      "A sore loser reaches for something. You shake your head. He stops.",
      "Kozak counts the pot and slides you your cut.",
    ],
  },
  {
    id: "intimidate",
    name: "Lean on a shopkeeper",
    district: "iron_row",
    tag: "Pressure",
    path: "enforcer",
    minRank: 1,
    energy: 8,
    pay: [15, 25],
    xp: { nerve: 1.5, charisma: 0.6 },
    integrity: -2,
    heat: 3,
    lines: [
      "You don't threaten. You just explain.",
      "\"Kozak sends his regards.\" The envelope appears.",
      "The shopkeeper won't look you in the eye.",
    ],
  },
  {
    id: "collect_debt",
    name: "Collect a debt",
    district: "iron_row",
    tag: "Muscle",
    path: "enforcer",
    minRank: 2,
    energy: 12,
    pay: [35, 55],
    xp: { strength: 1.2, nerve: 1.2 },
    integrity: -2,
    heat: 5,
    reputation: 2,
    risk: {
      stats: ["strength", "nerve"],
      difficulty: 26,
      failText: "He had friends waiting. You limp home empty-handed.",
      failHp: 25,
      failHeat: 4,
    },
    lines: [
      "He pays. With interest.",
      "One look and he empties the register.",
      "\"Tell Kozak I'm sorry.\" You will.",
    ],
  },
  {
    id: "break_racket",
    name: "Break a rival's racket",
    district: "iron_row",
    tag: "Action",
    path: "enforcer",
    minRank: 3,
    energy: 16,
    pay: [70, 110],
    xp: { strength: 1.4, toughness: 1.2, nerve: 1 },
    integrity: -3,
    heat: 10,
    reputation: 3,
    risk: {
      stats: ["strength", "toughness"],
      difficulty: 34,
      failText: "They were ready for you. You're lucky to walk out.",
      failHp: 35,
      failHeat: 6,
    },
    lines: [
      "Their card game is closed. Permanently.",
      "You leave a message they won't forget.",
      "On the rival's desk: a card with a gavel logo. Interesting.",
    ],
  },
];

export const JOB_BY_ID = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<string, JobDef>;
