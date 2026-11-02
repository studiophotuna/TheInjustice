import type { HousingTier } from "../types";

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
    name: "Rented room in Old Market",
    kind: "housing",
    price: 180,
    housing: 2,
    icon: "🏠",
    description: "Four walls, a door that locks, and an address. Some employers care about that.",
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
];

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<string, ItemDef>;
