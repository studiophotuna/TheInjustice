import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import {
  advanceCity,
  appointChief,
  chiefSalary,
  dismissChief,
  eatSoup,
  fundSoup,
  CITY_EPOCH,
  cityView,
  collectSalary,
  crackdown,
  electionOpen,
  newCity,
  pardon,
  runForMayor,
  setBounty,
  setTax,
  skim,
  termEnds,
  vote,
} from "./city";
import { commitCrime } from "./crime";
import { applyAction, createPlayer, inJail, tick } from "./engine";
import { audit } from "./racket";
import type { City, PathId, Player } from "./types";

const B = BALANCE.city;
const T0 = CITY_EPOCH + 1000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;

const mk = (id: string, name: string, rep = 0) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  p.reputation = rep;
  return p;
};
const candidate = (id: string, name: string) => {
  const p = mk(id, name, 30);
  p.hasBankAccount = true;
  p.bank = 1000;
  return p;
};

/** A city whose current term has a mayor, so the ballot is closed until the last days. */
function cityWithMayor(mayor: Player): City {
  const c = newCity("varrow", LATER);
  c.mayor = { id: mayor.id, name: mayor.name, since: T0 };
  return c;
}

describe("elections", () => {
  it("an empty city hall holds a special election right away", () => {
    const c = newCity("varrow", LATER);
    expect(electionOpen(c, LATER)).toBe(true);
  });

  it("with a mayor, the ballot opens only in the last days of the term", () => {
    const c = cityWithMayor(mk("m", "Mayor"));
    expect(electionOpen(c, LATER)).toBe(false);
    expect(electionOpen(c, termEnds(c.term) - B.electionMs + 1)).toBe(true);
  });

  it("running needs reputation and a filing fee", () => {
    const c = newCity("varrow", LATER);
    expect(() => runForMayor(c, mk("n", "Nobody", 5), "", LATER)).toThrow(/reputation/);
    const a = candidate("a", "Alma");
    runForMayor(c, a, "Lower taxes, more cops.", LATER);
    expect(a.bank).toBe(1000 - B.runFee);
    expect(() => runForMayor(c, a, "", LATER)).toThrow(/already/);
  });

  it("one secret vote per resident; the winner is sworn in when the term ends", () => {
    const c = newCity("varrow", LATER);
    const a = candidate("a", "Alma");
    const b = candidate("b", "Bruno");
    runForMayor(c, a, "", LATER);
    runForMayor(c, b, "", LATER);
    const voters = [mk("v1", "Vic"), mk("v2", "Val"), mk("v3", "Vera")];
    vote(c, voters[0], "a", LATER);
    vote(c, voters[1], "a", LATER);
    vote(c, voters[2], "b", LATER);
    expect(() => vote(c, voters[0], "b", LATER)).toThrow(/already/);
    const view = cityView(c, voters[0], LATER);
    expect(view.turnout).toBe(3);
    expect(JSON.stringify(view)).not.toMatch(/"votes":\{|v1/);
    advanceCity(c, termEnds(c.term) + 1);
    expect(c.mayor?.name).toBe("Alma");
    expect(c.history[0]).toMatchObject({ name: "Alma", votes: 2, turnout: 3 });
    expect(c.candidates).toHaveLength(0);
  });

  it("newcomers and people from other countries can't vote", () => {
    const c = newCity("varrow", LATER);
    runForMayor(c, candidate("a", "Alma"), "", LATER);
    const fresh = createPlayer("n", "Newbie", LATER);
    expect(() => vote(c, fresh, "a", LATER)).toThrow(/too new/);
    const abroad = mk("x", "Abroad");
    abroad.country = "solmarra";
    expect(() => vote(c, abroad, "a", LATER)).toThrow(/live here/);
  });
});

describe("the mayor's powers", () => {
  it("sets the tax, which is withheld from job pay", () => {
    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    setTax(c, m, 0.05, LATER);
    // Real city income taxes top out around 4%: the cap is 5%.
    expect(() => setTax(c, m, 0.1, LATER)).toThrow(/between/);
    expect(() => setTax(c, mk("x", "Not mayor"), 0.05, LATER)).toThrow(/Only the mayor/);
    const worker = mk("w", "Worker");
    applyAction(worker, { type: "job", jobId: "cans" }, LATER, always(0.99), { taxRates: { varrow: 0.5 } });
    expect(worker.taxOwed?.amount).toBeGreaterThan(0);
    expect(worker.cash + worker.taxOwed!.amount).toBeGreaterThan(worker.cash);
  });

  it("a crackdown makes crime harder and hotter for an hour, once a day", () => {
    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    crackdown(c, m, LATER);
    expect(cityView(c, m, LATER).crackdown).not.toBeNull();
    expect(() => crackdown(c, m, LATER + 1000)).toThrow(/One crackdown a day/);

    const thief = mk("a", "Thief");
    const victim = mk("t", "Victim");
    victim.cash = 100;
    const calm = commitCrime(thief, victim, "pickpocket", LATER, always(0.5), { caseId: "C1", district: "X", crewTag: null, witnesses: [] });
    const thief2 = mk("a2", "Thief2");
    const victim2 = mk("t2", "Victim2");
    victim2.cash = 100;
    const hot = commitCrime(thief2, victim2, "pickpocket", LATER, always(0.5), { caseId: "C2", district: "X", crewTag: null, witnesses: [], crackdown: true });
    // Same roll, same stats: the crackdown turns a success into getting caught, or adds heat and a bystander.
    if (calm.caseFile && hot.caseFile) expect(hot.caseFile.tips.length).toBeGreaterThan(calm.caseFile.tips.length);
    else expect(hot.caseFile).toBeNull();
    expect(thief2.heat).toBeGreaterThan(thief.heat);
  });

  it("pardons one prisoner per term, never someone awaiting trial", () => {
    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    const con = mk("c", "Con");
    con.jailUntil = LATER + 600_000;
    const held = mk("h", "Held");
    held.custodyCase = "X";
    expect(() => pardon(c, m, held, LATER)).toThrow(/tried yet/);
    pardon(c, m, con, LATER);
    expect(inJail(con, LATER + 1)).toBe(false);
    const con2 = mk("c2", "Con2");
    con2.jailUntil = LATER + 600_000;
    expect(() => pardon(c, m, con2, LATER)).toThrow(/One pardon/);
  });

  it("funds police bounties and draws a daily salary from the treasury", () => {
    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    c.treasury = 100;
    setBounty(c, m, 50, LATER);
    expect(c.policeBounty).toBe(50);
    collectSalary(c, m, LATER);
    expect(m.cash).toBe(100); // salary capped by the treasury
    expect(c.treasury).toBe(0);
    expect(() => collectSalary(c, m, LATER + 1000)).toThrow(/once a day/);
  });

  it("appoints a police chief who can order crackdowns and draws a salary", () => {
    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    c.treasury = 500;
    const rookie = mk("r", "Rookie");
    rookie.path = "police" as PathId;
    rookie.rank = 2;
    expect(() => appointChief(c, m, rookie, LATER)).toThrow(/Detective/);
    const det = mk("d", "Dana");
    det.path = "police" as PathId;
    det.rank = 4;
    appointChief(c, m, det, LATER);
    expect(det.inbox![0].text).toMatch(/police chief/);
    crackdown(c, det, LATER);
    expect(c.crackdownUntil).toBeGreaterThan(LATER);
    chiefSalary(c, det, LATER);
    expect(det.cash).toBe(B.chiefSalary);
    expect(() => crackdown(c, mk("x", "Random"), LATER + B.crackdownCooldownMs)).toThrow(/mayor or the police chief/);
    dismissChief(c, m, LATER);
    expect(c.chief).toBeNull();
  });

  it("funds a soup kitchen that feeds people with nothing, once every few hours", () => {
    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    c.treasury = 100;
    fundSoup(c, m, 50, LATER);
    expect(c.soupMeals).toBe(50 / B.mealCost);
    expect(c.treasury).toBe(50);
    const bum = mk("b", "Bum");
    bum.energy = 0;
    eatSoup(c, bum, LATER);
    expect(bum.energy).toBe(B.mealEnergy);
    expect(() => eatSoup(c, bum, LATER + 1000)).toThrow(/already ate/);
    const rich = mk("r", "Rich");
    rich.cash = 500;
    expect(() => eatSoup(c, rich, LATER)).toThrow(/nothing/);
  });

  it("skimming is invisible until internal affairs audits the mayor", () => {
    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    c.treasury = 1000;
    skim(c, m, 400, LATER);
    expect(m.cash).toBe(400);
    expect(JSON.stringify(cityView(c, mk("x", "Citizen"), LATER))).not.toMatch(/skim|400/);
    const ia: Player = mk("i", "Ines");
    ia.path = "police" as PathId;
    ia.rank = BALANCE.racket.audit.minRank;
    const out = audit(ia, m, [], LATER, c);
    expect(out.cityChanged).toBe(true);
    expect(c.mayor).toBeNull();
    expect(c.skims[0].exposed).toBe(true);
    expect(c.treasury).toBe(1000);
    expect(inJail(m, LATER + 1)).toBe(true);
    expect(c.log[0].text).toMatch(/skimming/);
  });
});

describe("witness protection", () => {
  it("the mayor or chief protects a case's witnesses; the Mafia can't lean on them", async () => {
    const { reportSighting } = await import("./crime");
    const { intimidateBlock } = await import("./racket");
    const { protectWitnesses } = await import("./city");
    const boss = mk("a", "Novak Petresk");
    boss.path = "enforcer" as PathId;
    boss.rank = 4;
    const victim = mk("t", "Victor");
    victim.cash = 200;
    const witness = mk("w", "Wanda");
    const cf = commitCrime(boss, victim, "snatch", LATER, always(0), { caseId: "C1", district: "X", crewTag: null, witnesses: [witness] }).caseFile!;
    reportSighting(witness, cf, boss, LATER, always(0));
    expect(intimidateBlock(boss, cf, LATER)).toBeNull();

    const m = mk("m", "Mayor");
    const c = cityWithMayor(m);
    expect(() => protectWitnesses(c, m, cf, LATER)).toThrow(/treasury/);
    c.treasury = 100;
    expect(() => protectWitnesses(c, mk("x", "Random"), cf, LATER)).toThrow(/mayor or the police chief/);
    protectWitnesses(c, m, cf, LATER);
    expect(c.treasury).toBe(100 - B.protectionCost);
    expect(intimidateBlock(boss, cf, LATER)).toMatch(/police protection/);
    expect(() => protectWitnesses(c, m, cf, LATER)).toThrow(/already/);
  });
});
