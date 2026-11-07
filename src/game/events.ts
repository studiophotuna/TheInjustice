// City events: every hour, each city may have something going on that changes the streets for
// that hour. Deterministic from the city and the hour, so every player sees the same event.

import type { CountryId } from "./types";

export interface CityEvent {
  id: "heatwave" | "festival" | "blackout" | "storm" | "payday";
  name: string;
  text: string;
  /** Multiplies job pay. */
  payMult: number;
  /** Multiplies the odds of pulling off a crime. */
  crimeOdds: number;
  /** Multiplies heat from crimes. */
  crimeHeat: number;
  /** Fewer people on the street: at most this many witnesses, and no stand-in bystanders. */
  maxWitnesses?: number;
  endsAt: number;
}

const EVENTS: Omit<CityEvent, "endsAt">[] = [
  { id: "heatwave", name: "Heat wave", text: "Tempers are short and the police are slow in the heat.", payMult: 1, crimeOdds: 1.1, crimeHeat: 0.8 },
  { id: "festival", name: "Street festival", text: "Crowds everywhere: more work, more pockets, more eyes.", payMult: 1.2, crimeOdds: 1.05, crimeHeat: 1 },
  { id: "blackout", name: "Blackout", text: "The power is out. Nobody sees much in the dark.", payMult: 0.9, crimeOdds: 1.2, crimeHeat: 1, maxWitnesses: 1 },
  { id: "storm", name: "Storm", text: "Rain empties the streets. Work is slow; so are the patrols.", payMult: 0.85, crimeOdds: 1.05, crimeHeat: 0.9 },
  { id: "payday", name: "Payday", text: "Wallets are full today. Everyone's spending.", payMult: 1.1, crimeOdds: 1, crimeHeat: 1.1 },
];

const HOUR = 60 * 60_000;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}

/** What an event changes, in plain words for players. Crime chances stay words, never numbers. */
export function eventEffects(e: CityEvent): string[] {
  const out: string[] = [];
  if (e.payMult > 1) out.push(`Jobs pay ${Math.round((e.payMult - 1) * 100)}% more`);
  if (e.payMult < 1) out.push(`Jobs pay ${Math.round((1 - e.payMult) * 100)}% less`);
  if (e.crimeOdds >= 1.15) out.push("Crimes are much easier to pull off");
  else if (e.crimeOdds > 1) out.push("Crimes are a little easier to pull off");
  if (e.maxWitnesses !== undefined) out.push("Hardly anyone sees anything: few witnesses");
  if (e.crimeHeat < 1) out.push("Crimes draw less heat from the police");
  if (e.crimeHeat > 1) out.push("Crimes draw more heat than usual");
  return out;
}

/** What's happening in this city this hour, if anything (about one hour in three). */
export function cityEvent(country: CountryId, now: number): CityEvent | null {
  const hour = Math.floor(now / HOUR);
  const h = hash(`${country}:${hour}`);
  if (h % 3 !== 0) return null;
  const def = EVENTS[Math.floor(h / 3) % EVENTS.length];
  return { ...def, endsAt: (hour + 1) * HOUR };
}
