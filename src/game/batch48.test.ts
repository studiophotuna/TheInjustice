import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { runIncident } from "./incidents";
import { CASEWORK, pickTask, type CityWork } from "./regcase";
import { investigateFire } from "./firehack";
import type { PathId, Player } from "./types";

const NOW = Date.UTC(2027, 10, 1, 12);
const LATER = NOW + CASEWORK.playersFirstMs + 1;
const always = (v: number) => () => v;
const reg = (key: string, path: PathId | null, rank: number): Player => {
  const p = createPlayer(`reg-solmarra-${key}`, key[0].toUpperCase() + key.slice(1), NOW - 90 * 86_400_000, "solmarra");
  p.path = path;
  p.rank = rank;
  p.regular = { country: "solmarra", key, slot: -1 };
  tick(p, NOW);
  p.energy = 100;
  return p;
};
const work = (city: CityWork["city"], people: Player[], cases: CityWork["cases"] = []): CityWork => ({ city, cases, people, tags: new Map() });

describe("regulars do their careers' city work", () => {
  it("a firefighter attends a fire once players have had their chance, and it counts", () => {
    const c = newCity("solmarra", NOW);
    runIncident("arson", reg("rico", "enforcer", 2), reg("pia", null, 0), c, NOW, always(0.3), "X");
    const sal = reg("sal", "fire", 3);
    expect(pickTask(sal, work(c, []), NOW + 60_000)).toBeNull();
    const task = pickTask(sal, work(c, []), LATER);
    expect(task?.kind).toBe("fire");
    investigateFire(sal, c, (task as { fireId: string }).fireId, null, LATER, always(0.01));
    expect(c.fires![0].solved?.by).toBe(sal.name);
    expect(sal.regular!.jobs).toBeGreaterThan(0);
    expect(pickTask(sal, work(c, []), LATER)).toBeNull();
  });

  it("a police regular works a scene; a doctor treats the ward; a mechanic takes a wreck", () => {
    const c = newCity("solmarra", NOW);
    const victim = reg("dario", null, 0);
    const cf = runIncident("mug", reg("rico", "enforcer", 2), victim, c, NOW, always(0.3), "C1").caseFile!;
    runIncident("crash", null, reg("pia", null, 0), c, NOW, always(0.3), "C2");
    expect(pickTask(reg("ana", "police", 4), work(c, [victim], [cf]), LATER)?.kind).toBe("investigate");
    expect(pickTask(reg("marisol", "medicine", 3), work(c, [victim], [cf]), LATER)).toEqual({ kind: "treat", patientId: victim.id });
    expect(pickTask(reg("nino", "mechanic", 3), work(c, []), LATER)?.kind).toBe("repair");
  });

  it("an attorney takes up a prosecution nobody has taken", () => {
    const c = newCity("solmarra", NOW);
    const cf = runIncident("snatch", reg("rico", "enforcer", 2), reg("pia", null, 0), c, NOW, always(0.3), "C3").caseFile!;
    cf.trial = { suspectId: "x", suspectName: "X", officerId: "o", officerName: "O", at: NOW, deadline: NOW + 3_600_000, evidence: 1 };
    expect(pickTask(reg("tomas", "courts", 3), work(c, [], [cf]), LATER)).toEqual({ kind: "prosecute", caseId: cf.id });
  });
});
