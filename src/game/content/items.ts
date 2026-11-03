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
  /** housing: tier granted */
  housing?: HousingTier;
  /** weapon/armor: combat bonus */
  power?: number;
  /** medical: hp restored */
  heal?: number;
  /** Issued by a career at a rank, never sold. Handed back if you leave the career. */
  issued?: { path: PathId; rank: number };
  /** Stolen army gear: only on the black market, sold by soldiers at this rank or higher. */
  contraband?: { minRank: number };
}

export const ITEMS: ItemDef[] = [
  {
    id: "sandwich",
    name: "Day-old sandwich",
    kind: "food",
    price: 4,
    energy: 12,
    icon: "🥪",
    description: "Slightly squashed. Still food.",
  },
  {
    id: "hot_meal",
    name: "Hot meal at Rosa's",
    kind: "food",
    price: 15,
    energy: 30,
    icon: "🍲",
    description: "Rosa doesn't ask questions. She just ladles.",
  },
  {
    id: "medkit",
    name: "Street medkit",
    kind: "medical",
    price: 30,
    heal: 40,
    icon: "🩹",
    description: "Heals wounds. In the hospital, cuts your stay in half.",
  },
  {
    id: "sleeping_bag",
    name: "Sleeping bag",
    kind: "housing",
    price: 35,
    housing: 1,
    icon: "🛌",
    description: "A dry spot under the overpass. Better rest, more energy.",
  },
  {
    id: "room",
    name: "Rented room",
    kind: "housing",
    price: 180,
    housing: 2,
    icon: "🏠",
    description: "Four walls, a door that locks, and an address. Schools and some employers care about that.",
  },
  {
    id: "pipe",
    name: "Lead pipe",
    kind: "weapon",
    price: 50,
    power: 6,
    icon: "🔧",
    description: "Crude, heavy, convincing.",
  },
  {
    id: "knuckles",
    name: "Brass knuckles",
    kind: "weapon",
    price: 120,
    power: 12,
    icon: "👊",
    description: "Every punch counts double. Almost.",
  },
  {
    id: "jacket",
    name: "Padded jacket",
    kind: "armor",
    price: 70,
    power: 6,
    icon: "🧥",
    description: "Takes the edge off a punch.",
  },
  {
    id: "vest",
    name: "Old kevlar vest",
    kind: "armor",
    price: 200,
    power: 14,
    icon: "🦺",
    description: "Scuffed and ugly. It still works.",
  },
  // ── Issued gear ──
  {
    id: "service_pistol",
    name: "Service pistol",
    kind: "weapon",
    price: 0,
    power: 18,
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
    icon: "💥",
    description: "Off the back of an army truck. Loud, heavy, and very illegal.",
    contraband: { minRank: 6 },
  },
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, ItemDef>;
