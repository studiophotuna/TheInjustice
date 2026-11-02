// The four countries. All are open from the start: players choose where to live and travel
// between them by bus, train or plane. Each has its own laws and districts. See docs/WORLD.md.

import type { CountryId, DistrictId, TravelMode } from "../types";

export interface CountryDef {
  id: CountryId;
  name: string;
  capital: string;
  mood: string;
  laws: string;
  color: string;
  /** District where new arrivals and new characters start. */
  startDistrict: DistrictId;
  /** Map position for travel distances (arbitrary units). */
  pos: [number, number];
  /** Multiplies all job pay here. */
  payMult: number;
  /** Multiplies heat gained from crimes here. */
  heatMult: number;
  /** Multiplies shop prices here. */
  priceMult: number;
  /** Schools for careers that don't exist yet. Open schools live in schools.ts. */
  plannedSchools: { name: string; career: string }[];
  /** Shown when a new character chooses to start here. */
  startStory: string;
}

export const COUNTRIES: CountryDef[] = [
  {
    id: "varrow",
    name: "Varrow",
    capital: "Grayhaven",
    mood: "Rain-soaked port city, crooked courts.",
    laws: "Average sentences. Judges easily bought.",
    color: "#38e1ff",
    startDistrict: "gutter",
    pos: [0, 0],
    payMult: 1,
    heatMult: 1,
    priceMult: 1,
    plannedSchools: [],
    startStory: "You stay where they framed you. Grayhaven owes you answers.",
  },
  {
    id: "solmarra",
    name: "Solmarra",
    capital: "Port Solace",
    mood: "Casinos, beaches and dirty money.",
    laws: "Lax police, cheap bribes. Crime draws less heat.",
    color: "#ffc24b",
    startDistrict: "boardwalk",
    pos: [3, -2],
    payMult: 1.1,
    heatMult: 0.6,
    priceMult: 1.2,
    plannedSchools: [],
    startStory: "You spend your last coins on a ferry south. If you're going to be broke, be broke in the sun.",
  },
  {
    id: "kestrova",
    name: "Kestrova",
    capital: "Ironmoor",
    mood: "Cold, strict and watched.",
    laws: "Harsh police. Crime draws much more heat. Honest work pays steady.",
    color: "#a8c6ff",
    startDistrict: "rail_yards",
    pos: [-3, -3],
    payMult: 0.95,
    heatMult: 1.6,
    priceMult: 0.85,
    plannedSchools: [{ name: "Ironmoor Military Academy", career: "Military" }],
    startStory: "You ride a freight car north to Ironmoor. Nobody there knows your face, and they watch every face.",
  },
  {
    id: "meridian",
    name: "Meridian",
    capital: "Halcyon",
    mood: "Glass towers and the richest people alive.",
    laws: "Rich pay, high prices. Street crime is punished hard.",
    color: "#9b7bff",
    startDistrict: "undercity",
    pos: [4, 3],
    payMult: 1.3,
    heatMult: 1.3,
    priceMult: 1.5,
    plannedSchools: [
      { name: "Meridian Corporate Law School", career: "Courts (corporate)" },
      { name: "Halcyon Tech Institute", career: "Hacking & security" },
    ],
    startStory: "You stow away on a cargo plane to Halcyon. Down in the Undercity, the towers block out the sky.",
  },
];

export const COUNTRY_BY_ID = Object.fromEntries(COUNTRIES.map((c) => [c.id, c])) as Record<CountryId, CountryDef>;

export interface TravelModeDef {
  id: TravelMode;
  name: string;
  /** Minutes per distance unit (shortened for testing). */
  minutesPerUnit: number;
  /** Dollars per distance unit. */
  costPerUnit: number;
  risk: string;
  /** Chance the mode's danger happens on a trip. */
  riskChance: number;
}

export const TRAVEL_MODES: TravelModeDef[] = [
  {
    id: "bus",
    name: "Bus",
    minutesPerUnit: 4,
    costPerUnit: 6,
    risk: "Cheap and slow. Gangs know the bus routes and plan ambushes.",
    riskChance: 0.3,
  },
  {
    id: "train",
    name: "Train",
    minutesPerUnit: 2,
    costPerUnit: 18,
    risk: "Faster. Crowded carriages are full of pickpockets.",
    riskChance: 0.35,
  },
  {
    id: "plane",
    name: "Airplane",
    minutesPerUnit: 0.6,
    costPerUnit: 70,
    risk: "Fastest and most expensive. Customs stops anyone with heat on them.",
    riskChance: 1,
  },
];

export const MODE_BY_ID = Object.fromEntries(TRAVEL_MODES.map((m) => [m.id, m])) as Record<TravelMode, TravelModeDef>;

export function distance(a: CountryId, b: CountryId): number {
  const [x1, y1] = COUNTRY_BY_ID[a].pos;
  const [x2, y2] = COUNTRY_BY_ID[b].pos;
  return Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1)));
}

export function tripCost(from: CountryId, to: CountryId, mode: TravelMode): number {
  return Math.round(distance(from, to) * MODE_BY_ID[mode].costPerUnit);
}

export function tripMs(from: CountryId, to: CountryId, mode: TravelMode): number {
  return Math.round(distance(from, to) * MODE_BY_ID[mode].minutesPerUnit * 60_000);
}
