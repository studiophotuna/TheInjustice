// Cut-out characters (background removed) for art that breaks out of its frame. Only clean
// single-person cut-outs exist; anything else falls back to the framed portrait.

const GOOD: Record<string, number[]> = {
  banking: [3, 5, 6],
  courts: [1, 3, 5, 6],
  enforcer: [2, 3, 4, 5, 6, 7],
  medicine: [4, 6, 7, 8],
  military: [4, 5, 8],
  police: [1, 2, 8],
  vigilante: [2, 5],
};

/** The player's own rank portrait, or the nearest clean one in the same career. */
export function cutoutFor(path: string | null | undefined, rank: number | null | undefined): string | null {
  if (!path || !GOOD[path]) return null;
  const r = Math.max(1, Math.min(8, rank ?? 1));
  const best = [...GOOD[path]].sort((a, b) => Math.abs(a - r) - Math.abs(b - r) || b - a)[0];
  return `/cutouts/${path}-${best}.webp`;
}

/** The heaviest-looking cut-out for a career, for the people who run the streets. */
const HEAVY: Record<string, string> = {
  enforcer: "enforcer-3",
  military: "military-4",
  police: "police-8",
  courts: "courts-5",
  banking: "banking-6",
  medicine: "medicine-4",
  vigilante: "vigilante-2",
};
export function heavyCutout(path: string | null | undefined): string {
  return `/cutouts/${(path && HEAVY[path]) || "enforcer-3"}.webp`;
}
