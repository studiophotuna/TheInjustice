// How the game is doing, from what the game already stores: no trackers. Shown to moderators.
import { totalJobs } from "./content/districts";
import { PATHS } from "./content/paths";
import type { Player } from "./types";

const DAY = 86_400_000;

export interface Numbers {
  players: number;
  accounts: number;
  activeDay: number;
  activeWeek: number;
  /** New characters per day, oldest first (last 14 days). */
  newPerDay: { day: string; count: number }[];
  /** Of characters at least N days old, the share that came back N or more days after starting. */
  backAfter1: { of: number; back: number };
  backAfter7: { of: number; back: number };
  /** How far people get. Each step counts characters that reached it. */
  funnel: { step: string; count: number }[];
  /** Where people who stopped playing (gone 3+ days) stopped. */
  stoppedAt: { step: string; count: number }[];
  careers: { name: string; count: number }[];
  deaths: number;
}

const STEPS: { step: string; ok: (p: Player) => boolean }[] = [
  { step: "Started", ok: () => true },
  { step: "Did a job", ok: (p) => totalJobs(p) >= 1 },
  { step: "Did 15 jobs", ok: (p) => totalJobs(p) >= 15 },
  { step: "Started a career", ok: (p) => !!p.path },
  { step: "Reached rank 2", ok: (p) => !!p.path && p.rank >= 2 },
  { step: "Reached rank 4", ok: (p) => !!p.path && p.rank >= 4 },
  { step: "Saved an account", ok: (p) => p.id.startsWith("acct_") },
];

export function gameNumbers(all: Player[], now: number): Numbers {
  const people = all.filter((p) => !p.regular);
  const seen = (p: Player) => p.seenAt ?? p.tickAt ?? p.createdAt;
  const newPerDay: Numbers["newPerDay"] = [];
  for (let i = 13; i >= 0; i--) {
    const start = Math.floor(now / DAY) * DAY - i * DAY;
    newPerDay.push({ day: new Date(start).toISOString().slice(5, 10), count: people.filter((p) => p.createdAt >= start && p.createdAt < start + DAY).length });
  }
  const back = (days: number) => {
    const old = people.filter((p) => now - p.createdAt >= days * DAY);
    return { of: old.length, back: old.filter((p) => seen(p) - p.createdAt >= days * DAY).length };
  };
  const gone = people.filter((p) => now - seen(p) >= 3 * DAY);
  const lastStep = (p: Player) => {
    let s = STEPS[0].step;
    for (const x of STEPS.slice(0, -1)) if (x.ok(p)) s = x.step;
    return s;
  };
  const careers = Object.entries(PATHS)
    .map(([id, def]) => ({ name: def.name, count: people.filter((p) => p.path === id).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  return {
    players: people.length,
    accounts: people.filter((p) => p.id.startsWith("acct_")).length,
    activeDay: people.filter((p) => now - seen(p) < DAY).length,
    activeWeek: people.filter((p) => now - seen(p) < 7 * DAY).length,
    newPerDay,
    backAfter1: back(1),
    backAfter7: back(7),
    funnel: STEPS.map((s) => ({ step: s.step, count: people.filter(s.ok).length })),
    stoppedAt: STEPS.slice(0, -1).map((s) => ({ step: s.step, count: gone.filter((p) => lastStep(p) === s.step).length })),
    careers,
    deaths: people.reduce((n, p) => n + (p.deaths ?? 0), 0),
  };
}
