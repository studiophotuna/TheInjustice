// Two careers' signature work.
//
// Fire Department: every arson in a city goes on the fire log. A firefighter (Engineer and up) can
// investigate a fire once: read the scene well enough and they name the arsonist in public, which
// brings heat down on them and a reward from city hall.
//
// Hackers: from Pen Tester up, a hacker can sell a "record scrub" to other players: the client's
// heat drops, the hacker keeps the fee (dirty money). Once every few hours per client.

import { ALT_BLOCK, sameOwner } from "./anticheat";
import { addMerit, countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { notify } from "./social";
import { sv } from "./stats";
import { GameError, type City, type FireRecord, type GameEvent, type Player, type Rng } from "./types";

export const FIRE = {
  investigateRank: 3,
  energy: 15,
  /** Fires stay on the log this long. */
  keepMs: 48 * 60 * 60_000,
  heat: 25,
  reward: 400,
};

export const fireWatchOn = (c: City | null | undefined, now: number) => (c?.fireWatchUntil ?? 0) > now;

/** Records an arson on the city's fire log (successful fires only). */
export function logFire(c: City | null | undefined, f: Omit<FireRecord, "id" | "investigated">, now: number) {
  if (!c) return;
  const fire: FireRecord = { ...f, id: `${now.toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`, investigated: [] };
  c.fires = [fire, ...(c.fires ?? []).filter((x) => now - x.at < FIRE.keepMs)].slice(0, 12);
}

export function investigateBlock(p: Player, fire: FireRecord | undefined, now: number): string | null {
  if (p.path !== "fire" || p.rank < FIRE.investigateRank) return "Only the Fire Department (Engineer and up) investigates fires.";
  if (!fire) return "That fire isn't on the log anymore.";
  if (fire.solved) return `Already solved: ${fire.solved.arsonistName} did it.`;
  if (fire.investigated.includes(p.id)) return "You've already walked this scene.";
  if (fire.arsonistId === p.id) return "Better not draw attention to this one.";
  if (inJail(p, now) || inHospital(p, now)) return "You're in no shape for it.";
  if (p.energy < FIRE.energy) return "You're too tired.";
  return null;
}

export function investigateOdds(p: Player): number {
  return Math.max(0.2, Math.min(0.85, 0.35 + ((sv(p, "perception") + sv(p, "wits")) / 2 - 20) / 40 + (p.rank - FIRE.investigateRank) * 0.05));
}

/** A firefighter walks the burn scene. Success names the arsonist in public. */
export function investigateFire(p: Player, c: City, fireId: string, arsonist: Player | null, now: number, rng: Rng): GameEvent[] {
  const fire = (c.fires ?? []).find((f) => f.id === fireId);
  const block = investigateBlock(p, fire, now);
  if (block) throw new GameError(block);
  p.energy -= FIRE.energy;
  fire!.investigated.push(p.id);
  p.stats.perception += 0.5;
  if (rng() >= investigateOdds(p)) {
    return [{ tone: "info", text: "The ash tells you it was set, and not much else. Someone else may read it better." }];
  }
  fire!.solved = { arsonistName: fire!.arsonistName, by: p.name, at: now };
  const reward = Math.min(c.treasury, FIRE.reward);
  c.treasury -= reward;
  p.cash += reward;
  p.reputation += 3;
  p.jobCounts["fire:solved"] = (p.jobCounts["fire:solved"] ?? 0) + 1;
  if (arsonist) {
    arsonist.heat += FIRE.heat;
    notify(arsonist, `Fire investigator ${p.name} traced the ${fire!.what} fire to you, and said so in public.`, "bad", p, now);
  }
  c.log = [{ at: now, text: `Fire investigator ${p.name} names ${fire!.arsonistName} as the arsonist behind the ${fire!.what} fire.` }, ...c.log].slice(0, 20);
  return [
    { tone: "good", text: `Pour patterns, a melted can, a witness who remembers a face: it was ${fire!.arsonistName}.${reward ? ` City hall pays $${reward}.` : ""}` },
    ...addMerit(p, "fire", 3),
  ];
}

export function fireLogView(c: City, p: Player, now: number) {
  return (c.fires ?? [])
    .filter((f) => now - f.at < FIRE.keepMs)
    .map((f) => ({
      id: f.id,
      what: f.what,
      victim: f.victimName,
      at: f.at,
      solved: f.solved ? f.solved.arsonistName : null,
      solvedBy: f.solved?.by ?? null,
      block: investigateBlock(p, f, now),
    }));
}

// ── Hackers ────────────────────────────────────────────────────────────────

export const SCRUB = { minRank: 3, heat: 20, cooldownMs: 6 * 60 * 60_000, minFee: 100, maxFee: 10_000, merit: 1.5 };

export function setScrub(p: Player, open: boolean, fee: number): GameEvent[] {
  if (p.path !== "hacker" || p.rank < SCRUB.minRank) throw new GameError("Pen Testers and up can scrub records.");
  const f = Math.floor(fee);
  if (open && (!Number.isFinite(f) || f < SCRUB.minFee || f > SCRUB.maxFee)) throw new GameError(`Set a fee between $${SCRUB.minFee} and $${SCRUB.maxFee.toLocaleString()}.`);
  p.scrubService = { open, fee: open ? f : (p.scrubService?.fee ?? SCRUB.minFee), jobs: p.scrubService?.jobs ?? 0 };
  return [{ tone: "good", text: open ? `You're taking clients: $${f.toLocaleString()} to make ${SCRUB.heat} heat disappear. You're in the Directory.` : "You stop taking clients." }];
}

export function scrubBlock(h: Player | null, client: Player, now: number): string | null {
  if (!h || h.dead) return "They're not around anymore.";
  if (h.id === client.id) return "You can't scrub your own record. Too obvious.";
  if (sameOwner(h, client)) return ALT_BLOCK;
  if (h.path !== "hacker" || h.rank < SCRUB.minRank || !h.scrubService?.open) return "They're not taking clients.";
  if (countryOf(h) !== countryOf(client)) return "They work in another city.";
  if (inJail(h, now)) return "They're behind bars.";
  if (client.heat < 1) return "Your record is already clean.";
  if (now - (client.attackLog?.scrub ?? 0) < SCRUB.cooldownMs) return "Your record was just scrubbed. Do it again so soon and someone notices.";
  return null;
}

/** A client pays a hacker to make heat disappear. Dirty money first. */
export function hireScrub(h: Player, client: Player, now: number): GameEvent[] {
  const block = scrubBlock(h, client, now);
  if (block) throw new GameError(block);
  const fee = h.scrubService!.fee;
  if (!canPayIllegal(client, fee)) throw new GameError(`That's $${fee.toLocaleString()}. Dirty money or cash.`);
  payIllegal(client, fee);
  earnDirty(h, fee);
  const removed = Math.min(client.heat, SCRUB.heat);
  client.heat -= removed;
  client.attackLog = { ...(client.attackLog ?? {}), scrub: now };
  h.scrubService = { ...h.scrubService!, jobs: (h.scrubService?.jobs ?? 0) + 1 };
  shiftIntegrity(h, -1);
  addMerit(h, "hacker", SCRUB.merit);
  notify(h, `${client.name} paid you $${fee.toLocaleString()} to scrub their record. Dirty money.`, "good", client, now);
  return [{ tone: "good", text: `${h.name} gets into the records system. ${removed} heat disappears from your file. -$${fee.toLocaleString()}` }];
}
