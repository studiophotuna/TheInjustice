import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PATHS } from "./content/paths";
import { CAREERS, SCHEDULES, simulate, type Schedule } from "./pacing";

// The full table is slow, so it only runs with `npm run pacing` (PACING=1).
const full = !!process.env.PACING;

describe("pacing", () => {
  it("the simulator plays a career and gets promoted", () => {
    const r = simulate("police", "hardcore", 3);
    expect(r.reached[2]).toBeDefined();
    expect(r.actions).toBeGreaterThan(20);
  });

  it.runIf(full)("prints days to each rank for every career and schedule", () => {
    const lines: string[] = [];
    for (const sched of Object.keys(SCHEDULES) as Schedule[]) {
      lines.push(`\n${SCHEDULES[sched].label}`);
      lines.push(`career      ${[2, 3, 4, 5, 6, 7, 8].map((r) => `r${r}`.padStart(6)).join("")}   actions/day   $ day 7 / 30 / 60`);
      for (const path of CAREERS) {
        const runs = [1, 2, 3].map((seed) => simulate(path, sched, 240, seed));
        const avg = (r: number) => {
          const v = runs.map((x) => x.reached[r]).filter((x) => x !== undefined);
          return v.length === runs.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : "  –";
        };
        const perDay = Math.round(runs.reduce((s, x) => s + x.actions / x.days, 0) / runs.length);
        const money = [7, 30, 60].map((d) => Math.round(runs.reduce((s, x) => s + (x.worth[d] ?? 0), 0) / runs.length).toLocaleString("en"));
        lines.push(`${PATHS[path].name.padEnd(11)} ${[2, 3, 4, 5, 6, 7, 8].map((r) => avg(r).padStart(6)).join("")}   ${String(perDay).padStart(6)}        ${money.join(" / ")}`);
      }
    }
    const out = lines.join("\n");
    if (process.env.PACING_OUT) writeFileSync(process.env.PACING_OUT, out);
    console.log(out);
  }, 600_000);
});
