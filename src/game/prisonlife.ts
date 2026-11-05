// Life inside: standing in the yard, a tunnel dug a little at a time, a shank for the yard, and a
// parole hearing for inmates who keep their heads down. Each stay starts fresh (the tunnel and
// the hearing belong to one sentence); standing in the yard is remembered.

import { countryOf, inJail } from "./engine";
import { sv } from "./stats";
import { GameError, type GameEvent, type Player, type Rng } from "./types";

export const INSIDE = {
  standing: [
    { min: 0, name: "Fresh fish" },
    { min: 6, name: "Known face" },
    { min: 16, name: "Trusted" },
    { min: 32, name: "Shot-caller" },
  ],
  /** Respect earned inside. */
  respect: { work: 1, fightWin: 3, tunnel: 6 },
  tunnel: {
    energy: 15,
    /** Progress per dig, before skill. */
    progress: [18, 30] as const,
    /** Chance the guards find it, before standing helps. */
    found: 0.18,
    foundExtraMs: 15 * 60_000,
    /** Too little time left to bother. */
    minLeftMs: 15 * 60_000,
    escapeHeat: 30,
  },
  shank: { energy: 8, extraMs: 10 * 60_000, shakedown: 0.2, edge: 6 },
  parole: { workNeeded: 2, quietMs: 30 * 60_000, base: 0.35, minLeftMs: 5 * 60_000 },
};

/** Serving a sentence (not held for trial). */
const serving = (p: Player, now: number) => !p.custodyCase && inJail(p, now);

export function standingOf(p: Player) {
  const r = p.inside?.respect ?? 0;
  let i = 0;
  INSIDE.standing.forEach((s, j) => {
    if (r >= s.min) i = j;
  });
  return { index: i, name: INSIDE.standing[i].name, respect: r, next: INSIDE.standing[i + 1] ?? null };
}

/** Starts a fresh stay if the last one ended (tunnel, hearing and counters reset; respect stays). */
export function stay(p: Player, now: number) {
  const s = p.inside ?? { respect: 0 };
  const until = p.jailUntil ?? 0;
  if (!s.stayUntil || s.stayUntil < now - 60_000 || (s.stayAt ?? 0) > now) {
    p.inside = { respect: s.respect ?? 0, stayAt: now, stayUntil: until, tunnel: 0, work: 0, paroleTried: false, shank: s.shank ?? false, lastFightAt: s.lastFightAt };
  } else {
    p.inside = { ...s, stayUntil: until };
  }
  return p.inside!;
}

export function earnRespect(p: Player, n: number, now: number) {
  const s = stay(p, now);
  s.respect = (s.respect ?? 0) + n;
}

// ── The tunnel ─────────────────────────────────────────────────────────────

export function digBlock(p: Player, now: number): string | null {
  if (!serving(p, now)) return "You're not serving a sentence.";
  if ((p.jailUntil ?? 0) - now < INSIDE.tunnel.minLeftMs) return "You'll be out before it's finished. Not worth the risk.";
  if (p.energy < INSIDE.tunnel.energy) return "You're too tired to dig.";
  return null;
}

/** A night with a spoon behind the poster. Better standing means the guards look elsewhere. */
export function digTunnel(p: Player, now: number, rng: Rng): GameEvent[] {
  const block = digBlock(p, now);
  if (block) throw new GameError(block);
  const s = stay(p, now);
  p.energy -= INSIDE.tunnel.energy;
  const st = standingOf(p);
  const found = INSIDE.tunnel.found * (1 - st.index * 0.2);
  if (rng() < found) {
    s.tunnel = 0;
    p.jailUntil = (p.jailUntil ?? now) + INSIDE.tunnel.foundExtraMs;
    s.stayUntil = p.jailUntil;
    return [{ tone: "bad", text: `A guard moves the poster. The tunnel is filled with concrete by morning, and ${Math.round(INSIDE.tunnel.foundExtraMs / 60_000)} minutes go on your sentence.` }];
  }
  const [lo, hi] = INSIDE.tunnel.progress;
  const skill = (sv(p, "strength") + sv(p, "wits") - 20) / 10;
  s.tunnel = Math.min(100, (s.tunnel ?? 0) + Math.round(lo + rng() * (hi - lo) + Math.max(0, skill)));
  p.stats.strength += 0.3;
  p.stats.nerve += 0.3;
  if (s.tunnel < 100) return [{ tone: "good", text: `You scrape through another foot of dirt. The tunnel is ${s.tunnel}% of the way.` }];
  // Out under the wall.
  p.jailUntil = now;
  p.jailReason = null;
  p.heat += INSIDE.tunnel.escapeHeat;
  s.tunnel = 0;
  s.stayUntil = now;
  s.respect = (s.respect ?? 0) + INSIDE.respect.tunnel;
  p.jobCounts["prison:escape"] = (p.jobCounts["prison:escape"] ?? 0) + 1;
  return [
    { tone: "good", text: "The last of the dirt gives way. Cold air, a drainage ditch, and nobody behind you. You're out." },
    { tone: "bad", text: "Every cop in the city has your description now. Keep your head down." },
  ];
}

// ── The shank ──────────────────────────────────────────────────────────────

export function makeShank(p: Player, now: number, rng: Rng): GameEvent[] {
  if (!inJail(p, now)) throw new GameError("You're not behind bars.");
  const s = stay(p, now);
  if (s.shank) throw new GameError("You already have one taped under your bunk.");
  if (p.energy < INSIDE.shank.energy) throw new GameError("You're too tired.");
  p.energy -= INSIDE.shank.energy;
  if (rng() < 0.15) {
    p.jailUntil = (p.jailUntil ?? now) + INSIDE.shank.extraMs;
    return [{ tone: "bad", text: `A guard catches you sharpening a toothbrush. ${Math.round(INSIDE.shank.extraMs / 60_000)} more minutes.` }];
  }
  s.shank = true;
  return [{ tone: "good", text: "A toothbrush, a lighter and two hours against the floor. Ugly, sharp, yours. It gives you an edge in yard fights, until a shakedown finds it." }];
}

/** A shank's edge in a yard fight. A shakedown may find it first. */
export function shankEdge(p: Player, now: number, rng: Rng): { edge: number; caught: boolean } {
  const s = p.inside;
  if (!s?.shank) return { edge: 0, caught: false };
  if (rng() < INSIDE.shank.shakedown) {
    s.shank = false;
    p.jailUntil = (p.jailUntil ?? now) + INSIDE.shank.extraMs;
    return { edge: 0, caught: true };
  }
  return { edge: INSIDE.shank.edge, caught: false };
}

// ── Parole ─────────────────────────────────────────────────────────────────

export function paroleBlock(p: Player, now: number): string | null {
  if (!serving(p, now)) return "You're not serving a sentence.";
  const s = stay(p, now);
  if (s.paroleTried) return "The board already heard you this time. Do your time.";
  if ((p.jailUntil ?? 0) - now < INSIDE.parole.minLeftMs) return "You're almost out anyway.";
  if ((s.work ?? 0) < INSIDE.parole.workNeeded) return `Work ${INSIDE.parole.workNeeded} prison shifts first. The board wants to see effort.`;
  if (now - (s.lastFightAt ?? 0) < INSIDE.parole.quietMs) return "You were in a fight. The board wants to see you stay out of trouble for a while.";
  return null;
}

/** The parole board: effort, a quiet record and a good word from the yard help. */
export function paroleOdds(p: Player): number {
  const st = standingOf(p);
  const integrity = Math.max(-0.15, Math.min(0.15, (p.stats.integrity ?? 0) / 200));
  return Math.min(0.85, INSIDE.parole.base + ((p.inside?.work ?? 0) - INSIDE.parole.workNeeded) * 0.05 + st.index * 0.05 + integrity + (sv(p, "charisma") - 10) / 100);
}

export function paroleHearing(p: Player, now: number, rng: Rng): GameEvent[] {
  const block = paroleBlock(p, now);
  if (block) throw new GameError(block);
  const s = stay(p, now);
  s.paroleTried = true;
  if (rng() < paroleOdds(p)) {
    p.jailUntil = now;
    p.jailReason = null;
    s.stayUntil = now;
    return [{ tone: "good", text: "The board reads your file, looks at you a long time, and signs. Paroled. You walk out into daylight with a bus ticket and a warning." }];
  }
  return [{ tone: "bad", text: "\"Not yet,\" says the chair, without looking up. You'll serve the rest." }];
}

/** For the yard card. */
export function insideView(p: Player, now: number) {
  if (!inJail(p, now)) return null;
  const st = standingOf(p);
  const s = p.inside;
  const fresh = !s?.stayUntil || s.stayUntil < now - 60_000;
  return {
    standing: st.name,
    respect: st.respect,
    next: st.next ? { name: st.next.name, need: st.next.min - st.respect } : null,
    serving: serving(p, now),
    country: countryOf(p),
    tunnel: fresh ? 0 : (s?.tunnel ?? 0),
    canDig: digBlock(p, now),
    shank: !fresh && !!s?.shank,
    work: fresh ? 0 : (s?.work ?? 0),
    parole: paroleBlock({ ...p, inside: fresh ? undefined : p.inside ? { ...p.inside } : undefined }, now),
    energy: { dig: INSIDE.tunnel.energy, shank: INSIDE.shank.energy },
  };
}
