import { describe, expect, it } from "vitest";
import { applyAction, createPlayer, tick } from "./engine";
import { BALANCE } from "./balance";
import { JOBS } from "./content/jobs";
import { DISTRICT_BY_ID } from "./content/districts";
import { COUNTRIES } from "./content/world";
import { TUTORIAL } from "./tutorial";

// 7.14: a first session that goes somewhere.

const NOW = Date.UTC(2027, 10, 1, 12);
const always = (v: number) => () => v;

describe("a first session", () => {
  it("newcomers aren't mugged on the job in their first day; after that the street is the street", () => {
    const p = createPlayer("p", "Dana", NOW, "varrow");
    tick(p, NOW);
    p.energy = 500;
    p.cash = 1000;
    // rng 0: every roll that could mug you would.
    const mugged = (evs: { text: string }[]) => evs.some((e) => /Wallet\. Now/.test(e.text));
    for (let i = 0; i < 10; i++) expect(mugged(applyAction(p, { type: "job", jobId: "cans" }, NOW + i * 60_000, always(0)))).toBe(false);
    const later = NOW + BALANCE.pvp.protectionMs + 1;
    const q = createPlayer("q", "Old Hand", NOW, "varrow");
    tick(q, later);
    q.energy = 500;
    q.cash = 1000;
    expect(mugged(applyAction(q, { type: "job", jobId: "cans" }, later, always(0)))).toBe(true);
  });

  it("the first lead is already being followed, so the first jobs count", () => {
    const p = createPlayer("p", "Dana", NOW, "solmarra");
    expect(p.leads?.benny_seen?.startedAt).toBe(NOW);
  });

  it("a full bar of starter work in any city pays for a first weapon", () => {
    for (const c of COUNTRIES) {
      const starters = JOBS.filter((j) => !j.path && !j.reveal && !j.requires && DISTRICT_BY_ID[j.district].id === c.startDistrict && !/Crime/.test(j.tag));
      const best = Math.max(...starters.map((j) => (j.pay[0] + j.pay[1]) / 2 / j.energy));
      // 100 energy of the best legal starter job, at local prices, against a $150 weapon plus tax.
      expect(best * 100 * c.priceMult, c.id).toBeGreaterThan(160);
    }
  });

  it("day one asks for something to fight with", () => {
    expect(TUTORIAL.some((s) => s.id === "weapon" && s.go === "shop:weapon")).toBe(true);
  });
});
