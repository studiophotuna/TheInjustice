import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { addMerit, createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { INCIDENT, npcScrub, planIncident, repairWalkIn, runIncident, treat, treatBlock } from "./incidents";
import { suspectsFor } from "./crime";
import type { Player, PathId } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, path: PathId | null = null, rank = 0, regular = false): Player => {
  const p = createPlayer(id, id[0].toUpperCase() + id.slice(1), T0, "solmarra");
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.cash = 200;
  p.path = path;
  p.rank = rank;
  if (regular) p.regular = { country: "solmarra", key: id, slot: -1 };
  return p;
};
const seq = (...vs: number[]) => {
  let i = 0;
  return () => vs[i++ % vs.length];
};

describe("the city's own incidents", () => {
  it("a mugging between regulars opens a real case, puts the victim in hospital, and can leave a deposit", () => {
    const c = newCity("solmarra", NOW);
    const thief = mk("dutch", "enforcer", 2, true);
    const victim = mk("bea", "banking", 2, true);
    const out = runIncident("mug", thief, victim, c, NOW, always(0.1), "ABC123");
    expect(out.caseFile?.culpritId).toBe(thief.id);
    expect(out.caseFile?.tips.length).toBeGreaterThanOrEqual(3);
    expect(out.caseFile?.deposit).toBeTruthy();
    expect(victim.hospitalUntil).toBeGreaterThan(NOW);
    expect(thief.heat).toBe(INCIDENT.heat);
    expect(c.incidentAt).toBe(NOW);
  });

  it("the culprit can be found among the city's people, regulars included", () => {
    const c = newCity("solmarra", NOW);
    const thief = mk("dutch", "enforcer", 2, true);
    const victim = mk("bea", null, 0, true);
    const cf = runIncident("snatch", thief, victim, c, NOW, always(0.99), "ABC124").caseFile!;
    // Give the file solid tips about the real thief.
    cf.tips = cf.tips.map((t) => ({ ...t, value: cf.suspect[t.trait] }));
    const pool = [thief, mk("other"), mk("third")].map((player) => ({ player, crewTag: null }));
    expect(suspectsFor(cf, pool).map((s) => s.id)).toContain(thief.id);
  });

  it("fires go on the fire log, wrecks go to the garage", () => {
    const c = newCity("solmarra", NOW);
    runIncident("arson", mk("lenny", null, 0, true), mk("gus", null, 0, true), c, NOW, always(0.3), "X");
    expect(c.fires?.length).toBe(1);
    const driver = mk("mags", null, 0, true);
    runIncident("crash", null, driver, c, NOW, always(0.3), "Y");
    expect(c.walkIns?.length).toBe(1);
    expect(driver.hospitalUntil).toBeGreaterThan(NOW);
  });

  it("only the street's own muscle and drifters commit them, never the law", () => {
    const regs = [mk("teo", "police", 3, true), mk("ivy", "courts", 2, true)];
    for (let i = 0; i < 20; i++) {
      const plan = planIncident(regs, NOW, Math.random);
      if (plan) expect(plan.kind).toBe("crash");
    }
  });
});

describe("career work from incidents", () => {
  it("a doctor treats anyone in the ward once: half the stay, paid, and experience", () => {
    const d = mk("doc", "medicine", 2);
    const patient = mk("pat", null, 0, true);
    patient.hospitalUntil = NOW + 100 * 60_000;
    const wits = d.stats.wits;
    const merit = d.jobsSinceRank;
    treat(d, patient, NOW);
    expect(patient.hospitalUntil).toBe(NOW + 50 * 60_000);
    expect(d.stats.wits).toBeGreaterThan(wits);
    expect(d.jobsSinceRank).toBeGreaterThan(merit);
    expect(treatBlock(d, patient, NOW)).toMatch(/already treated/);
  });

  it("a mechanic fixes a wreck from the street, a hacker scrubs a regular's record", () => {
    const c = newCity("solmarra", NOW);
    runIncident("crash", null, mk("mags", null, 0, true), c, NOW, always(0.3), "Y");
    const m = mk("mech", "mechanic", 1);
    const cash = m.cash;
    repairWalkIn(m, c, c.walkIns![0].id, NOW);
    expect(m.cash).toBeGreaterThan(cash);
    expect(() => repairWalkIn(mk("mech2", "mechanic", 1), c, c.walkIns![0].id, NOW)).toThrow(/already fixed/);

    const h = mk("hax", "hacker", 3);
    const client = mk("lenny", "enforcer", 1, true);
    client.heat = 30;
    npcScrub(h, client, NOW);
    expect(client.heat).toBeLessThan(30);
    expect(h.dirty).toBeGreaterThan(0);
  });

  it("every career's casework earns experience in that career's key stats", () => {
    for (const path of ["police", "medicine", "courts", "banking", "military", "mechanic", "hacker", "fire", "vigilante", "enforcer"] as PathId[]) {
      const p = mk(`p${path}`, path, 1);
      const before = Object.values(p.stats).reduce((a, b) => a + b, 0);
      addMerit(p, path, 2);
      expect(Object.values(p.stats).reduce((a, b) => a + b, 0), path).toBeGreaterThan(before);
    }
  });
});
