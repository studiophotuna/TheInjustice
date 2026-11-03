import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { acceptLoan, buyVote, campaign, collectLoan, offerLoan, postContract, repayLoan, workContract } from "./batch4";
import { advanceCity, cityView, newCity, runForMayor, termEnds, vote } from "./city";
import { commitCrime } from "./crime";
import { createPlayer, tick } from "./engine";
import { audit } from "./racket";
import type { Player } from "./types";

const T0 = Date.UTC(2026, 10, 2) + 1000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const rich = (p: Player) => {
  p.hasBankAccount = true;
  p.bank = 5000;
  p.cash = 500;
  p.reputation = 30;
  return p;
};

describe("campaigns and vote buying", () => {
  it("campaign money shows on the ballot and breaks ties", () => {
    const c = newCity("varrow", LATER);
    const a = rich(mk("a", "Alma"));
    const b = rich(mk("b", "Bruno"));
    runForMayor(c, a, "", LATER);
    runForMayor(c, b, "", LATER);
    campaign(c, b, 1200, LATER);
    expect(cityView(c, mk("v", "Vic"), LATER).candidates.find((x) => x.name === "Bruno")?.buzz).toMatch(/rallies/);
    vote(c, mk("v1", "V1"), "a", LATER);
    vote(c, mk("v2", "V2"), "b", LATER);
    advanceCity(c, termEnds(c.term) + 1);
    expect(c.mayor?.name).toBe("Bruno");
  });

  it("buying votes pays the voter and gets the candidate struck off when internal affairs looks", () => {
    const c = newCity("varrow", LATER);
    const a = rich(mk("a", "Alma"));
    runForMayor(c, a, "", LATER);
    const voter = mk("v", "Vic");
    buyVote(c, a, voter, 50, LATER);
    expect(voter.cash).toBe(50);
    expect(JSON.stringify(cityView(c, voter, LATER))).not.toMatch(/voteBuys|"amount":50/);
    const ia = mk("i", "Ines");
    ia.path = "police";
    ia.rank = BALANCE.racket.audit.minRank;
    const out = audit(ia, a, [], LATER, c);
    expect(out.cityChanged).toBe(true);
    expect(c.candidates).toHaveLength(0);
    expect(c.log[0].text).toMatch(/buying votes/);
  });
});

describe("loans", () => {
  const banker = () => {
    const b = rich(mk("b", "Quell"));
    b.path = "banking";
    b.rank = 3;
    return b;
  };

  it("bankers lend at legal rates; repaying on time earns reputation", () => {
    const lender = banker();
    const borrower = mk("p", "Pat");
    expect(() => offerLoan(lender, borrower, 100, 0.5, LATER)).toThrow(/between 0% and 20%/);
    offerLoan(lender, borrower, 100, 0.1, LATER);
    acceptLoan(borrower, lender, borrower.loanOffers![0].id, LATER);
    expect(borrower.cash).toBe(100);
    expect(borrower.loans?.[0].owed).toBe(110);
    borrower.cash = 110;
    repayLoan(borrower, lender, borrower.loans![0].id, LATER + 1000);
    expect(lender.bank).toBe(5000 - 100 + 110);
    expect(borrower.reputation).toBe(1);
  });

  it("an overdue bank loan is seized from savings; a shark sends the muscle", () => {
    const lender = banker();
    const borrower = mk("p", "Pat");
    offerLoan(lender, borrower, 100, 0.2, LATER);
    acceptLoan(borrower, lender, borrower.loanOffers![0].id, LATER);
    borrower.hasBankAccount = true;
    borrower.bank = 80;
    const id = lender.loans![0].id;
    expect(() => collectLoan(lender, borrower, id, LATER, always(0.5))).toThrow(/not due/);
    collectLoan(lender, borrower, id, LATER + BALANCE.loans.termMs + 1, always(0.5));
    expect(borrower.bank).toBe(0);

    const shark = rich(mk("s", "Shark"));
    shark.path = "enforcer";
    shark.rank = 3;
    shark.stats.strength = shark.stats.toughness = shark.stats.agility = 400;
    const mark = mk("m", "Mark");
    offerLoan(shark, mark, 100, 1, LATER);
    acceptLoan(mark, shark, mark.loanOffers![0].id, LATER);
    const due = LATER + BALANCE.loans.termMs + 1;
    tick(shark, due);
    tick(mark, due);
    const out = collectLoan(shark, mark, shark.loans![0].id, due, always(0.5));
    expect(out.fight?.won).toBe(true);
    expect(mark.cash).toBe(0);
  });
});

describe("revenge contracts", () => {
  it("the victim posts a reward; a Mafia player tracks the robber down and gets the money back", () => {
    const thief = mk("a", "Novak");
    const victim = rich(mk("t", "Victor"));
    victim.cash = 200;
    const c = commitCrime(thief, victim, "snatch", LATER, always(0), { caseId: "C1", district: "X", crewTag: null, witnesses: [] }).caseFile!;
    expect(victim.robbedIn?.[0].caseId).toBe("C1");
    postContract(victim, c, 100, LATER);
    const muscle = mk("m", "Muscle");
    muscle.path = "enforcer";
    muscle.rank = 3;
    muscle.stats.strength = muscle.stats.toughness = muscle.stats.agility = muscle.stats.wits = muscle.stats.perception = 400;
    const before = victim.cash;
    workContract(muscle, c, thief, victim, LATER, always(0.1));
    expect(c.contract?.done).toBe(true);
    expect(muscle.cash).toBe(100);
    expect(victim.cash).toBe(before + c.amount);
    expect(() => workContract(mk("x", "Other"), c, thief, victim, LATER, always(0.1))).toThrow(/Mafia|done/);
  });
});
