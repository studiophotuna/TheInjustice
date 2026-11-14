import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { newCity } from "./city";
import { commitCrime } from "./crime";
import { applyAction, createPlayer, tick } from "./engine";
import { frontPage } from "./paper";
import { attackPlayer, bountyOn, createCrew, addMember, postBounty } from "./social";
import { claimTurf, declareWar, joinWar, settleWar, turfCuts } from "./turf";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const boss = (id: string, name: string, tag: string) => {
  const b = mk(id, name);
  b.path = "enforcer";
  b.rank = 4;
  b.cash = 1000 + BALANCE.crew.createCost;
  const crew = createCrew(b, `crew-${id}`, `${name} Crew`, tag, LATER);
  crew.vault = 50000;
  return { b, crew };
};

describe("crew wars", () => {
  it("a crew claims a district and takes a cut of outsiders' pay there", () => {
    const { b, crew } = boss("a", "Alma", "ALM");
    const c = newCity("varrow", LATER);
    claimTurf(c, crew, b, "gutter", LATER);
    expect(crew.vault).toBe(50000 - BALANCE.turf.claimCost);
    expect(() => claimTurf(c, crew, b, "gutter", LATER)).toThrow(/already runs/);
    const worker = mk("w", "Worker");
    applyAction(worker, { type: "job", jobId: "cans" }, LATER, always(0.99), { turf: turfCuts(c) });
    if (worker.cash >= 20) expect(worker.turfOwed?.crewId).toBe(crew.id);
    // Members of the crew don't pay their own crew.
    addMember(crew, worker, LATER);
    worker.turfOwed = null;
    applyAction(worker, { type: "job", jobId: "cans" }, LATER + 60_000, always(0.99), { turf: turfCuts(c) });
    expect(worker.turfOwed ?? null).toBeNull();
  });

  it("a rival crew declares war; the stronger side holds the district", () => {
    const { b: alma, crew: almaCrew } = boss("a", "Alma", "ALM");
    const { b: bruno, crew: brunoCrew } = boss("b", "Bruno", "BRU");
    const c = newCity("varrow", LATER);
    claimTurf(c, almaCrew, alma, "gutter", LATER);
    declareWar(c, brunoCrew, bruno, "gutter", LATER);
    const muscle: Player[] = ["m1", "m2"].map((id) => {
      const m = mk(id, id);
      addMember(brunoCrew, m, LATER);
      m.stats.strength = m.stats.toughness = 400;
      joinWar(c, m, "gutter", LATER);
      return m;
    });
    joinWar(c, alma, "gutter", LATER);
    expect(() => settleWar(c, "gutter", [bruno, ...muscle], [alma], LATER, always(0.5))).toThrow(/isn't over/);
    const end = LATER + BALANCE.turf.warMs;
    const out = settleWar(c, "gutter", [bruno, ...muscle], [alma], end, always(0.5), alma.id);
    expect(c.turf?.gutter?.crewId).toBe(brunoCrew.id);
    // The war plays as cards, told from the side of whoever settles it.
    const scene = out.find((e) => e.fight?.caper)!.fight!.caper!;
    expect(scene.steps.map((s) => s.card)).toEqual(["rally", "hold", "clash", "flag"]);
    expect(scene.result).toBe("taken");
    expect(scene.good).toBe(false);
    expect(c.log[0].text).toMatch(/took/);
    expect(() => declareWar(c, almaCrew, alma, "gutter", end + 1000)).toThrow(/cool down/);
  });
});

describe("bounties", () => {
  it("anyone posts a bounty; whoever beats the target collects it all", () => {
    const poster = mk("p", "Poster");
    poster.hasBankAccount = true;
    poster.bank = 500;
    const target = mk("t", "Target");
    postBounty(poster, target, 200, LATER);
    expect(bountyOn(target)).toBe(200);
    expect(target.inbox![0].text).toMatch(/price on your head/);
    expect(() => postBounty(poster, target, 50, LATER)).toThrow(/start at/);
    const hunter = mk("h", "Hunter");
    hunter.stats.strength = hunter.stats.toughness = hunter.stats.agility = 400;
    attackPlayer(hunter, target, LATER, always(0.5));
    expect(hunter.dirty ?? 0).toBeGreaterThanOrEqual(200);
    expect(bountyOn(target)).toBe(0);
  });
});

describe("the newspaper", () => {
  it("prints verdicts and city news, never who committed an unsolved crime", () => {
    const thief = mk("a", "Novak Petresk");
    const victim = mk("v", "Victor");
    victim.cash = 200;
    const cf = commitCrime(thief, victim, "snatch", LATER, always(0), { caseId: "C1", district: "Southside", crewTag: null, witnesses: [] }).caseFile!;
    const c = newCity("varrow", LATER);
    c.log = [{ at: LATER, text: "Mayor Alma raises the city tax to 5%." }];
    const page = frontPage("varrow", c, [cf], LATER + 1000);
    expect(page.name).toBe("The Grayhaven Ledger");
    expect(page.stats.crimes).toBe(1);
    expect(page.stats.unsolved).toBe(1);
    expect(JSON.stringify(page)).not.toMatch(/Novak/);
    expect(page.lead).toMatch(/city tax/);
  });
});
