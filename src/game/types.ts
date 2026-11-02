// Core game types. Everything in `Player` lives on the server only.
// The client receives a `PublicView` (see view.ts) with hidden stats stripped out.

export const STAT_KEYS = [
  "strength",
  "toughness",
  "agility",
  "wits",
  "nerve",
  "charisma",
  "perception",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** Hidden stat experience. Never sent to the client. */
export type HiddenStats = Record<StatKey, number> & {
  /** Moral compass, -100..100. The only stat that can go down. */
  integrity: number;
};

export type PathId = "police" | "enforcer";
export type DistrictId = "gutter" | "old_market" | "iron_row" | "precinct_square";
export type HousingTier = 0 | 1 | 2;

export interface Player {
  id: string;
  name: string;
  createdAt: number;

  cash: number;
  bank: number;
  hasBankAccount: boolean;

  /** Fractional; regenerates over time. */
  energy: number;
  /** Timestamp energy, hp and heat were last brought up to date. */
  tickAt: number;

  /** Fractional; regenerates over time. */
  hp: number;
  hospitalUntil: number;
  /** Can't eat again until this time (prevents food → energy exploits). */
  fullUntil: number;

  /** How wanted you are. Fractional; cools down over time. */
  heat: number;
  reputation: number;
  housing: HousingTier;
  inventory: Record<string, number>;

  stats: HiddenStats;

  path: PathId | null;
  rank: number;
  /** Path offers the player has received but not yet answered. */
  offers: PathId[];
  /** Completed jobs per job id (for diminishing returns and promotions). */
  jobCounts: Record<string, number>;
  /** Jobs completed since the last promotion. */
  jobsSinceRank: number;
  flags: string[];

  /** Set after a hospital stay; Doc Mercy can be visited once. */
  assessmentReady: boolean;
  lastAssessmentAt: number;

  log: LogEntry[];
}

export interface LogEntry {
  at: number;
  text: string;
  tone: GameEventTone;
}

export type GameEventTone = "good" | "bad" | "info" | "story";

export interface GameEvent {
  tone: GameEventTone;
  text: string;
  /** Optional call to action the client can render as a button. */
  action?: { label: string; target: string };
}

export type Rng = () => number;

export type Action =
  | { type: "create"; name: string }
  | { type: "job"; jobId: string }
  | { type: "buy"; itemId: string }
  | { type: "use"; itemId: string }
  | { type: "bank"; op: "open" | "deposit" | "withdraw"; amount?: number }
  | { type: "fight"; npcId: string }
  | { type: "offer"; path: PathId; accept: boolean }
  | { type: "assess" }
  | { type: "flag"; flag: string };

export class GameError extends Error {}
