// Street titles: what people call you, earned by what you've done. Shown next to your name.

import { COUNTRY_BY_ID } from "./content/world";
import { countryOf } from "./engine";
import type { Player } from "./types";

const count = (p: Player, prefix: string) =>
  Object.entries(p.jobCounts).reduce((s, [k, v]) => (k.startsWith(prefix) ? s + v : s), 0);

/** The most impressive title the player has earned, or null. */
export function streetTitle(p: Player): string | null {
  const city = COUNTRY_BY_ID[countryOf(p)].capital;
  const crimes = count(p, "crime:");
  const wins = p.jobCounts["fight:win"] ?? 0;
  const arrests = p.jobCounts["arrest"] ?? 0;
  const reports = p.jobCounts["report"] ?? 0;
  if (p.path === "enforcer" && crimes >= 25) return `Feared in ${city}`;
  if (arrests >= 10) return "The one they send";
  if (p.path === "vigilante" && (p.jobCounts["hunt"] ?? 0) >= 5) return "A rumor in a mask";
  if (wins >= 40) return "Undefeated on the street";
  if (crimes >= 10) return "Known to the police";
  if (reports >= 5) return "Sees everything";
  if (p.reputation >= 50) return `A name everyone in ${city} knows`;
  if (wins >= 15) return "Brawler";
  if (p.reputation >= 20) return `Known in ${city}`;
  if (p.reputation >= 5) return "Known in the gutter";
  return null;
}
