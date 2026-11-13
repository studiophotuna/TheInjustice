import { describe, expect, it } from "vitest";
import { pickTask } from "./regcase";
import type { CaseFile, Player } from "./types";

const now = 60 * 60_000;
const attorney = { id: "reg-attorney", name: "City Attorney", path: "courts", rank: 20, country: "varrow" } as Player;

function trialCase(at: number): CaseFile {
  return {
    id: "case-1",
    country: "varrow",
    district: "Old Town",
    kind: "mug",
    at,
    victimId: "victim",
    victimName: "Victim",
    amount: 100,
    culpritId: "suspect",
    suspect: {},
    tips: [],
    witnesses: [],
    investigatedBy: [],
    trial: {
      suspectId: "suspect",
      suspectName: "Suspect",
      officerId: "officer",
      officerName: "Officer",
      at,
      deadline: now + 60_000,
      evidence: 0.8,
    },
  } as unknown as CaseFile;
}

describe("attorney regular player-first window", () => {
  it("does not take a prosecution before the case is 20 minutes old", () => {
    const task = pickTask(attorney, { city: null, cases: [trialCase(now - 19 * 60_000)], people: [], tags: new Map() }, now);
    expect(task).toBeNull();
  });

  it("can take an unclaimed prosecution after the player-first window", () => {
    const task = pickTask(attorney, { city: null, cases: [trialCase(now - 21 * 60_000)], people: [], tags: new Map() }, now);
    expect(task).toEqual({ kind: "prosecute", caseId: "case-1" });
  });
});
