import type { CountryId } from "../types";

export interface PropertyDef {
  id: string;
  name: string;
  country: CountryId;
  price: number;
  /** Dollars earned per hour (a business pays for itself in about two to three weeks). */
  incomePerHour: number;
  description: string;
  icon: string;
}

export const PROPERTIES: PropertyDef[] = [
  { id: "laundromat", name: "Gutter laundromat", country: "varrow", price: 900, incomePerHour: 2, icon: "🧺", description: "Coin machines and a back room nobody asks about." },
  { id: "corner_bar", name: "Southside corner bar", country: "varrow", price: 3500, incomePerHour: 8, icon: "🍺", description: "Cheap beer, loyal regulars, and a jukebox from 1974." },
  { id: "beach_kiosk", name: "Boardwalk kiosk", country: "solmarra", price: 1200, incomePerHour: 3, icon: "🍹", description: "Cold drinks for sunburned tourists." },
  { id: "boutique_hotel", name: "Boutique hotel", country: "solmarra", price: 9000, incomePerHour: 23, icon: "🏨", description: "Twelve rooms, ocean views, guests who pay in cash." },
  { id: "coal_depot", name: "Rail-yard coal depot", country: "kestrova", price: 1000, incomePerHour: 2, icon: "🚂", description: "The state buys every ton. Slowly, but it buys." },
  { id: "black_market_stall", name: "Checkpoint Row stall", country: "kestrova", price: 4000, incomePerHour: 10, icon: "📦", description: "Officially sells soap. Unofficially, everything else." },
  { id: "repair_shop", name: "Undercity repair shop", country: "meridian", price: 1500, incomePerHour: 4, icon: "🔌", description: "Fixing what the towers throw away." },
  { id: "server_rack", name: "Tech Park server rack", country: "meridian", price: 12000, incomePerHour: 32, icon: "🖥️", description: "Rent compute to start-ups that will never make a profit." },
];

export const PROPERTY_BY_ID = Object.fromEntries(PROPERTIES.map((p) => [p.id, p])) as Record<string, PropertyDef>;

/** Uncollected income piles up for at most this long. */
export const PROPERTY_MAX_HOURS = 24;
