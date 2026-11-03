// Monthly seasons with anonymous leaderboards: being on a public list puts a target on your
// back, so entries never show names. You only learn your own place.

import { PATHS } from "./content/paths";
import type { Player } from "./types";

export type SeasonStat = "earned" | "wins" | "arrests" | "reputation";

export const SEASON_STATS: { id: SeasonStat; label: string }[] = [
  { id: "earned", label: "Money made" },
  { id: "wins", label: "Fights won" },
  { id: "arrests", label: "Arrests made" },
  { id: "reputation", label: "Reputation" },
];

/** Seasons are calendar months (UTC). */
export function seasonId(now: number): number {
  const d = new Date(now);
  return d.getUTCFullYear() * 12 + d.getUTCMonth();
}

export function seasonName(id: number): string {
  const d = new Date(Date.UTC(Math.floor(id / 12), id % 12, 1));
  return d.toLocaleString("en", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Resets the player's counters when a new season starts. */
export function ensureSeason(p: Player, now: number) {
  const id = seasonId(now);
  if (p.season?.id !== id) {
    // Keep the finished season's numbers for trophies.
    if (p.season && p.season.id < id) p.lastSeason = { ...p.season };
    p.season = { id, earned: 0, wins: 0, arrests: 0 };
  }
  return p.season;
}

export function bumpSeason(p: Player, key: "earned" | "wins" | "arrests", amount: number, now: number) {
  const s = ensureSeason(p, now);
  s[key] += amount;
}

function score(p: Player, stat: SeasonStat, now: number): number {
  if (stat === "reputation") return p.reputation;
  return p.season?.id === seasonId(now) ? p.season[stat] : 0;
}

/** A vague description that never names anyone. */
function describe(p: Player): string {
  if (!p.path) return "Someone from the street";
  return `Someone in the ${PATHS[p.path].name}`;
}

/** Top 10 per stat, anonymous, plus the viewer's own place. */
export function seasonBoard(players: Player[], viewer: Player, now: number) {
  const live = players.filter((p) => !p.dead);
  return SEASON_STATS.map(({ id, label }) => {
    const ranked = live.map((p) => ({ p, v: score(p, id, now) })).filter((x) => x.v > 0).sort((a, b) => b.v - a.v);
    const mine = ranked.findIndex((x) => x.p.id === viewer.id);
    return {
      id,
      label,
      top: ranked.slice(0, 10).map((x, i) => ({ place: i + 1, who: x.p.id === viewer.id ? "You" : describe(x.p), value: x.v })),
      you: mine >= 0 ? { place: mine + 1, value: ranked[mine].v } : null,
    };
  });
}
