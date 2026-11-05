// Who you were before they locked you up. Picked at character creation: a small head start in
// two stats and a pointer to the career that fits, with the first job that gets you noticed.
// It never skips the work: offers still come from doing it.

import { DISTRICT_BY_ID } from "./content/districts";
import { JOB_BY_ID } from "./content/jobs";
import { PATHS } from "./content/paths";
import { COUNTRY_BY_ID } from "./content/world";
import type { BackgroundId, PathId, Player, StatKey } from "./types";

export interface BackgroundDef {
  id: BackgroundId;
  name: string;
  /** "Before the judge put you away, you…" */
  story: string;
  /** Hidden XP added at the start (about +8 and +5 on the visible scale). */
  xp: Partial<Record<StatKey, number>>;
  career: PathId;
  /** The work that gets the career's contact to notice you. */
  firstJob: string;
}

export const BACKGROUNDS: BackgroundDef[] = [
  { id: "street", name: "Raised on the street", story: "ran errands for men you shouldn't have known, and learned to never flinch.", xp: { strength: 4, nerve: 2 }, career: "enforcer", firstJob: "debt_run" },
  { id: "boxer", name: "Amateur boxer", story: "fought on Friday nights in a gym that smelled like rust. You won more than you lost.", xp: { strength: 2, toughness: 4 }, career: "military", firstJob: "gym" },
  { id: "cadet", name: "Police cadet", story: "were three weeks from your badge. The badge went to someone else.", xp: { toughness: 3, perception: 3 }, career: "police", firstJob: "security" },
  { id: "nurse", name: "Nursing student", story: "were halfway through nursing school, and good with frightened people.", xp: { wits: 3, perception: 3 }, career: "medicine", firstJob: "clinic_volunteer" },
  { id: "paralegal", name: "Paralegal", story: "filed other people's cases at a law firm. You know how a frame is built.", xp: { wits: 4, perception: 2 }, career: "courts", firstJob: "court_janitor" },
  { id: "clerk", name: "Bank clerk", story: "counted money at a teller window and noticed which accounts never added up.", xp: { wits: 3, charisma: 3 }, career: "banking", firstJob: "count_cash" },
  { id: "garage", name: "Grew up in a garage", story: "could strip an engine before you could drive, in your uncle's shop off Iron Row.", xp: { agility: 3, wits: 3 }, career: "mechanic", firstJob: "garage_hand" },
  { id: "watch", name: "Neighborhood watch", story: "walked your block every night with a flashlight. Nobody else would.", xp: { agility: 3, nerve: 3 }, career: "vigilante", firstJob: "watch_walk" },
];

export const BACKGROUND_BY_ID = Object.fromEntries(BACKGROUNDS.map((b) => [b.id, b])) as Record<BackgroundId, BackgroundDef>;
export const isBackground = (v: unknown): v is BackgroundId => typeof v === "string" && v in BACKGROUND_BY_ID;

/** Applies a background to a fresh character. */
export function applyBackground(p: Player, id: BackgroundId) {
  const b = BACKGROUND_BY_ID[id];
  if (!b) return;
  for (const [k, v] of Object.entries(b.xp) as [StatKey, number][]) p.stats[k] += v;
  p.background = id;
}

/** Where the first job that leads to the career is (the gym for the army). */
function firstStep(b: BackgroundDef) {
  if (b.firstJob === "gym") return { job: "Train strength or toughness at the gym", jobId: null, where: "any gym", country: null };
  const job = JOB_BY_ID[b.firstJob];
  const d = DISTRICT_BY_ID[job.district];
  return { job: job.name, jobId: job.id, where: `${d.name}, ${COUNTRY_BY_ID[d.country].capital}`, country: d.country };
}

/** Home: until a career finds them, a nudge toward the one that fits. */
export function backgroundView(p: Player) {
  if (!p.background) return null;
  const b = BACKGROUND_BY_ID[p.background];
  if (!b) return null;
  const step = firstStep(b);
  return {
    name: b.name,
    story: b.story,
    career: PATHS[b.career].name,
    contact: PATHS[b.career].contact,
    ...step,
    here: step.country === null || step.country === (p.country ?? "varrow"),
    /** Only shown while it's still useful: no career, no offer waiting. */
    show: !p.path && p.offers.length === 0,
  };
}
