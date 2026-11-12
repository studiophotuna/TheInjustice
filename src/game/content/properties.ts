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
  { id: "laundromat", name: "Gutter laundromat", country: "varrow", price: 2250, incomePerHour: 4, icon: "🧺", description: "Coin machines and a back room nobody asks about." },
  { id: "corner_bar", name: "Southside corner bar", country: "varrow", price: 8750, incomePerHour: 16, icon: "🍺", description: "Cheap beer, loyal regulars, and a jukebox from 1974." },
  { id: "beach_kiosk", name: "Boardwalk kiosk", country: "solmarra", price: 3000, incomePerHour: 6, icon: "🍹", description: "Cold drinks for sunburned tourists." },
  { id: "boutique_hotel", name: "Boutique hotel", country: "solmarra", price: 140000, incomePerHour: 280, icon: "🏨", description: "Twelve rooms, ocean views, guests who pay in cash." },
  { id: "coal_depot", name: "Rail-yard coal depot", country: "kestrova", price: 2500, incomePerHour: 4, icon: "🚂", description: "The state buys every ton. Slowly, but it buys." },
  { id: "black_market_stall", name: "Checkpoint Row stall", country: "kestrova", price: 10000, incomePerHour: 20, icon: "📦", description: "Officially sells soap. Unofficially, everything else." },
  { id: "repair_shop", name: "Undercity repair shop", country: "meridian", price: 3750, incomePerHour: 8, icon: "🔌", description: "Fixing what the towers throw away." },
  { id: "server_rack", name: "Tech Park server rack", country: "meridian", price: 30000, incomePerHour: 64, icon: "🖥️", description: "Rent compute to start-ups that will never make a profit." },
  { id: "nightclub", name: "Casino Strip nightclub", country: "solmarra", price: 95000, incomePerHour: 190, icon: "🪩", description: "Velvet ropes, a line around the block, and a back office that counts cash all night." },
  { id: "steel_mill", name: "Foundry steel mill share", country: "kestrova", price: 120000, incomePerHour: 240, icon: "🏭", description: "A seat on the board of the mill that built Ironmoor. The state is your biggest customer." },
];

export const PROPERTY_BY_ID = Object.fromEntries(PROPERTIES.map((p) => [p.id, p])) as Record<string, PropertyDef>;

/** Uncollected income piles up for at most this long. */
export const PROPERTY_MAX_HOURS = 24;
