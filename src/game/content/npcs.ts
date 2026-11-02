import type { DistrictId } from "../types";

export interface NpcDef {
  id: string;
  name: string;
  district: DistrictId;
  description: string;
  strength: number;
  toughness: number;
  agility: number;
  hp: number;
  cash: [number, number];
  reputation: number;
  icon: string;
}

export const NPCS: NpcDef[] = [
  {
    id: "alley_rat",
    name: "Alley Rat",
    district: "gutter",
    description: "A twitchy kid with a pocketknife and nothing to lose.",
    strength: 8,
    toughness: 8,
    agility: 12,
    hp: 60,
    cash: [2, 8],
    reputation: 1,
    icon: "🐀",
  },
  {
    id: "drunk_sailor",
    name: "Drunk Sailor",
    district: "gutter",
    description: "Big, loud, and swaying. Hits hard when he connects.",
    strength: 16,
    toughness: 14,
    agility: 6,
    hp: 80,
    cash: [5, 15],
    reputation: 1,
    icon: "⚓",
  },
  {
    id: "dock_brawler",
    name: "Dock Brawler",
    district: "old_market",
    description: "Fights for fun on payday. Today is payday.",
    strength: 24,
    toughness: 22,
    agility: 16,
    hp: 100,
    cash: [10, 30],
    reputation: 2,
    icon: "🥊",
  },
  {
    id: "southside_bruiser",
    name: "Southside Bruiser",
    district: "old_market",
    description: "Gang muscle. Wears his scars like medals.",
    strength: 34,
    toughness: 32,
    agility: 22,
    hp: 120,
    cash: [25, 60],
    reputation: 3,
    icon: "💀",
  },
  {
    id: "iron_foreman",
    name: "Crooked Foreman",
    district: "iron_row",
    description: "Runs the night shift and a few side businesses. Has a pipe.",
    strength: 46,
    toughness: 42,
    agility: 28,
    hp: 140,
    cash: [40, 100],
    reputation: 4,
    icon: "🏗️",
  },
];

export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n])) as Record<string, NpcDef>;

/** A mugger scaled loosely to the victim, used for random street encounters. */
export function mugger(level: number): NpcDef {
  const s = 8 + level * 0.6;
  return {
    id: "mugger",
    name: "Mugger",
    district: "gutter",
    description: "Came out of nowhere.",
    strength: s,
    toughness: s,
    agility: s,
    hp: 70,
    cash: [0, 0],
    reputation: 1,
    icon: "🔪",
  };
}
