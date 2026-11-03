import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { reviewDeposit, fileDeposit } from "./casework";
import { addTip, caseOpen, commitCrime, reportSighting } from "./crime";
import { createPlayer, inJail, tick } from "./engine";
import { arrest, decideTrial, offerBribe } from "./justice";
import { answerPayoff, audit, auditBlock, intimidate, myCaseView, offerPayoff, withdrawPayoff } from "./racket";
import type { PathId, Player } from "./types";

const T0 = 1_700_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;

const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const career = (p: Player, path: PathId, rank: number) => {
  p.path = path;
  p.rank = rank;
  return p;
};

/** A Capo robs Victor; Wanda saw it and reports. */
function scene() {
  const boss = career(mk("a", "Novak Petresk"), "enforcer", 4);
  const victim = mk("t", "Victor");
  victim.cash = 200;
  const wanda = mk("w", "Wanda");
  const c = commitCrime(boss, victim, "snatch", LATER, always(0), { caseId: "C1", district: "Southside", crewTag: null, witnesses: [wanda] }).caseFile!;
  reportSighting(wanda, c, boss, LATER + 1000, always(0));
  return { boss, victim, wanda, c };
}

describe("intimidating witnesses", () => {
  it("a scared witness takes back their statement; the criminal never learns who", () => {
    const { boss, wanda, c } = scene();
    expect(c.tips.some((t) => t.source === "witness")).toBe(true);
    const events = intimidate(boss, c, [wanda], LATER, always(0));
    expect(c.tips.some((t) => t.source === "witness")).toBe(false);
    expect(wanda.inbox![0].text).toMatch(/dead rat/);
    expect(JSON.stringify(events)).not.toMatch(/Wanda/);
    expect(() => intimidate(boss, c, [wanda], LATER, always(0))).toThrow(/already/);
  });

  it("a brave witness tells the police even more", () => {
    const { boss, wanda, c } = scene();
    const n = c.tips.length;
    intimidate(boss, c, [wanda], LATER, always(0.99));
    expect(c.tips).toHaveLength(n + 1);
    expect(c.tips.at(-1)!.text).toMatch(/Threatened witness/);
    expect(wanda.reputation).toBe(2);
  });

  it("only the Mafia, only their own case, only before an arrest", () => {
    const { boss, wanda, c } = scene();
    const thug = mk("x", "Random");
    expect(() => intimidate(thug, c, [wanda], LATER, always(0))).toThrow(/Mafia/);
    const det = career(mk("d", "Dana"), "police", 4);
    addTip(c, "detective", 1, LATER, always(0.5));
    arrest(det, boss, c, [], null, LATER);
    expect(() => intimidate(boss, c, [wanda], LATER, always(0))).toThrow(/court/);
  });

  it("the criminal sees their own jobs and how many people talked", () => {
    const { boss, c } = scene();
    const v = myCaseView(c, boss.myCases![0], boss, LATER);
    expect(v.status).toBe("open");
    expect(v.statements).toBe(1);
    expect(v.canIntimidate).toBeNull();
    expect(JSON.stringify(v)).not.toMatch(/Wanda/);
  });
});

describe("paying off a cop", () => {
  it("the cop takes it: the file is lost and nobody can work it", () => {
    const { boss, victim, c } = scene();
    boss.cash = 300;
    const cop = career(mk("c", "Bent"), "police", 2);
    offerPayoff(boss, c, cop, 150, LATER);
    expect(boss.cash + (boss.dirty ?? 0)).toBe(320 - 150);
    answerPayoff(cop, c, boss, victim, true, LATER, always(0));
    expect(cop.dirty).toBe(150);
    expect(caseOpen(c, LATER)).toBe(false);
    expect(victim.inbox![0].text).toMatch(/lost/);
    expect(myCaseView(c, boss.myCases![0], boss, LATER).status).toBe("file lost");
  });

  it("the cop refuses: money back, and a solid clue about who tried", () => {
    const { boss, c } = scene();
    boss.cash = 300;
    const cop = career(mk("c", "Clean"), "police", 2);
    offerPayoff(boss, c, cop, 150, LATER);
    const n = c.tips.length;
    answerPayoff(cop, c, boss, null, false, LATER, always(0));
    expect(boss.cash + (boss.dirty ?? 0)).toBe(320);
    expect(c.tips).toHaveLength(n + 1);
    expect(c.tips.at(-1)!.correct).toBe(true);
    expect(() => offerPayoff(boss, c, cop, 150, LATER)).toThrow(/Word got around/);
  });

  it("needs a Capo, a real officer and enough money; can be withdrawn", () => {
    const { boss, c } = scene();
    const cop = career(mk("c", "Cop"), "police", 2);
    expect(() => offerPayoff(career(mk("s", "Soldier"), "enforcer", 2), c, cop, 150, LATER)).toThrow(/Capo/);
    expect(() => offerPayoff(boss, c, mk("n", "Nobody"), 150, LATER)).toThrow(/can't make a file disappear/);
    boss.cash = 50;
    boss.dirty = 0;
    expect(() => offerPayoff(boss, c, cop, 150, LATER)).toThrow(/don't have/);
    boss.cash = 200;
    offerPayoff(boss, c, cop, 150, LATER);
    withdrawPayoff(boss, c);
    expect(boss.cash + (boss.dirty ?? 0)).toBe(200);
  });
});

describe("internal affairs", () => {
  const ia = () => career(mk("i", "Ines"), "police", BALANCE.racket.audit.minRank);

  it("catches a cop who lost a file: fine, demotion, held", () => {
    const { boss, c } = scene();
    boss.cash = 300;
    const cop = career(mk("c", "Bent"), "police", 3);
    offerPayoff(boss, c, cop, 150, LATER);
    answerPayoff(cop, c, boss, null, true, LATER, always(0));
    const investigator = ia();
    const out = audit(investigator, cop, [c], LATER);
    expect(out.changed).toHaveLength(1);
    expect(cop.cash).toBe(0); // fined 2× (capped at what they have)
    expect(cop.rank).toBe(2);
    expect(inJail(cop, LATER + 1)).toBe(true);
    expect(c.exposed?.[0].name).toBe("Bent");
    expect(investigator.reputation).toBe(5);
    // Already exposed: a second audit (after the cooldown) finds nothing new.
    const again = audit(ia(), cop, [c], LATER);
    expect(again.changed).toHaveLength(0);
  });

  it("catches a judge who took an envelope and a banker who buried a deposit", () => {
    const { boss, victim, c } = scene();
    boss.bank = 500;
    const det = career(mk("d", "Dana"), "police", 4);
    addTip(c, "detective", 1, LATER, always(0.5));
    arrest(det, boss, c, [], null, LATER);
    offerBribe(boss, c, 100);
    const judge = career(mk("j", "Ruth"), "courts", BALANCE.justice.judgeRank);
    decideTrial(c, { suspect: boss, victim, officer: det, prosecutor: null, defender: null, culprit: boss }, { judge, takeBribe: true }, LATER, always(0));
    expect(audit(ia(), judge, [c], LATER).changed).toHaveLength(1);
    expect(judge.rank).toBe(BALANCE.justice.judgeRank - 1);

    const s = scene();
    s.boss.hasBankAccount = true;
    fileDeposit(s.c, s.boss, { amount: 80, at: LATER });
    const banker = career(mk("b", "Quell"), "banking", 3);
    reviewDeposit(banker, s.c, s.boss, "bury", LATER, always(0));
    expect(audit(ia(), banker, [s.c], LATER).changed).toHaveLength(1);
  });

  it("clean officials come out with a little extra reputation", () => {
    const { c } = scene();
    const cop = career(mk("c", "Clean"), "police", 3);
    const out = audit(ia(), cop, [c], LATER);
    expect(out.changed).toHaveLength(0);
    expect(cop.reputation).toBe(1);
    expect(inJail(cop, LATER)).toBe(false);
  });

  it("needs a Sergeant, an official target and respects the cooldown", () => {
    const cop = career(mk("c", "Cop"), "police", 3);
    expect(auditBlock(career(mk("p", "Patrol"), "police", 2), cop, LATER)).toMatch(/internal affairs/);
    expect(auditBlock(ia(), mk("n", "Nobody"), LATER)).toMatch(/not an official/);
    const investigator = ia();
    audit(investigator, cop, [], LATER);
    expect(auditBlock(investigator, cop, LATER + 1000)).toMatch(/recently/);
  });
});
