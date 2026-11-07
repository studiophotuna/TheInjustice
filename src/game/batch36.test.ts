import { describe, expect, it } from "vitest";
import { applyAction, createPlayer, die, jobLock } from "./engine";
import { JOB_BY_ID, JOBS, revealed } from "./content/jobs";
import { LADDER_JOBS } from "./content/ladders";
import { sv } from "./stats";
import { toView } from "./view";
import { STAT_KEYS } from "./types";

const T0 = Date.UTC(2027, 0, 4, 12);
const always = (v: number) => () => v;

describe("hidden work that turns up as you get good", () => {
  it("every hidden job points at real jobs and gets harder step by step", () => {
    for (const j of LADDER_JOBS) {
      expect(JOB_BY_ID[j.id]).toBe(j);
      for (const id of j.reveal!.after) expect(JOB_BY_ID[id], `${j.id} after ${id}`).toBeTruthy();
      const prev = j.reveal!.after.length === 1 ? JOB_BY_ID[j.reveal!.after[0]] : null;
      if (prev?.risk && j.risk) {
        expect(j.risk.difficulty).toBeGreaterThan(prev.risk.difficulty);
        expect(j.pay[1]).toBeGreaterThan(prev.pay[1]);
      }
    }
    // Careers: one each, no more.
    const career = LADDER_JOBS.filter((j) => j.path);
    expect(new Set(career.map((j) => j.path)).size).toBe(career.length);
    expect(new Set(JOBS.map((j) => j.id)).size).toBe(JOBS.length);
  });

  it("stays hidden until you've done enough of the work before it, then says so once", () => {
    const p = createPlayer("l1", "Ladder", T0);
    const step1 = JOB_BY_ID.ld_scrap_run;
    expect(revealed(p, step1)).toBe(false);
    expect(toView(p, T0).jobs.some((j) => j.id === "ld_scrap_run")).toBe(false);
    expect(() => applyAction(p, { type: "job", jobId: "ld_scrap_run" }, T0, always(0.5))).toThrow(/heard/);

    let told = 0;
    for (let i = 0; i < 15; i++) {
      p.energy = 100;
      const ev = applyAction(p, { type: "job", jobId: "cans" }, T0 + i * 60_000, always(0.5));
      told += ev.filter((e) => /harder work/.test(e.text)).length;
    }
    expect(told).toBe(1);
    expect(jobLock(p, step1)).toBeNull();
    const card = toView(p, T0).jobs.find((j) => j.id === "ld_scrap_run")!;
    expect(card.fresh).toBe(true);
    expect(card.grade).toBe("Rough work");
    expect(toView(p, T0).jobs.some((j) => j.id === "ld_strip_car")).toBe(false);

    p.energy = 100;
    applyAction(p, { type: "job", jobId: "ld_scrap_run" }, T0 + 3_600_000, always(0.1));
    expect(toView(p, T0).jobs.find((j) => j.id === "ld_scrap_run")!.fresh).toBeUndefined();
  });

  it("career work turns up only mid-career, after a long run of senior work", () => {
    const p = createPlayer("l2", "Cop", T0);
    p.path = "police";
    p.rank = 3;
    p.jobCounts.arrest_suspect = 30;
    expect(toView(p, T0).jobs.some((j) => j.id === "ld_cold_case")).toBe(false);
    p.rank = 4;
    expect(toView(p, T0).jobs.find((j) => j.id === "ld_cold_case")?.grade).toBe("Only for the hardened");
  });

  it("no hidden job shows odds", () => {
    for (const j of LADDER_JOBS) expect([j.name, j.tag, ...j.lines, j.risk?.failText ?? ""].join(" ")).not.toMatch(/%|odds|chance/i);
  });
});

describe("dying never leaves you weaker than a new character", () => {
  it("every stat stays at or above the untrained level after any number of deaths", () => {
    const fresh = createPlayer("d0", "Fresh", T0);
    const p = createPlayer("d1", "Unlucky", T0);
    for (const k of STAT_KEYS) p.stats[k] = 3;
    // Death halves training; the untrained base is never touched.
    for (let i = 0; i < 6; i++) {
      die(p, T0 + i, "Road Gang", []);
      applyAction(p, { type: "rebirth" }, T0 + i + 1, always(0.5));
    }
    expect(p.deaths).toBe(6);
    for (const k of STAT_KEYS) expect(sv(p, k)).toBeGreaterThanOrEqual(sv(fresh, k));
  });
});
