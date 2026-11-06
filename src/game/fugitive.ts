// On the run: an inmate who tunnels out is a fugitive for a few hours. Detectives in the city can
// hunt them, customs officers on duty catch them at the checkpoint or the station, airports check
// papers, and the bank freezes their accounts. If nobody catches them before the trail goes cold,
// they're free.

import { BALANCE } from "./balance";
import { COUNTRY_BY_ID } from "./content/world";
import { addMerit, countryOf, inJail } from "./engine";
import { notify } from "./social";
import { sv } from "./stats";
import { GameError, type City, type GameEvent, type Player, type Rng } from "./types";

export const FUGITIVE = {
  ms: 6 * 60 * 60_000,
  /** Back inside for this long when caught. */
  recaptureMs: 45 * 60_000,
  hunt: { energy: 15, cooldownMs: 30 * 60_000 },
  /** City hall's reward to whoever brings them in (capped by the treasury). */
  bounty: 500,
  /** Chance an officer on duty recognizes them at a stop. */
  customsCatch: 0.5,
};

export const isFugitive = (p: Player, now: number) => (p.fugitive?.until ?? 0) > now;

export function goOnTheRun(p: Player, now: number) {
  p.fugitive = { since: now, until: now + FUGITIVE.ms, country: countryOf(p) };
}

/** Caught: straight back inside, for longer. */
export function recapture(p: Player, now: number, how: string) {
  p.fugitive = null;
  p.travel = null;
  p.jailUntil = now + Math.round(FUGITIVE.recaptureMs * COUNTRY_BY_ID[countryOf(p)].heatMult);
  p.jailReason = `Back inside after escaping: ${how}.`;
  p.custodyCase = null;
}

/** At a checkpoint or the station: an officer on duty may recognize a fugitive's face. */
export function customsSpotsFugitive(p: Player, officers: { id: string; name: string }[], now: number, rng: Rng): { id: string; name: string } | null {
  if (!isFugitive(p, now) || !officers.length) return null;
  if (rng() >= FUGITIVE.customsCatch) return null;
  return officers[Math.floor(rng() * officers.length)];
}

export function huntBlock(d: Player, f: Player | null, now: number): string | null {
  if (d.path !== "police" || d.rank < BALANCE.crime.detectiveRank) return "Only detectives hunt escaped prisoners.";
  if (!f || !isFugitive(f, now)) return "They're not on the run.";
  if (f.id === d.id) return "That's you.";
  if (countryOf(f) !== countryOf(d)) return "The trail leads to another city.";
  if (f.travel || d.travel) return "One of you is on the road.";
  if ((f.lieLowUntil ?? 0) > now) return "They've gone to ground. Nobody knows where.";
  if (inJail(d, now)) return "Not from a cell.";
  if (now - (d.attackLog?.[`hunt:${f.id}`] ?? 0) < FUGITIVE.hunt.cooldownMs) return "You just lost them. Give the trail time to warm up.";
  if (d.energy < FUGITIVE.hunt.energy) return "You're too tired.";
  return null;
}

/** Sharp eyes against quick feet and a clever hiding place. */
export function huntOdds(d: Player, f: Player): number {
  const theirs = (sv(f, "agility") + sv(f, "wits")) / 2;
  return Math.max(0.15, Math.min(0.85, 0.45 + (sv(d, "perception") - theirs) / 40));
}

export function huntFugitive(d: Player, f: Player, city: City | null, now: number, rng: Rng): GameEvent[] {
  const block = huntBlock(d, f, now);
  if (block) throw new GameError(block);
  d.energy -= FUGITIVE.hunt.energy;
  d.attackLog = { ...(d.attackLog ?? {}), [`hunt:${f.id}`]: now };
  d.stats.perception += 0.4;
  if (rng() < huntOdds(d, f)) {
    recapture(f, now, `found by Detective ${d.name}`);
    const bounty = city ? Math.min(city.treasury, FUGITIVE.bounty) : 0;
    if (city && bounty) city.treasury -= bounty;
    d.cash += bounty;
    d.reputation += 3;
    d.jobCounts["hunt:fugitive"] = (d.jobCounts["hunt:fugitive"] ?? 0) + 1;
    const events: GameEvent[] = [{ tone: "good", text: `You find ${f.name} in a boarding house by the rail yard. Back to a cell.${bounty ? ` City hall pays a $${bounty} reward.` : ""}` }];
    events.push(...addMerit(d, "police", 3));
    notify(f, `Detective ${d.name} found you. You're back inside, for longer this time.`, "bad", d, now);
    if (city) city.log = [{ at: now, text: `Escaped prisoner ${f.name} recaptured by Detective ${d.name}.` }, ...city.log].slice(0, 20);
    return events;
  }
  notify(f, `Detective ${d.name} came within a door of finding you. Move.`, "bad", d, now);
  return [{ tone: "bad", text: `${f.name} was here an hour ago. The trail goes cold, for now.` }];
}

/** Home: the clock on the run. */
export function fugitiveView(p: Player, now: number) {
  if (!isFugitive(p, now)) return null;
  return { until: p.fugitive!.until, city: COUNTRY_BY_ID[p.fugitive!.country].capital, hidden: (p.lieLowUntil ?? 0) > now };
}
