import { ITEM_BY_ID } from "./content/items";
import type { NpcDef } from "./content/npcs";
import { sv } from "./stats";
import type { Player, Rng } from "./types";

export interface Fighter {
  strength: number;
  toughness: number;
  agility: number;
  hp: number;
  maxHp: number;
}

export interface FightResult {
  won: boolean;
  /** HP the player has left. */
  playerHp: number;
  rounds: number;
  /** Descriptive log; no numbers, just how it felt. */
  lines: string[];
}

function bestGear(p: Player, kind: "weapon" | "armor"): number {
  let best = 0;
  for (const [id, n] of Object.entries(p.inventory)) {
    const def = ITEM_BY_ID[id];
    if (n > 0 && def?.kind === kind && (def.power ?? 0) > best) best = def.power ?? 0;
  }
  return best;
}

export function playerFighter(p: Player, maxHp: number): Fighter {
  return {
    strength: sv(p, "strength") + bestGear(p, "weapon"),
    toughness: sv(p, "toughness") + bestGear(p, "armor"),
    agility: sv(p, "agility"),
    hp: p.hp,
    maxHp,
  };
}

export function npcFighter(n: NpcDef): Fighter {
  return { strength: n.strength, toughness: n.toughness, agility: n.agility, hp: n.hp, maxHp: n.hp };
}

export function power(f: Pick<Fighter, "strength" | "toughness" | "agility">): number {
  return (f.strength + f.toughness + f.agility * 0.6) / 2.6;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function hit(att: Fighter, def: Fighter, rng: Rng): number {
  const chance = clamp(0.75 + (att.agility - def.agility) / 120, 0.35, 0.95);
  if (rng() > chance) return 0;
  const raw = 5 + att.strength * 0.4 * (0.8 + rng() * 0.4) - def.toughness * 0.15;
  return Math.max(2, raw);
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
        if (round < 3 || d / b.maxHp > 0.2) lines.push(describeHit(d, b.maxHp, true));
      } else {
        const d = hit(b, a, rng);
        a.hp -= d;
        if (round < 3 || d / a.maxHp > 0.2) lines.push(describeHit(d, a.maxHp, false));
      }
    }
  }
  const won = b.hp <= 0 ? true : a.hp <= 0 ? false : a.hp / a.maxHp >= b.hp / b.maxHp;
  if (a.hp <= 0) lines.push("Everything goes black.");
  else if (b.hp <= 0) lines.push("They hit the ground and stay there.");
  else lines.push(won ? "They back off and run." : "You back away, beaten.");
  return { won, playerHp: Math.max(0, a.hp), rounds: round, lines };
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

/** Gut read before a fight. Higher Perception = less noise. */
export function gutRead(p: Player, me: Fighter, them: Fighter, seed: string): string {
  const noiseAmp = clamp(0.45 - (sv(p, "perception") - 10) / 100, 0.05, 0.45);
  const ratio = (power(me) / power(them)) * (1 + hashNoise(seed) * noiseAmp);
  if (ratio > 1.5) return "Easy mark.";
  if (ratio > 1.15) return "You'd probably take them.";
  if (ratio > 0.9) return "Could go either way.";
  if (ratio > 0.7) return "Risky. They look tougher than you.";
  return "They'd flatten you.";
}
