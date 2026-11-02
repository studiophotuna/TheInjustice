import type { CountryId, DistrictId, Player } from "../types";

/** Jobs completed of any kind (fights excluded). */
export function totalJobs(p: Player): number {
  return Object.entries(p.jobCounts).reduce((s, [k, n]) => (k.includes(":") ? s : s + n), 0);
}

export interface DistrictDef {
  id: DistrictId;
  country: CountryId;
  name: string;
  tagline: string;
  /** Returns a lock reason, or null when the district is open. */
  locked: (p: Player) => string | null;
  /** Hidden unless this returns true (e.g. career-only districts). */
  visible?: (p: Player) => boolean;
}

const rep = (n: number, why: string) => (p: Player) => (p.reputation >= n ? null : `${why} (Reputation ${n} needed.)`);

export const DISTRICTS: DistrictDef[] = [
  // ── Varrow · Grayhaven ────────────────────────────────────────
  {
    id: "gutter",
    country: "varrow",
    name: "The Gutter",
    tagline: "Under the overpass, where everyone starts.",
    locked: () => null,
  },
  {
    id: "old_market",
    country: "varrow",
    name: "Old Market",
    tagline: "Street stalls, pawn shops and Rosa's diner.",
    locked: (p) =>
      p.reputation >= 5 || totalJobs(p) >= 20
        ? null
        : `Locals don't know your face yet. (Work ${20 - totalJobs(p)} more jobs, or earn Reputation.)`,
  },
  {
    id: "southside",
    country: "varrow",
    name: "Southside",
    tagline: "Tenements, fire escapes and streets the police stopped patrolling.",
    locked: rep(10, "Southside doesn't trust strangers."),
  },
  {
    id: "courthouse_hill",
    country: "varrow",
    name: "Courthouse Hill",
    tagline: "Marble steps, law offices, and the courtroom where you were sentenced.",
    locked: rep(10, "Security turns away anyone who looks like they sleep outside."),
  },
  {
    id: "st_brigids",
    country: "varrow",
    name: "St. Brigid's",
    tagline: "The city hospital, its medical school, and the free clinic out back.",
    locked: () => null,
  },
  {
    id: "iron_row",
    country: "varrow",
    name: "Iron Row",
    tagline: "Factories, warehouses and back rooms.",
    locked: rep(15, "The foremen only hire people with a name on the street."),
  },
  {
    id: "precinct_square",
    country: "varrow",
    name: "Precinct Square",
    tagline: "Police HQ and the academy.",
    locked: (p) => (p.path === "police" ? null : "Only for people wearing the badge."),
    visible: (p) => p.path === "police",
  },

  // ── Solmarra · Port Solace ────────────────────────────────────
  {
    id: "boardwalk",
    country: "solmarra",
    name: "The Boardwalk",
    tagline: "Sun, sand, and people sleeping under the pier.",
    locked: () => null,
  },
  {
    id: "casino_strip",
    country: "solmarra",
    name: "Casino Strip",
    tagline: "Neon, high rollers and the house that always wins.",
    locked: rep(8, "The doormen don't let in people who smell like the pier."),
  },
  {
    id: "marina",
    country: "solmarra",
    name: "The Marina",
    tagline: "Yachts, cargo ships, and crates nobody inspects.",
    locked: rep(15, "Dock bosses only hire faces they know."),
  },

  // ── Kestrova · Ironmoor ───────────────────────────────────────
  {
    id: "rail_yards",
    country: "kestrova",
    name: "Rail Yards",
    tagline: "Freight cars, coal smoke and people living in boxcars.",
    locked: () => null,
  },
  {
    id: "checkpoint_row",
    country: "kestrova",
    name: "Checkpoint Row",
    tagline: "Papers, please. Every street corner has a guard post.",
    locked: rep(8, "You need papers here, and a name to put on them."),
  },
  {
    id: "foundry",
    country: "kestrova",
    name: "The Foundry",
    tagline: "State steelworks running day and night.",
    locked: rep(15, "The foundry only hires workers with a record of hard labor."),
  },

  // ── Meridian · Halcyon ────────────────────────────────────────
  {
    id: "undercity",
    country: "meridian",
    name: "The Undercity",
    tagline: "Under the towers, where the light never reaches.",
    locked: () => null,
  },
  {
    id: "glass_quarter",
    country: "meridian",
    name: "Glass Quarter",
    tagline: "Corporate towers, private security and very rich people.",
    locked: rep(10, "Private security escorts you out of the lobby."),
  },
  {
    id: "tech_park",
    country: "meridian",
    name: "Tech Park",
    tagline: "Server farms, start-ups and secrets worth stealing.",
    locked: rep(18, "Badge access only. You'll need someone to vouch for you."),
  },
];

export const DISTRICT_BY_ID = Object.fromEntries(DISTRICTS.map((d) => [d.id, d])) as Record<
  DistrictId,
  DistrictDef
>;
