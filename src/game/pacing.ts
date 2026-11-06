// Pacing simulator: plays a career minute by minute with a realistic schedule and a sensible
// strategy, and reports how many real days each rank takes. Used to tune BALANCE; run it with
// `npm run pacing`.
//
// Strategy: work the career's best job while promotion merit is short; once merit is there but
// the key stats aren't, train the weakest key stat (gym or the job that trains it best). Eat when
// allowed, keep cash in the bank, move into better housing when it's affordable.
//
// The family's crew requirements (Mafia) and casework (arrests, verdicts) are left out: the sim
// measures the solo grind, which is the floor. Social requirements only add time.

import { BALANCE, maxEnergy } from "./balance";
import { ITEMS } from "./content/items";
import { JOBS, type JobDef } from "./content/jobs";
import { meritNeeded, PATHS } from "./content/paths";
import { SCHOOLS } from "./content/schools";
import { applyAction, createPlayer, jobLock, jobMerit, jobXp, tick } from "./engine";
import { sv } from "./stats";
import type { PathId, Player, StatKey } from "./types";

export type Schedule = "hardcore" | "regular" | "casual";

/** Minutes of the day the player is online. */
export const SCHEDULES: Record<Schedule, { label: string; sessions: [number, number][] }> = {
  // Checks in every hour from 8am to midnight, ten minutes each time.
  hardcore: { label: "Hardcore (logs in every hour, 8am–midnight)", sessions: Array.from({ length: 16 }, (_, i) => [(8 + i) * 60, 10] as [number, number]) },
  // Morning, lunch, evening.
  regular: { label: "Regular (3 sessions a day)", sessions: [[8 * 60, 20], [13 * 60, 20], [20 * 60, 40]] },
  // One evening session.
  casual: { label: "Casual (1 evening session)", sessions: [[20 * 60, 45]] },
};

type Action = { kind: "job"; job: JobDef } | { kind: "gym"; stat: "strength" | "toughness" | "agility" };

const chance = (p: Player, job: JobDef) => {
  if (!job.risk) return 1;
  const avg = job.risk.stats.reduce((s, k) => s + sv(p, k), 0) / job.risk.stats.length;
  return Math.max(0.15, Math.min(0.95, 0.5 + (avg - job.risk.difficulty) / 30));
};

function pickActions(p: Player): Action[] {
  const path = p.path!;
  const def = PATHS[path];
  const needed = meritNeeded(path, p.rank);
  const meritShort = Math.max(0, needed - p.jobsSinceRank);
  const target = def.promotionThresholds[p.rank - 1] ?? 999;
  const deficit = (k: StatKey) => Math.max(0, target - sv(p, k));
  const totalDeficit = def.keyStats.reduce((s, k) => s + deficit(k), 0);
  // How much closer to the next promotion an action gets you, as a share of what's missing.
  const statProgress = (xp: Partial<Record<StatKey, number>>, mult: number) =>
    totalDeficit <= 0
      ? 0
      : def.keyStats.reduce((s, k) => s + Math.min(deficit(k), ((xp[k] ?? 0) * mult * 2) / Math.sqrt(Math.max(1, p.stats[k]))), 0) / totalDeficit;
  const meritProgress = (m: number) => (meritShort <= 0 ? 0 : Math.min(m, meritShort) / needed);
  const scored: { a: Action; score: number }[] = JOBS.filter((j) => !jobLock(p, j)).map((job) => {
    const c = chance(p, job);
    const merit = job.path === path ? jobMerit(p, job, true) * c + jobMerit(p, job, false) * (1 - c) : 0;
    return { a: { kind: "job", job } as Action, score: (meritProgress(merit) + statProgress(jobXp(job), 0.5 + 0.5 * c)) / job.energy };
  });
  for (const stat of ["strength", "toughness", "agility"] as const) {
    if (!def.keyStats.includes(stat)) continue;
    scored.push({ a: { kind: "gym", stat }, score: statProgress({ [stat]: BALANCE.gym.xp }, 1) / BALANCE.gym.energy });
  }
  return scored.sort((x, y) => y.score - x.score).map((x) => x.a);
}

function tryAct(p: Player, action: Record<string, unknown>, now: number): boolean {
  try {
    applyAction(p, action as never, now, Math.random);
    return true;
  } catch {
    return false;
  }
}

/** Plays one career for `days` and returns the day (fractional) each rank was reached. */
export function simulate(path: PathId, schedule: Schedule, days = 120, seed = 1): { reached: Record<number, number>; playMinutes: number; actions: number; days: number; worth: Record<number, number>; final: Record<string, unknown> } {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const oldRandom = Math.random;
  Math.random = rand;
  try {
    const school = SCHOOLS.find((x) => x.id === PATHS[path].school);
    const p = createPlayer("sim", "Sim Player", 0, school?.country);
    // Skip the career search: start on day one as a rank-1 member of the career.
    p.path = path;
    p.rank = 1;
    p.jobsSinceRank = 0;
    if (school) p.school = school.id;
    // The family's crew rules are a social requirement; the solo sim waives them.
    if (path === "enforcer") {
      p.crewId = "sim-crew";
      p.family = { madeAt: 1, crewJobs: 99, heists: 1, leads: true, turf: true };
    }
    const reached: Record<number, number> = { 1: 0 };
    let played = 0;
    // Money on hand + savings (clean and dirty) at the end of some days.
    const worth: Record<number, number> = {};
    let playMinutes = 0;
    let actions = 0;
    const food = ITEMS.filter((i) => i.kind === "food").sort((a, b) => (b.energy ?? 0) - (a.energy ?? 0));
    for (let day = 0; day < days; day++) {
      played = day + 1;
      for (const [start, len] of SCHEDULES[schedule].sessions) {
        for (let m = 0; m < len; m++) {
          const now = (day * 1440 + start + m) * 60_000;
          tick(p, now);
          playMinutes += 1;
          // Housing first: better regen and a bigger energy bar.
          if (!p.hasBankAccount && p.cash >= BALANCE.bankOpenCost + 5) tryAct(p, { type: "bank", op: "open" }, now);
          for (const h of ["penthouse", "townhouse", "apartment", "room", "sleeping_bag"]) {
            const item = ITEMS.find((i) => i.id === h)!;
            if (p.housing < (item.housing ?? 0) && p.cash + p.bank >= item.price + 10) {
              if (p.bank) tryAct(p, { type: "bank", op: "withdraw", amount: p.bank }, now);
              tryAct(p, { type: "buy", itemId: h }, now);
            }
          }
          if (p.fullUntil <= now) {
            for (const f of food.filter((x) => p.energy + (x.energy ?? 0) <= maxEnergy(p.housing))) {
              if (p.cash < f.price && p.bank >= f.price) tryAct(p, { type: "bank", op: "withdraw", amount: f.price * 2 }, now);
              if (p.cash >= f.price && tryAct(p, { type: "buy", itemId: f.id }, now)) {
                tryAct(p, { type: "use", itemId: f.id }, now);
                break;
              }
            }
          }
          for (let k = 0; k < 6; k++) {
            let did = false;
            for (const a of pickActions(p)) {
              const ok = a.kind === "job" ? tryAct(p, { type: "job", jobId: a.job.id }, now) : tryAct(p, { type: "train", stat: a.stat }, now);
              if (ok) {
                did = true;
                actions++;
                break;
              }
            }
            if (!did) break;
            if (!reached[p.rank]) reached[p.rank] = day + (start + m) / 1440;
          }
          // Dirty money is cleaned at the laundromat (30% fee) before it can buy anything legal.
          if ((p.dirty ?? 0) >= 300) tryAct(p, { type: "launder", method: "laundromat", amount: Math.floor(p.dirty ?? 0) }, now);
          if (p.hasBankAccount && p.cash > 60) tryAct(p, { type: "bank", op: "deposit", amount: p.cash - 30 }, now);
        }
      }
      if ([7, 30, 60].includes(day + 1)) worth[day + 1] = Math.round(p.cash + p.bank + (p.dirty ?? 0));
      if (p.rank >= PATHS[path].ranks.length && day >= 60) break;
    }
    return { reached, playMinutes, actions, days: played, worth, final: { housing: p.housing, cash: Math.round(p.cash), bank: Math.round(p.bank), dirty: Math.round(p.dirty ?? 0), jobs: p.jobCounts } };
  } finally {
    Math.random = oldRandom;
  }
}

export const CAREERS: PathId[] = ["police", "enforcer", "courts", "vigilante", "medicine", "banking", "military", "mechanic", "hacker", "fire"];
