// Small systems that make the day-to-day clearer:
//  - promotion progress (how much of the work toward your next rank is done),
//  - the "ready" board (what you can do now, and what's on a timer),
//  - community service (unpaid good deeds: lower heat, a lighter conscience),
//  - the bank statement (where your money went),
//  - what to do with the body after a hit.

import { BALANCE } from "./balance";
import { keyStatAvg, meritNeeded, PATHS } from "./content/paths";
import { addTip } from "./crime";
import { dirtyOf, takeCarried } from "./money";
import { GameError, type CaseFile, type GameEvent, type Player, type Rng } from "./types";

// ── Promotion progress ─────────────────────────────────────────────────────

/** How far along you are toward your next rank. Work is a percentage; stats stay words. */
export function promoProgress(p: Player, veteran: number) {
  if (!p.path) return null;
  const def = PATHS[p.path];
  if (p.rank >= def.ranks.length) return { next: null, work: 100, statsReady: true, statsHint: null };
  const need = meritNeeded(p.path, p.rank) * veteran;
  const work = Math.min(100, Math.floor((p.jobsSinceRank / need) * 100));
  const statsReady = keyStatAvg(p, p.path) >= def.promotionThresholds[p.rank - 1];
  return {
    next: def.ranks[p.rank],
    work,
    statsReady,
    statsHint: statsReady ? null : `You're not ready yet: ${def.keyStats.join(", ")} still need to grow.`,
  };
}

// ── Community service ──────────────────────────────────────────────────────

export const SERVICE = { energy: 8, heat: 4, integrity: 2, rep: 1 };

export const SERVICE_TASKS = [
  { id: "graffiti", name: "Scrub graffiti off the underpass", text: "Two hours with a wire brush. The wall looks almost new." },
  { id: "park", name: "Weed the flowerbeds in the park", text: "An old woman thanks you. She thinks you work for the city." },
  { id: "crossing", name: "Crossing guard at the school", text: "Forty kids cross safely. A few of them wave." },
  { id: "kitchen", name: "Serve at the soup kitchen", text: "You ladle soup for people with less than you had. They remember your face." },
  { id: "dogs", name: "Walk the shelter dogs", text: "The big one pulls the whole way. You come back smiling anyway." },
] as const;

/** Unpaid good deeds: they don't pay, but they mend your conscience and cool your record. */
export function communityService(p: Player, taskId: string, now: number): GameEvent[] {
  const task = SERVICE_TASKS.find((t) => t.id === taskId);
  if (!task) throw new GameError("That isn't a thing you can volunteer for.");
  if (p.energy < SERVICE.energy) throw new GameError("You're too tired to help anyone right now.");
  p.energy -= SERVICE.energy;
  p.heat = Math.max(0, p.heat - SERVICE.heat);
  p.stats.integrity = Math.min(100, p.stats.integrity + SERVICE.integrity);
  p.reputation += SERVICE.rep;
  p.jobCounts.service = (p.jobCounts.service ?? 0) + 1;
  // Getting out: good deeds count as honest work.
  if (p.exiting) p.exiting.jobs += 1;
  void now;
  return [{ tone: "good", text: `${task.text} Your record cools; your conscience feels lighter.` }];
}

// ── Bank statement ─────────────────────────────────────────────────────────

export const LEDGER = { max: 40 };
export type LedgerEntry = { at: number; label: string; cash: number; bank: number; dirty: number };

const money = (p: Player) => ({ cash: p.cash, bank: p.bank, dirty: dirtyOf(p) });

/** Records the change since the last snapshot under a label. */
export function recordMoney(p: Player, now: number, label: string) {
  if (p.regular) return;
  const now$ = money(p);
  const prev = p.msnap ?? now$;
  const d = { cash: Math.round(now$.cash - prev.cash), bank: Math.round(now$.bank - prev.bank), dirty: Math.round(now$.dirty - prev.dirty) };
  p.msnap = now$;
  if (!d.cash && !d.bank && !d.dirty) return;
  p.ledger = [{ at: now, label, ...d }, ...(p.ledger ?? [])].slice(0, LEDGER.max);
}

// ── After a hit: the body ──────────────────────────────────────────────────

export const DISPOSAL = {
  ttlMs: 20 * 60_000,
  sea: { cost: 1500, heat: -10 },
  parlour: { cost: 4000, heat: -20 },
  leave: { heat: 10 },
};

export function disposalView(p: Player, now: number) {
  const d = p.disposal;
  if (!d || d.until <= now) return null;
  const carried = p.cash + dirtyOf(p);
  return {
    targetName: d.targetName,
    until: d.until,
    options: [
      { id: "leave", label: "Leave it and run", hint: "Free. The body is found fast, and so are the clues.", block: null as string | null },
      { id: "sea", label: `A boat, a weight, the sea ($${DISPOSAL.sea.cost.toLocaleString("en")})`, hint: "A fisherman who asks no questions. Less for the police to find.", block: carried < DISPOSAL.sea.cost ? `You need $${DISPOSAL.sea.cost.toLocaleString("en")} on you.` : null },
      { id: "parlour", label: `The funeral parlour ($${DISPOSAL.parlour.cost.toLocaleString("en")})`, hint: "The director owes the family. The body is never seen again.", block: carried < DISPOSAL.parlour.cost ? `You need $${DISPOSAL.parlour.cost.toLocaleString("en")} on you.` : null },
    ],
  };
}

/** Decides what happens to the body; changes the evidence on the murder case. */
export function dispose(p: Player, c: CaseFile | null, choice: "leave" | "sea" | "parlour", now: number, rng: Rng): GameEvent[] {
  const d = p.disposal;
  if (!d || d.until <= now) {
    p.disposal = null;
    throw new GameError("It's too late for that now.");
  }
  p.disposal = null;
  if (choice === "leave") {
    p.heat += DISPOSAL.leave.heat;
    if (c) addTip(c, "bystander", 0.7, now, rng, undefined, "Forensics");
    return [{ tone: "bad", text: `You walk away. By morning ${d.targetName}'s body is in the papers, and forensics has something to work with.` }];
  }
  const opt = DISPOSAL[choice];
  if (takeCarried(p, opt.cost) < opt.cost) throw new GameError(`You need $${opt.cost.toLocaleString("en")} on you.`);
  p.heat = Math.max(0, p.heat + opt.heat);
  if (c) {
    // Witness statements stay (people saw what they saw); physical clues go.
    c.tips = choice === "parlour" ? c.tips.filter((t) => t.source === "witness") : c.tips.filter((t) => t.source !== "bystander");
  }
  return [
    choice === "sea"
      ? { tone: "good", text: "Out past the breakwater at dawn. The sea doesn't give things back." }
      : { tone: "good", text: "The director doesn't look up from his paperwork. By noon there's nothing left to find." },
  ];
}

export { BALANCE };
