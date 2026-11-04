import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { examine, fileDeposit, hunt, reviewDeposit } from "./casework";
import { addTip, commitCrime } from "./crime";
import { applyAction, createPlayer, tick } from "./engine";
import { arrest } from "./justice";
import type { CaseFile, CrimeKind, PathId, Player, StreetCrime } from "./types";

const T0 = 1_700_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const COLD = LATER + BALANCE.crime.coldMs + 1;
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

function crime(kind: StreetCrime = "snatch") {
  const thief = mk("a", "Novak Petresk");
  const victim = mk("t", "Victor");
  victim.cash = 200;
  const c = commitCrime(thief, victim, kind, LATER, always(0), { caseId: "C1", district: "Southside", crewTag: null, witnesses: [] }).caseFile!;
  return { thief, victim, c };
}

describe("doctors", () => {
  it("examine the victim once for a reliable physical clue and a fee", () => {
    const { victim, c } = crime();
    const doc = career(mk("d", "Mercy"), "medicine", 4);
    const n = c.tips.length;
    examine(doc, c, victim, LATER, always(0));
    const tip = c.tips.at(-1)!;
    expect(c.tips).toHaveLength(n + 1);
    expect(tip.source).toBe("doctor");
    expect(["build", "reflexes"]).toContain(tip.trait);
    expect(tip.correct).toBe(true);
    expect(doc.cash).toBe(BALANCE.casework.clinic.fee + 4 * BALANCE.casework.clinic.feePerRank);
    expect(victim.inbox![0].text).toMatch(/examined your injuries/);
    expect(() => examine(career(mk("e", "Other"), "medicine", 4), c, victim, LATER, always(0))).toThrow(/already examined/);
  });

  it("pickpockets leave no marks; students can't examine", () => {
    const { victim, c } = crime("pickpocket");
    expect(() => examine(career(mk("d", "Mercy"), "medicine", 4), c, victim, LATER, always(0))).toThrow(/no marks/);
    const s = crime();
    expect(() => examine(career(mk("d", "Student"), "medicine", 1), s.c, s.victim, LATER, always(0))).toThrow(/Only doctors/);
  });

  it("speeds up a hospitalized victim's recovery", () => {
    const { victim, c } = crime("mug");
    victim.hospitalUntil = LATER + 600_000;
    examine(career(mk("d", "Mercy"), "medicine", 4), c, victim, LATER, always(0));
    expect(victim.hospitalUntil).toBe(LATER + 300_000);
  });
});

describe("bankers", () => {
  const depositAfterCrime = () => {
    const s = crime();
    s.thief.hasBankAccount = true;
    s.thief.cash = 100;
    applyAction(s.thief, { type: "bank", op: "deposit", amount: 60 }, LATER + 60_000, always(0));
    return s;
  };

  it("a big deposit right after a crime gets flagged and filed on the case", () => {
    const { thief, c } = depositAfterCrime();
    expect(thief.pendingDeposit).toMatchObject({ caseId: "C1", amount: 60 });
    expect(fileDeposit(c, thief, thief.pendingDeposit!)).toBe(true);
    expect(c.deposit?.account).toMatch(/^\d{4}-\d{2}$/);
    expect(JSON.stringify(c.deposit)).not.toMatch(/Novak/);
  });

  it("small or late deposits aren't flagged", () => {
    const s = crime();
    s.thief.hasBankAccount = true;
    s.thief.cash = 100;
    applyAction(s.thief, { type: "bank", op: "deposit", amount: 10 }, LATER + 60_000, always(0));
    expect(s.thief.pendingDeposit).toBeFalsy();
    applyAction(s.thief, { type: "bank", op: "deposit", amount: 60 }, LATER + BALANCE.casework.bank.windowMs + 1, always(0));
    expect(s.thief.pendingDeposit).toBeFalsy();
  });

  it("reporting adds a name clue from bank records", () => {
    const { thief, c } = depositAfterCrime();
    fileDeposit(c, thief, thief.pendingDeposit!);
    const banker = career(mk("b", "Quell"), "banking", 3);
    reviewDeposit(banker, c, thief, "report", LATER, always(0));
    const tip = c.tips.at(-1)!;
    expect(tip.source).toBe("bank");
    expect(["nameStart", "nameEnd", "nameLength"]).toContain(tip.trait);
    expect(tip.correct).toBe(true);
    expect(() => reviewDeposit(banker, c, thief, "bury", LATER, always(0))).toThrow(/Already/);
  });

  it("burying it costs the depositor a fee and the banker integrity", () => {
    const { thief, c } = depositAfterCrime();
    fileDeposit(c, thief, thief.pendingDeposit!);
    const banker = career(mk("b", "Quell"), "banking", 3);
    const tips = c.tips.length;
    reviewDeposit(banker, c, thief, "bury", LATER, always(0));
    expect(c.tips).toHaveLength(tips);
    expect(banker.cash).toBe(6);
    expect(thief.bank).toBe(54);
    expect(banker.stats.integrity).toBeLessThan(0);
  });
});

describe("vigilantes", () => {
  const cold = () => {
    const s = crime();
    s.c.tips = [];
    for (let i = 0; i < 3; i++) addTip(s.c, "witness", 1, LATER, always(i / 6));
    const vig = career(mk("v", "Nightjar"), "vigilante", 3);
    vig.stats.strength = 2000;
    vig.stats.toughness = 2000;
    vig.stats.agility = 2000;
    tick(vig, COLD);
    tick(s.thief, COLD);
    return { ...s, vig };
  };
  const pool = (c: CaseFile, ...ps: Player[]) => ps.map((player) => ({ player, crewTag: null }));

  it("only cold cases can be hunted", () => {
    const { thief, victim, c, vig } = cold();
    expect(() => hunt(vig, thief, victim, c, pool(c, victim), null, LATER, always(0))).toThrow(/still on it/);
  });

  it("a winning hunt pays the victim back and closes the case", () => {
    const { thief, victim, c, vig } = cold();
    const cash = thief.cash + (thief.dirty ?? 0); // dirty loot counts: it's what they carry
    hunt(vig, thief, victim, c, pool(c, victim), null, COLD, always(0));
    expect(c.hunt?.won).toBe(true);
    expect(c.hunt?.restitution).toBe(cash);
    expect(victim.cash).toBe(180 + cash);
    expect(vig.heat).toBeGreaterThan(0);
    expect(thief.inbox![0].text).toMatch(/masked vigilante/);
    expect(() => hunt(vig, thief, victim, c, pool(c, victim), null, COLD, always(0))).toThrow(/already went after/);
  });

  it("can't hunt cases that went to court", () => {
    const { thief, victim, c, vig } = cold();
    const det = career(mk("d", "Dana"), "police", BALANCE.crime.detectiveRank);
    arrest(det, thief, c, pool(c, victim), null, LATER);
    expect(() => hunt(vig, thief, victim, c, pool(c, victim), null, COLD, always(0))).toThrow(/courts/);
  });
});
