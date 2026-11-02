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

export type PathId = "police" | "enforcer" | "courts" | "vigilante" | "medicine";
export type CountryId = "varrow" | "solmarra" | "kestrova" | "meridian";
export type TravelMode = "bus" | "train" | "plane";
export type DistrictId =
  | "gutter"
  | "old_market"
  | "southside"
  | "courthouse_hill"
  | "iron_row"
  | "precinct_square"
  | "st_brigids"
  // Solmarra (Port Solace)
  | "boardwalk"
  | "casino_strip"
  | "marina"
  // Kestrova (Ironmoor)
  | "rail_yards"
  | "checkpoint_row"
  | "foundry"
  // Meridian (Halcyon)
  | "undercity"
  | "glass_quarter"
  | "tech_park";
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

  /** Set when the character dies; only a rebirth is possible until it's cleared. */
  dead?: { at: number; cause: string } | null;
  /** How many times this character has died. */
  deaths?: number;

  /** A school application waiting for (or holding) the dean's decision. */
  application?: Application | null;
  /** Can't apply to a school again before this time (after a rejection). */
  applyCooldownUntil?: number;
  /** School the player enrolled at (for graduation). */
  school?: string | null;

  /** Country the player is in (defaults to Varrow for old saves). */
  country?: CountryId;
  /** A trip in progress; the player can't work or fight until it ends. */
  travel?: Trip | null;
  /** Summary of the last finished trip, shown once on arrival. */
  arrival?: Arrival | null;
}

export interface TripIncident {
  kind: "ambush" | "pickpocket" | "customs";
  text: string;
  fight?: FightSummary;
  hpAfter?: number;
  cashLost?: number;
  fine?: number;
  /** Extra time held (customs) in ms. */
  delayMs?: number;
  died?: boolean;
  hospitalMs?: number;
}

export interface Trip {
  from: CountryId;
  to: CountryId;
  mode: TravelMode;
  departAt: number;
  arriveAt: number;
  /** Decided at departure, applied on arrival. */
  incident: TripIncident | null;
}

export interface Arrival {
  to: CountryId;
  mode: TravelMode;
  at: number;
  incident: TripIncident | null;
}

export interface Application {
  school: string;
  path: PathId;
  submittedAt: number;
  decideAt: number;
  /** Contact who vouched, making the application free. */
  vouchedBy: string | null;
  /** Tuition paid (refunded in part if rejected). */
  paid: number;
  status: "pending" | "accepted" | "rejected";
  reason?: string;
}

export interface LogEntry {
  at: number;
  text: string;
  tone: GameEventTone;
}

export type GameEventTone = "good" | "bad" | "info" | "story";

export interface FightSummary {
  opponent: string;
  icon: string;
  won: boolean;
  /** Descriptive round-by-round lines, no numbers. */
  lines: string[];
  outcome: "win" | "loss" | "ko" | "death";
}

export interface GameEvent {
  tone: GameEventTone;
  text: string;
  /** Present on fight results so the client can play the fight scene. */
  fight?: FightSummary;
  /** Optional call to action the client can render as a button. */
  action?: { label: string; target: string };
}

export type Rng = () => number;

export type Action =
  | { type: "create"; name: string; country?: CountryId }
  | { type: "job"; jobId: string }
  | { type: "buy"; itemId: string }
  | { type: "use"; itemId: string }
  | { type: "bank"; op: "open" | "deposit" | "withdraw"; amount?: number }
  | { type: "fight"; npcId: string }
  | { type: "offer"; path: PathId; accept: boolean }
  | { type: "assess" }
  | { type: "flag"; flag: string }
  /** Start a new life after death. Omit `name` to keep the old one. */
  | { type: "rebirth"; name?: string }
  | { type: "apply"; school: string }
  | { type: "travel"; to: CountryId; mode: TravelMode }
  | { type: "ack_arrival" }
  | { type: "enroll" }
  | { type: "dismiss_application" };

export class GameError extends Error {}
