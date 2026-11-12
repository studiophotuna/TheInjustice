import type { HousingTier, PathId } from "../types";

export type ItemKind = "food" | "housing" | "weapon" | "armor" | "medical";

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  price: number;
  description: string;
  icon: string;
  /** food: energy restored */
  energy?: number;
  /** food: a quick boost (coffee, an energy drink) instead of a meal. Boosts share one timer and a daily limit. */
  boost?: boolean;
  /** A boost that takes some health with it. */
  hpCost?: number;
  /** housing: tier granted */
  housing?: HousingTier;
  /** weapon/armor: combat bonus */
  power?: number;
  /** weapon/armor: how it changes your speed. Quick weapons add, heavy gear takes away. */
  agility?: number;
  /** weapon/armor: uses before it breaks (fights, rough jobs). Issued gear is serviced for free. */
  durability?: number;
  /** medical: hp restored */
  heal?: number;
  /** Issued by a career at a rank, never sold. Handed back if you leave the career. */
  issued?: { path: PathId; rank: number };
  /** Stolen army gear: only on the black market, sold by soldiers at this rank or higher. */
  contraband?: { minRank: number };
}

export const ITEMS: ItemDef[] = [
  // ── Food (one meal every few hours) ──
  { id: "sandwich", name: "Day-old sandwich", kind: "food", price: 8, energy: 12, icon: "🥪", description: "Slightly squashed. Still food." },
  { id: "hot_meal", name: "Hot meal at Rosa's", kind: "food", price: 30, energy: 25, icon: "🍲", description: "Rosa doesn't ask questions. She just ladles." },
  // ── A quick boost (between meals): coffee or an energy drink share one timer and a daily limit ──
  { id: "coffee", name: "Black coffee", kind: "food", boost: true, price: 5, energy: 10, icon: "☕", description: "Burnt, bitter, and exactly what you needed." },
  { id: "energy_drink", name: "Energy drink", kind: "food", boost: true, hpCost: 5, price: 6, energy: 20, icon: "🥤", description: "Twice the kick of a coffee. Your heart notices." },
  { id: "steak_dinner", name: "Steak dinner", kind: "food", price: 70, energy: 40, icon: "🥩", description: "White tablecloth, a waiter who calls you sir. Worth every bite." },
  // ── Medical ──
  { id: "medkit", name: "Street medkit", kind: "medical", price: 60, heal: 40, icon: "🩹", description: "Heals wounds. In the hospital, cuts your stay in half." },
  // ── Housing (bigger energy bar, faster rest) ──
  { id: "sleeping_bag", name: "Sleeping bag", kind: "housing", price: 60, housing: 1, icon: "🛌", description: "Off the concrete, at least. You sleep a little better." },
  { id: "room", name: "Rented room", kind: "housing", price: 450, housing: 2, icon: "🏠", description: "Four walls, a door that locks, and an address. Schools and some employers care about that." },
  { id: "apartment", name: "Studio apartment", kind: "housing", price: 9000, housing: 3, icon: "🏢", description: "Your own kitchen, your own lock, neighbors who mind their business." },
  { id: "townhouse", name: "Townhouse", kind: "housing", price: 38000, housing: 4, icon: "🏡", description: "Three floors and a garden. People start asking what you do for a living." },
  { id: "penthouse", name: "Penthouse", kind: "housing", price: 160000, housing: 5, icon: "🌆", description: "The whole city under your windows. Nobody rings this doorbell by accident." },
  // ── Weapons (wear out with use; repair at the shop) ──
  // Two at each price: a quick one (speed) and a strong one (power). Same overall worth; the
  // quick one does a little better against fast fighters, the strong one against slow brutes.
  { id: "bike_chain", name: "Bike chain", kind: "weapon", price: 160, power: 3, agility: 4, durability: 30, icon: "⛓️", description: "Wrapped around a fist or swung wide. Fast, and it keeps them guessing." },
  { id: "pipe", name: "Lead pipe", kind: "weapon", price: 150, power: 6, durability: 30, icon: "🔧", description: "Crude, heavy, convincing." },
  { id: "knuckles", name: "Brass knuckles", kind: "weapon", price: 700, power: 11, agility: 2, durability: 45, icon: "👊", description: "Every punch counts double. Almost." },
  { id: "baseball_bat", name: "Baseball bat", kind: "weapon", price: 750, power: 13, durability: 50, icon: "🏏", description: "Nobody plays ball with it any more. One good swing ends most talks." },
  { id: "switchblade", name: "Switchblade", kind: "weapon", price: 3200, power: 15, agility: 2, durability: 60, icon: "🔪", description: "Quick to open, quicker to end an argument." },
  { id: "hatchet", name: "Hatchet", kind: "weapon", price: 3300, power: 18, agility: -1, durability: 60, icon: "🪓", description: "Bought for firewood. Never used for firewood." },
  { id: "snub_pistol", name: "Snub-nose pistol", kind: "weapon", price: 14500, power: 17, agility: 3, durability: 75, icon: "🔫", description: "Small enough for a pocket, quick enough to draw first." },
  { id: "revolver", name: "Old revolver", kind: "weapon", price: 14000, power: 21, durability: 80, icon: "🔫", description: "Six rounds and a long history. Don't ask whose." },
  { id: "machine_pistol", name: "Machine pistol", kind: "weapon", price: 46000, power: 22, agility: 4, durability: 90, icon: "🔫", description: "Light, fast and loud. Empties before the other side can aim." },
  { id: "shotgun", name: "Sawed-off shotgun", kind: "weapon", price: 45000, power: 28, agility: -1, durability: 100, icon: "💣", description: "Loud, ugly and final. Nobody argues twice." },
  // ── Armor ──
  // Two at each price: a light one that keeps you quick, and a heavy one that soaks up more.
  { id: "jacket", name: "Padded jacket", kind: "armor", price: 200, power: 6, durability: 35, icon: "🧥", description: "Takes the edge off a punch." },
  { id: "leathers", name: "Motorcycle leathers", kind: "armor", price: 220, power: 8, agility: -1, durability: 40, icon: "🧥", description: "Thick hide, stiff in the knees. Road rash is the least of your worries." },
  { id: "vest", name: "Old kevlar vest", kind: "armor", price: 1100, power: 12, durability: 55, icon: "🦺", description: "Scuffed and ugly. It still works." },
  { id: "steel_coat", name: "Steel-lined coat", kind: "armor", price: 1200, power: 14, agility: -1, durability: 60, icon: "🧥", description: "A tailor in Ironmoor sews plates into the lining. Heavy on the shoulders." },
  { id: "riot_gear", name: "Riot gear", kind: "armor", price: 9000, power: 19, agility: -1, durability: 80, icon: "🛡️", description: "Fell off a police truck. Fits like it was made for you." },
  { id: "concealed_vest", name: "Concealed vest", kind: "armor", price: 9500, power: 17, durability: 80, icon: "🦺", description: "Thin enough to wear under a shirt. Nobody knows until the knife bounces." },
  { id: "tactical_plate", name: "Tactical plate carrier", kind: "armor", price: 40000, power: 26, agility: -2, durability: 110, icon: "🛡️", description: "Ceramic plates front and back. Professionals only." },
  { id: "undersuit", name: "Ballistic undersuit", kind: "armor", price: 42000, power: 23, durability: 110, icon: "🦺", description: "Woven like silk, stops like steel. Made for people who can't look armed." },
  // ── Issued gear ──
  {
    id: "service_pistol",
    name: "Service pistol",
    kind: "weapon",
    price: 0,
    power: 18,
    durability: 70,
    icon: "🔫",
    description: "Issued to sworn officers on graduation. Every round is accounted for.",
    issued: { path: "police", rank: 2 },
  },
  {
    id: "police_vest",
    name: "Police body armor",
    kind: "armor",
    price: 0,
    power: 16,
    durability: 70,
    icon: "🦺",
    description: "Department issue, for officers who go through doors first.",
    issued: { path: "police", rank: 4 },
  },
  {
    id: "service_rifle",
    name: "Service rifle",
    kind: "weapon",
    price: 0,
    power: 26,
    durability: 90,
    icon: "🪖",
    description: "Issued when you pass basic training. Heavier than it looks.",
    issued: { path: "military", rank: 2 },
  },
  {
    id: "combat_armor",
    name: "Combat armor",
    kind: "armor",
    price: 0,
    power: 22,
    agility: -1,
    durability: 90,
    icon: "🛡️",
    description: "Plates front and back. Issued to non-commissioned officers.",
    issued: { path: "military", rank: 4 },
  },
  {
    id: "machine_gun",
    name: "Light machine gun",
    kind: "weapon",
    price: 0,
    power: 38,
    agility: -2,
    durability: 110,
    icon: "💥",
    description: "Officers' armory. Signed out to Captains and up.",
    issued: { path: "military", rank: 6 },
  },
  {
    id: "heavy_armor",
    name: "Heavy assault armor",
    kind: "armor",
    price: 0,
    power: 30,
    agility: -2,
    durability: 120,
    icon: "🛡️",
    description: "For colonels and generals, who are not supposed to get shot.",
    issued: { path: "military", rank: 7 },
  },
  // ── Black market (stolen army gear) ──
  {
    id: "army_rifle",
    name: "Army rifle (stolen)",
    kind: "weapon",
    price: 0,
    power: 24,
    durability: 70,
    icon: "🪖",
    description: "The serial number is filed off. Somebody in Ironmoor is short one rifle.",
    contraband: { minRank: 3 },
  },
  {
    id: "army_lmg",
    name: "Machine gun (stolen)",
    kind: "weapon",
    price: 0,
    power: 34,
    agility: -2,
    durability: 90,
    icon: "💥",
    description: "Off the back of an army truck. Loud, heavy, and very illegal.",
    contraband: { minRank: 6 },
  },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, ItemDef>;
