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

export type PathId = "police" | "enforcer" | "courts" | "vigilante" | "medicine" | "banking";
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
  | "exchange"
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
  /** Survived an attack: nobody can attack or mug them until this time. */
  immuneUntil?: number;
  /** Out on bail while their trial (this case) is pending. */
  onBail?: string | null;
  /** Bail set at the arrest (shown on the custody card). */
  bailAmount?: number;
  /** Last free meal from a city soup kitchen. */
  lastSoupAt?: number;
  /** Last time the player had the game open (for "online now"). */
  seenAt?: number;
  /** Recent repetitions of each job or exercise (fades over time), for diminishing returns. */
  practice?: Record<string, { n: number; at: number }>;
  /**
   * Merit earned since the last promotion (named for old saves). Grows with how demanding
   * the work is and with casework; hidden from players.
   */
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
  /** Housing owned in each country; `housing` mirrors the current country's. */
  homes?: Partial<Record<CountryId, HousingTier>>;
  /** Daily login streak and contracts. */
  daily?: Daily;

  // ── Community ──────────────────────────────────────────────
  /** Messages about things other players did to you. */
  inbox?: Notice[];
  /** Crew the player belongs to. */
  crewId?: string | null;
  /** Vouches from high-ranking players, one per career. */
  vouches?: { path: PathId; by: string; byId: string; at: number }[];
  /** Last time this player vouched for someone (one per day). */
  lastVouchAt?: number;
  /** Last time this player attacked each target (anti-bullying cooldown). */
  attackLog?: Record<string, number>;
  /** Players whose chat messages are hidden. */
  blocked?: string[];
  lastChatAt?: number;
  /** Businesses owned: property id → when income was last collected. */
  properties?: Record<string, number>;
  /** Crews that invited this player. */
  crewInvites?: { crewId: string; name: string; tag: string; by: string; at: number }[];
  /** Crimes this player saw and hasn't decided about yet (report or look away). */
  sightings?: Sighting[];
  /** Locked up (custody or a sentence) until this time. */
  jailUntil?: number;
  jailReason?: string | null;
  /** Case the player is held for while awaiting trial. */
  custodyCase?: string | null;
  /** The player's latest successful crime (bankers watch for deposits right after one). */
  lastCrime?: { caseId: string; at: number } | null;
  /** A deposit the bank flagged; the server files it on the case, then clears this. */
  pendingDeposit?: { caseId: string; amount: number; at: number } | null;
  /** City tax withheld from this player's pay, waiting to reach the city treasury. */
  taxOwed?: { country: CountryId; amount: number } | null;
  /** The player's own recent crimes (criminals know what they did). */
  myCases?: { caseId: string; at: number; kind: CrimeKind; district: string; victimName: string }[];
}

// ── Street crime and case files ────────────────────────────────────────────

export type CrimeKind = "pickpocket" | "snatch" | "mug";
/** Things a witness can notice about a criminal. */
export type ClueTrait = "build" | "reflexes" | "nameStart" | "nameEnd" | "nameLength" | "crew";

export interface Sighting {
  caseId: string;
  text: string;
  at: number;
  until: number;
}

export interface Tip {
  id: string;
  source: "witness" | "victim" | "bystander" | "detective" | "doctor" | "bank";
  trait: ClueTrait;
  value: string;
  text: string;
  at: number;
  /** Server-only: whether the tip matches the real criminal. Never sent to players. */
  correct: boolean;
  byId?: string;
}

/** A crime against a player. The criminal's identity stays on the server. */
export interface CaseFile {
  id: string;
  country: CountryId;
  district: string;
  kind: CrimeKind;
  at: number;
  victimId: string;
  victimName: string;
  amount: number;
  /** Server-only. */
  culpritId: string;
  /** Server-only: the criminal as they looked at the time of the crime. */
  suspect: Record<ClueTrait, string>;
  tips: Tip[];
  /** Players who were asked to report. */
  witnesses: string[];
  /** Officers who already searched the scene. */
  investigatedBy: string[];
  trial?: Trial;
  /** A doctor examined the victim's injuries. */
  examinedBy?: { id: string; name: string; at: number };
  /** Cash the criminal deposited soon after the crime; bankers review it. */
  deposit?: { amount: number; at: number; account: string; review?: "reported" | "buried"; reviewerName?: string; reviewerId?: string };
  /** A vigilante went after a suspect on a cold case. */
  hunt?: { hunterId: string; hunterName: string; suspectId: string; suspectName: string; won: boolean; at: number; restitution: number };
  /** The criminal's crew leaned on the witnesses (once per case). */
  intimidatedAt?: number;
  /** Money offered to a police officer to lose the file. */
  payoff?: { fromId: string; copId: string; copName: string; amount: number; at: number; status: "pending" | "taken" | "refused" | "withdrawn" };
  /** Officials internal affairs caught over this case (public). */
  exposed?: { id: string; name: string; role: string; at: number; by: string }[];
}

export interface CourtParty {
  id: string;
  name: string;
  /** 0.3–1: how well they argue. */
  power: number;
}

export type Verdict = "guilty" | "not_guilty";

/** Opened by an arrest; closed by a judge or, if none rules in time, the court clerk. */
export interface Trial {
  suspectId: string;
  suspectName: string;
  officerId: string;
  officerName: string;
  at: number;
  deadline: number;
  /** Share of the tips that fit the suspect at the time of arrest. */
  evidence: number;
  prosecutor?: CourtParty;
  defender?: CourtParty;
  /** Someone posted bail: the suspect waits for the verdict outside. Refunded at the verdict. */
  bail?: { payerId: string; payerName: string; amount: number };
  /** Money the suspect slipped into an envelope for the judge (held until the verdict). */
  bribe?: number;
  verdict?: Verdict;
  decidedBy?: string;
  /** Server-only: the judge who ruled. */
  judgeId?: string;
  decidedAt?: number;
  sentenceMs?: number;
  restitution?: number;
  /** Server-only: the judge took the envelope. Evidence for internal affairs later. */
  bribed?: boolean;
}

export type CrewPolicy = "open" | "request" | "invite";

export interface Notice {
  id: string;
  at: number;
  text: string;
  tone: GameEventTone;
  /** Optional player this is about (e.g. an attacker, for revenge). */
  fromId?: string;
  fromName?: string;
  read: boolean;
}

export interface Crew {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  members: { id: string; name: string; role: "leader" | "member"; joinedAt: number }[];
  requests: { id: string; name: string; at: number }[];
  /** How new members get in. Older crews default to "request". */
  policy?: CrewPolicy;
  invites?: { id: string; name: string; at: number }[];
  vault: number;
  log: { at: number; text: string }[];
  createdAt: number;
  /** A planned prison break for a jailed member (one at a time). */
  breakout?: Breakout | null;
}

export interface Breakout {
  targetId: string;
  targetName: string;
  country: CountryId;
  plannerId: string;
  /** Crew members in on it (the planner first). */
  team: { id: string; name: string }[];
  createdAt: number;
}

export type ContractKind = "jobs" | "fights" | "earn" | "train";

export interface Contract {
  id: string;
  kind: ContractKind;
  label: string;
  target: number;
  progress: number;
  reward: number;
  claimed: boolean;
}

export interface Daily {
  /** UTC day this record is for (YYYY-MM-DD). */
  day: string;
  /** Last UTC day the login reward was claimed. */
  lastClaim: string | null;
  streak: number;
  contracts: Contract[];
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
  | { type: "claim_daily" }
  | { type: "claim_contract"; id: string }
  | { type: "train"; stat: "strength" | "toughness" | "agility" }
  | { type: "buy_property"; id: string }
  | { type: "collect_property"; id: string }
  | { type: "read_inbox" }
  | { type: "enroll" }
  | { type: "dismiss_application" };

export class GameError extends Error {}

// ── City hall ──────────────────────────────────────────────────────────────

/** One per country: an elected mayor, a treasury and city policies. */
export interface City {
  country: CountryId;
  /** Index of the current two-week term. */
  term: number;
  mayor: { id: string; name: string; since: number } | null;
  /** Share of job pay and business income withheld for the treasury. */
  taxRate: number;
  /** Paid from the treasury to the arresting officer for each conviction. */
  policeBounty: number;
  treasury: number;
  crackdownUntil: number;
  lastCrackdownAt: number;
  /** Term in which the mayor last used their pardon. */
  pardonTerm: number;
  lastSalaryAt: number;
  candidates: { id: string; name: string; title: string; reputation: number; pitch: string; at: number }[];
  /** Server-only: who voted for whom (secret ballot). */
  votes: Record<string, string>;
  history: { term: number; name: string | null; votes: number; turnout: number; at: number }[];
  /** Public announcements from city hall. */
  log: { at: number; text: string }[];
  /** Server-only: residents who signed the recall petition against the current mayor. */
  recall?: string[];
  /** Police officer the mayor appointed to run the department. */
  chief?: { id: string; name: string; since: number } | null;
  chiefPaidAt?: number;
  /** Free meals the city has paid for, waiting to be served. */
  soupMeals?: number;
  mealsServed?: number;
  /** Server-only: money the mayor quietly took from the treasury. */
  skims: { mayorId: string; amount: number; at: number; exposed?: boolean }[];
}
