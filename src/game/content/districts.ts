import type { DistrictId, Player } from "../types";

/** Jobs completed of any kind (fights excluded). */
export function totalJobs(p: Player): number {
  return Object.entries(p.jobCounts).reduce((s, [k, n]) => (k.includes(":") ? s : s + n), 0);
}

export interface DistrictDef {
  id: DistrictId;
  name: string;
  tagline: string;
  /** Returns a lock reason, or null when the district is open. */
  locked: (p: Player) => string | null;
}

export const DISTRICTS: DistrictDef[] = [
  {
    id: "gutter",
    name: "The Gutter",
    tagline: "Under the overpass, where everyone starts.",
    locked: () => null,
  },
  {
    id: "old_market",
    name: "Old Market",
    tagline: "Street stalls, pawn shops and Rosa's diner.",
    locked: (p) =>
      p.reputation >= 5 || totalJobs(p) >= 20
        ? null
        : `Locals don't know your face yet. (Work ${20 - totalJobs(p)} more jobs, or earn Reputation.)`,
  },
  {
    id: "southside",
    name: "Southside",
    tagline: "Tenements, fire escapes and streets the police stopped patrolling.",
    locked: (p) => (p.reputation >= 10 ? null : "Southside doesn't trust strangers. (Earn some Reputation.)"),
  },
  {
    id: "courthouse_hill",
    name: "Courthouse Hill",
    tagline: "Marble steps, law offices, and the courtroom where you were sentenced.",
    locked: (p) => (p.reputation >= 10 ? null : "Security turns away anyone who looks like they sleep outside."),
  },
  {
    id: "iron_row",
    name: "Iron Row",
    tagline: "Factories, warehouses and back rooms.",
    locked: (p) => (p.reputation >= 15 ? null : "The foremen only hire people with a name on the street."),
  },
  {
    id: "precinct_square",
    name: "Precinct Square",
    tagline: "Police HQ and the academy.",
    locked: (p) => (p.path === "police" ? null : "Only for people wearing the badge."),
  },
];

export const DISTRICT_BY_ID = Object.fromEntries(DISTRICTS.map((d) => [d.id, d])) as Record<
  DistrictId,
  DistrictDef
>;
