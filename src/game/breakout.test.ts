import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { breakoutOdds, cancelBreakout, executeBreakout, joinBreakout, planBreakout } from "./breakout";
import { advanceCity, newCity, recallNeeded, signRecall, termEnds } from "./city";
import { addTip, commitCrime } from "./crime";
import { createPlayer, inJail, tick } from "./engine";
import { arrest, decideTrial, postBail } from "./justice";
import { createCrew, addMember } from "./social";
import type { Crew, Player } from "./types";

const T0 = Date.UTC(2026, 10, 2) + 1000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;

const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};

function crewWithPrisoner(): { crew: Crew; boss: Player; mate: Player; con: Player } {
  const boss = mk("b", "Boss");
  boss.path = "enforcer";
  boss.rank = 4;
  boss.cash = 1000 + BALANCE.crew.createCost;
  const crew = createCrew(boss, "c1", "Iron Row", "IR", LATER);
  const mate = mk("m", "Mate");
  const con = mk("k", "Con");
  addMember(crew, mate, LATER);
  addMember(crew, con, LATER);
  con.jailUntil = LATER + 30 * 60_000;
  con.jailReason = "Serving time.";
  return { crew, boss, mate, con };
}

describe("prison breaks", () => {
  it("the crew plans, joins and breaks a member out", () => {
    const { crew, boss, mate, con } = crewWithPrisoner();
    planBreakout(crew, boss, con, LATER);
    joinBreakout(crew, mate, LATER);
    expect(crew.breakout?.team.map((t) => t.name)).toEqual(["Boss", "Mate"]);
    executeBreakout(crew, boss, [boss, mate], con, LATER, always(0), false);
    expect(inJail(con, LATER + 1)).toBe(false);
    expect(boss.heat).toBeGreaterThan(0);
    expect(crew.breakout).toBeNull();
    expect(con.inbox![0].text).toMatch(/You're out/);
  });

  it("a failed break puts the team in cells and adds time to the sentence", () => {
    const { crew, boss, mate, con } = crewWithPrisoner();
    const until = con.jailUntil!;
    planBreakout(crew, boss, con, LATER);
    joinBreakout(crew, mate, LATER);
    executeBreakout(crew, boss, [boss, mate], con, LATER, always(0.99), false);
    expect(inJail(boss, LATER + 1)).toBe(true);
    expect(inJail(mate, LATER + 1)).toBe(true);
    expect(con.jailUntil).toBe(until + BALANCE.breakout.failExtraMs);
  });

  it("bigger, tougher teams have better odds; crackdowns and strict countries hurt", () => {
    const { boss, mate } = crewWithPrisoner();
    const solo = breakoutOdds([boss], "varrow", false);
    const duo = breakoutOdds([boss, mate], "varrow", false);
    expect(duo).toBeGreaterThan(solo);
    expect(breakoutOdds([boss, mate], "varrow", true)).toBeLessThan(duo);
    expect(breakoutOdds([boss, mate], "kestrova", false)).toBeLessThan(duo);
    mate.stats.nerve = mate.stats.agility = mate.stats.wits = mate.stats.strength = 400;
    expect(breakoutOdds([boss, mate], "varrow", false)).toBeGreaterThan(duo);
  });

  it("only crewmates serving a sentence; one plan at a time; planner or leader can cancel", () => {
    const { crew, boss, mate, con } = crewWithPrisoner();
    const outsider = mk("o", "Outsider");
    outsider.jailUntil = LATER + 60_000;
    expect(() => planBreakout(crew, boss, outsider, LATER)).toThrow(/not in your crew/);
    expect(() => planBreakout(crew, boss, mate, LATER)).toThrow(/not serving/);
    planBreakout(crew, mate, con, LATER);
    expect(() => planBreakout(crew, boss, con, LATER)).toThrow(/already a plan/);
    expect(() => executeBreakout(crew, boss, [boss], con, LATER, always(0), false)).toThrow(/Only the planner/);
    cancelBreakout(crew, boss, LATER); // the leader can call it off
    expect(crew.breakout).toBeNull();
  });
});

describe("bail", () => {
  it("a friend posts bail; the suspect walks; the money comes back at the verdict", () => {
    const thief = mk("a", "Novak Petresk");
    const victim = mk("t", "Victor");
    victim.cash = 200;
    const c = commitCrime(thief, victim, "snatch", LATER, always(0), { caseId: "C1", district: "X", crewTag: null, witnesses: [] }).caseFile!;
    c.tips = [];
    for (let i = 0; i < 3; i++) addTip(c, "witness", 1, LATER, always(i / 6));
    const det = mk("d", "Dana");
    det.path = "police";
    det.rank = 4;
    arrest(det, thief, c, [], null, LATER);
    const friend = mk("f", "Friend");
    friend.hasBankAccount = true;
    friend.bank = 1000;
    postBail(friend, thief, c, LATER);
    const bail = Math.max(BALANCE.bail.min, c.amount * BALANCE.bail.multiplier);
    expect(friend.bank).toBe(1000 - bail);
    expect(inJail(thief, LATER + 1)).toBe(false);
    expect(thief.onBail).toBe("C1");
    decideTrial(c, { suspect: thief, victim, officer: det, prosecutor: null, defender: null, culprit: thief, bailPayer: friend }, { judge: null }, c.trial!.deadline, always(0));
    expect(friend.bank).toBe(1000);
    expect(thief.onBail).toBeNull();
    expect(inJail(thief, c.trial!.deadline + 1)).toBe(true); // guilty: jail time still applies
  });
});

describe("recall", () => {
  it("enough signatures remove the mayor and open a special election", () => {
    const c = newCity("varrow", LATER);
    c.mayor = { id: "m", name: "Mayor", since: T0 };
    const needed = recallNeeded(c);
    for (let i = 0; i < needed - 1; i++) signRecall(c, mk(`s${i}`, `Signer${i}`), LATER);
    expect(c.mayor).not.toBeNull();
    expect(() => signRecall(c, mk("s0", "Signer0"), LATER)).toThrow(/already signed/);
    signRecall(c, mk("last", "Last"), LATER);
    expect(c.mayor).toBeNull();
    expect(c.log[0].text).toMatch(/out of office/);
    advanceCity(c, termEnds(c.term) + 1);
    expect(c.recall).toEqual([]);
  });
});
