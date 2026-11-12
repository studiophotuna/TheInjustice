import { describe, expect, it } from "vitest";
import { JOBS, JOB_BY_ID } from "./content/jobs";

// 7.16: the pay ladder keeps its promises.

const rate = (id: string) => {
  const j = JOB_BY_ID[id];
  return (j.pay[0] + j.pay[1]) / 2 / j.energy;
};
const avg = (ids: string[]) => ids.reduce((s, id) => s + rate(id), 0) / ids.length;

describe("pay", () => {
  it("hidden work always pays more than the work that unlocks it", () => {
    for (const j of JOBS.filter((x) => x.reveal)) {
      const best = Math.max(...j.reveal!.after.filter((id) => JOB_BY_ID[id]).map(rate));
      expect(rate(j.id), j.id).toBeGreaterThan(best);
    }
  });

  it("a career pays more than ordinary street work from rank 1, and every promotion is a raise", () => {
    const street = JOBS.filter((x) => !x.path && !x.reveal && !x.requires && !/Crime/.test(x.tag)).map((x) => rate(x.id)).sort((a, b) => a - b);
    const streetMedian = street[Math.floor(street.length / 2)];
    const paths = [...new Set(JOBS.filter((x) => x.path).map((x) => x.path!))];
    for (const p of paths) {
      let prev = 0;
      for (let r = 1; r <= 8; r++) {
        const ids = JOBS.filter((x) => x.path === p && !x.reveal && (x.minRank ?? 1) === r).map((x) => x.id);
        if (!ids.length) continue;
        const a = avg(ids);
        if (r === 1) expect(a, `${p} rank 1`).toBeGreaterThan(streetMedian);
        expect(a, `${p} rank ${r}`).toBeGreaterThan(prev);
        prev = a;
      }
    }
  });
});
