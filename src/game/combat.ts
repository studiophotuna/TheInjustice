import { armorBlock, equippedId, gearAgility, gearPower } from "./gear";
import type { NpcDef } from "./content/npcs";
import { sv } from "./stats";
import type { Player, Rng } from "./types";

export interface Fighter {
  strength: number;
  toughness: number;
  agility: number;
  hp: number;
  maxHp: number;
  /** Share of every hit that armor soaks up (0 to about 0.45). */
  block?: number;
  /** Fights with a gun: the fight scene shows shots instead of strikes. */
  ranged?: boolean;
}

/**
 * One move in a fight, for the fight scene: who moved, a strike or a shot, what happened, and both
 * sides' health afterwards as a percentage. Deliberately says nothing about the gear behind it.
 * [by (0 you, 1 them), kind (0 strike, 1 shot), result (0 hit, 1 crit, 2 block, 3 dodge), your %, their %]
 */
export type FightBeat = [0 | 1, 0 | 1, 0 | 1 | 2 | 3, number, number];

export interface FightResult {
  won: boolean;
  /** HP the player has left. */
  playerHp: number;
  rounds: number;
  /** Descriptive log; no numbers, just how it felt. */
  lines: string[];
  /** Every move, for the fight scene. */
  beats: FightBeat[];
  /** Both sides' health when the fight started, as percentages. */
  start: [number, number];
}

const RANGED = /pistol|revolver|rifle|shotgun|machine_gun|lmg/;
/** Whether a weapon fires. */
export const isRanged = (id: string | null | undefined) => !!id && RANGED.test(id);


export function playerFighter(p: Player, maxHp: number): Fighter {
  return {
    strength: sv(p, "strength") + gearPower(p, "weapon"),
    toughness: sv(p, "toughness"),
    agility: Math.max(5, sv(p, "agility") + gearAgility(p, "weapon") + gearAgility(p, "armor")),
    block: armorBlock(p),
    hp: p.hp,
    maxHp,
    ranged: isRanged(equippedId(p, "weapon")),
  };
}

export function npcFighter(n: NpcDef): Fighter {
  return { strength: n.strength, toughness: n.toughness, agility: n.agility, hp: n.hp, maxHp: n.hp };
}

export function power(f: Pick<Fighter, "strength" | "toughness" | "agility" | "block">): number {
  // Armor soaks a share of every hit: count it as extra toughness when sizing people up.
  return (f.strength + f.toughness * (1 + 2 * (f.block ?? 0)) + f.agility * 0.6) / 2.6;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function hit(att: Fighter, def: Fighter, rng: Rng): number {
  const chance = clamp(0.75 + (att.agility - def.agility) / 120, 0.35, 0.95);
  if (rng() > chance) return 0;
  const raw = Math.max(2, 5 + att.strength * 0.4 * (0.8 + rng() * 0.4) - def.toughness * 0.15);
  return Math.max(1, raw * (1 - (def.block ?? 0)));
}

function describeHit(dmg: number, max: number, mine: boolean): string {
  const r = dmg / max;
  if (dmg === 0) return mine ? "You swing and miss." : "You duck their swing.";
  if (mine) {
    if (r > 0.2) return "You land a crushing blow.";
    if (r > 0.1) return "A solid hit. They stagger.";
    return "You graze them.";
  }
  if (r > 0.2) return "That one rattles your teeth.";
  if (r > 0.1) return "It hurts. You keep standing.";
  return "You barely felt that.";
}

/** Resolves a fight server-side. Max 12 rounds; otherwise the healthier side wins. */
export function resolveFight(me: Fighter, them: Fighter, rng: Rng): FightResult {
  const a = { ...me };
  const b = { ...them };
  const lines: string[] = [];
  const beats: FightBeat[] = [];
  const pct = (f: Fighter) => Math.max(0, Math.round((f.hp / f.maxHp) * 100));
  // What a move looked like: a miss is a dodge; a small hit on armor is a block; a big one is a crit.
  const beat = (by: 0 | 1, att: Fighter, def: Fighter, d: number) => {
    const r = d / def.maxHp;
    const result = d === 0 ? 3 : (def.block ?? 0) > 0.08 && r < 0.06 ? 2 : r > 0.2 ? 1 : 0;
    beats.push([by, att.ranged ? 1 : 0, result, pct(a), pct(b)]);
  };
  const start: [number, number] = [pct(a), pct(b)];
  const meFirst = a.agility + rng() * 10 >= b.agility + rng() * 10;
  lines.push(meFirst ? "You strike first." : "They get the jump on you.");
  let round = 0;
  for (; round < 12 && a.hp > 0 && b.hp > 0; round++) {
    const order = meFirst ? ["me", "them"] : ["them", "me"];
    for (const who of order) {
      if (a.hp <= 0 || b.hp <= 0) break;
      if (who === "me") {
        const d = hit(a, b, rng);
        b.hp -= d;
        beat(0, a, b, d);
        if (round < 3 || d / b.maxHp > 0.2) lines.push(describeHit(d, b.maxHp, true));
      } else {
        const d = hit(b, a, rng);
        a.hp -= d;
        beat(1, b, a, d);
        if (round < 3 || d / a.maxHp > 0.2) lines.push(describeHit(d, a.maxHp, false));
      }
    }
  }
  const won = b.hp <= 0 ? true : a.hp <= 0 ? false : a.hp / a.maxHp >= b.hp / b.maxHp;
  if (a.hp <= 0) lines.push("Everything goes black.");
  else if (b.hp <= 0) lines.push("They hit the ground and stay there.");
  else lines.push(won ? "They back off and run." : "You back away, beaten.");
  return { won, playerHp: Math.max(0, a.hp), rounds: round, lines, beats, start };
}

/** Deterministic noise in [-1, 1] so re-scouting doesn't re-roll the answer. */
function hashNoise(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) / 4294967295) * 2 - 1;
}

/** Gut reads from safest (0) to deadliest (4). */
export const GUT_READS = [
  "Easy mark.",
  "You'd probably take them.",
  "Could go either way.",
  "Risky. They look tougher than you.",
  "They'd flatten you.",
] as const;

/** Gut read before a fight. Higher Perception = less noise. */
export function gutRead(p: Player, me: Fighter, them: Fighter, seed: string): string {
  const noiseAmp = clamp(0.45 - (sv(p, "perception") - 10) / 100, 0.05, 0.45);
  const ratio = (power(me) / power(them)) * (1 + hashNoise(seed) * noiseAmp);
  if (ratio > 1.5) return GUT_READS[0];
  if (ratio > 1.15) return GUT_READS[1];
  if (ratio > 0.9) return GUT_READS[2];
  if (ratio > 0.7) return GUT_READS[3];
  return GUT_READS[4];
}
