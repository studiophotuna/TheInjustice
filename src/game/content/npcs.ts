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
  {
    id: "beach_hustler",
    name: "Beach Hustler",
    district: "boardwalk",
    description: "Sells fake watches. Fights dirty when business is slow.",
    strength: 9,
    toughness: 9,
    agility: 14,
    hp: 60,
    cash: [4, 12],
    reputation: 1,
    icon: "🕶️",
  },
  {
    id: "casino_bouncer",
    name: "Casino Bouncer",
    district: "casino_strip",
    description: "Seven feet of muscle in a tuxedo.",
    strength: 30,
    toughness: 34,
    agility: 14,
    hp: 120,
    cash: [20, 50],
    reputation: 3,
    icon: "🎰",
  },
  {
    id: "rail_rat",
    name: "Rail Rat",
    district: "rail_yards",
    description: "Lives in a boxcar. Guards it with a wrench.",
    strength: 11,
    toughness: 10,
    agility: 10,
    hp: 65,
    cash: [3, 9],
    reputation: 1,
    icon: "🔧",
  },
  {
    id: "state_enforcer",
    name: "Off-Duty State Guard",
    district: "checkpoint_row",
    description: "Trained, armed and bored. A dangerous combination.",
    strength: 36,
    toughness: 36,
    agility: 24,
    hp: 130,
    cash: [25, 60],
    reputation: 3,
    icon: "🪖",
  },
  {
    id: "undercity_scav",
    name: "Undercity Scavenger",
    district: "undercity",
    description: "Fast, hungry, and carrying a sharpened circuit board.",
    strength: 9,
    toughness: 8,
    agility: 16,
    hp: 60,
    cash: [5, 14],
    reputation: 1,
    icon: "📟",
  },
  {
    id: "corp_security",
    name: "Corporate Security",
    district: "glass_quarter",
    description: "Body armor, a stun baton and a company that pays the lawyers.",
    strength: 38,
    toughness: 42,
    agility: 22,
    hp: 140,
    cash: [40, 90],
    reputation: 4,
    icon: "🛡️",
  },
];

export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n])) as Record<string, NpcDef>;

/** A road gang that plans ambushes on bus routes; a little stronger than its target. */
export function roadGang(power: number): NpcDef {
  const s = Math.max(10, power * 1.15);
  return {
    id: "road_gang",
    name: "Road Gang",
    district: "gutter",
    description: "They knew which bus you'd take.",
    strength: s,
    toughness: s,
    agility: s * 0.9,
    hp: 90,
    cash: [0, 0],
    reputation: 2,
    icon: "🚌",
  };
}

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
