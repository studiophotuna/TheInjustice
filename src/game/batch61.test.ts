import { describe, expect, it } from "vitest";
import { applyAction, createPlayer, tick } from "./engine";
import { ENDING } from "./ending";
import { LEADS } from "./leads";
import { CHAPTER_BY_ID, CHAPTERS, STORY_ART } from "./content/story";
import { streetTitle } from "./titles";
import { toView } from "./view";
import type { Player } from "./types";

// 8.4: the case ends with one choice, and four careers get their own chapters.

const NOW = Date.UTC(2027, 10, 1, 12);
const WEEK = 7 * 86_400_000;
const rng = () => 0.5;

function solved(): Player {
  const p = createPlayer("p", "Dana", NOW, "varrow");
  tick(p, NOW);
  p.leads = Object.fromEntries(LEADS.map((l) => [l.id, { startedAt: NOW, base: { jobs: 0, careerJobs: 0, fights: 0 }, closedAt: NOW }]));
  return p;
}

describe("the end of the case", () => {
  it("can't be chosen until the last lead is closed, and only once", () => {
    const p = createPlayer("p", "Dana", NOW, "varrow");
    tick(p, NOW);
    expect(() => applyAction(p, { type: "case_end", choice: "court" }, NOW, rng)).toThrow(/Close every lead/);
    const q = solved();
    expect(toView(q, NOW).ending).toMatchObject({ complete: true, choice: null });
    applyAction(q, { type: "case_end", choice: "court" }, NOW, rng);
    expect(() => applyAction(q, { type: "case_end", choice: "press" }, NOW, rng)).toThrow(/already decided/);
  });

  it("court clears your heat and gives you the title and the chapter", () => {
    const p = solved();
    p.heat = 60;
    const rep = p.reputation;
    applyAction(p, { type: "case_end", choice: "court" }, NOW, rng);
    expect(p.heat).toBe(0);
    expect(p.reputation).toBe(rep + ENDING.court.reputation);
    expect(streetTitle(p)).toBe("Exonerated");
    const v = toView(p, NOW);
    expect(v.chapters.map((c) => c.id)).toContain("ending_court");
    expect(v.chapters.map((c) => c.id)).not.toContain("ending_press");
  });

  it("press leaves a headline for the city's front page", () => {
    const p = solved();
    applyAction(p, { type: "case_end", choice: "press" }, NOW, rng);
    expect(p.pressStory).toMatch(/Dana exposes Judge Aldous Crane/);
  });

  it("Kozak pays dirty money, and Crane's favour ends one sentence, not a trial", () => {
    const p = solved();
    const dirty = p.dirty ?? 0;
    applyAction(p, { type: "case_end", choice: "kozak" }, NOW, rng);
    expect(p.dirty).toBe(dirty + ENDING.kozak.dirty);
    expect(() => applyAction(p, { type: "crane_favor" }, NOW, rng)).toThrow(/not in a cell/);
    p.jailUntil = NOW + 3_600_000;
    p.custodyCase = "c1";
    expect(() => applyAction(p, { type: "crane_favor" }, NOW, rng)).toThrow(/trial isn't over/);
    p.custodyCase = null;
    applyAction(p, { type: "crane_favor" }, NOW, rng);
    expect(p.jailUntil).toBe(0);
    p.jailUntil = NOW + 3_600_000;
    expect(() => applyAction(p, { type: "crane_favor" }, NOW, rng)).toThrow(/spent/);
  });

  it("keeping it pays an envelope a week for eight weeks, then stops", () => {
    const p = solved();
    applyAction(p, { type: "case_end", choice: "keep" }, NOW, rng);
    const cash = p.cash;
    tick(p, NOW + WEEK - 1000);
    expect(p.cash).toBe(cash);
    tick(p, NOW + WEEK);
    expect(p.cash).toBe(cash + ENDING.keep.weekly);
    tick(p, NOW + 20 * WEEK);
    expect(p.caseEnding!.cuts).toBe(ENDING.keep.weeks);
    expect(p.cash).toBeGreaterThanOrEqual(cash + ENDING.keep.weekly * ENDING.keep.weeks);
    expect(p.inbox!.some((n) => /heart gave out/.test(n.text))).toBe(true);
    expect(toView(p, NOW + 20 * WEEK).ending.paymentsLeft).toBe(0);
  });
});

describe("career chapters", () => {
  it("military, mechanic, hacker and fire each have two", () => {
    for (const path of ["military", "mechanic", "hacker", "fire"]) {
      expect(CHAPTERS.filter((c) => c.id.startsWith(`${path}_`)).length).toBe(2);
    }
  });

  it("every painted panel points at a real chapter panel", () => {
    for (const key of STORY_ART) {
      const [id, n] = [key.slice(0, key.lastIndexOf("-")), Number(key.slice(key.lastIndexOf("-") + 1))];
      expect(CHAPTER_BY_ID[id]?.panels[n - 1]?.img).toBe(`/story/${key}.jpg`);
    }
  });
});
