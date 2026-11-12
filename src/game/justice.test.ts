import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { addTip, commitCrime, crimeBlock } from "./crime";
import { applyAction, createPlayer, inJail, tick } from "./engine";
import { arrest, decideTrial, joinTrial, offerBribe, trialStrength, trialView, type TrialParties } from "./justice";
import type { CaseFile, Player } from "./types";
import { toView } from "./view";

const T0 = 1_700_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;

const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const career = (p: Player, path: "police" | "courts", rank: number) => {
  p.path = path;
  p.rank = rank;
  return p;
};

/** A snatch with three correct clues, a detective and an innocent bystander who looks different. */
function scene() {
  const thief = mk("a", "Novak Petresk");
  const victim = mk("t", "Victor");
  victim.cash = 200;
  const c = commitCrime(thief, victim, "snatch", LATER, always(0), { caseId: "C1", district: "Southside", crewTag: null, witnesses: [] }).caseFile!;
  c.tips = [];
  for (let i = 0; i < 3; i++) addTip(c, "witness", 1, LATER, always(i / 6));
  const det = career(mk("d", "Dana"), "police", BALANCE.crime.detectiveRank);
  const other = mk("x", "Bo");
  other.stats.strength = 900;
  other.stats.toughness = 900;
  const pool = (exclude: Player) => [thief, victim, other].filter((p) => p.id !== exclude.id).map((player) => ({ player, crewTag: null }));
  return { thief, victim, c, det, other, pool };
}

const parties = (c: CaseFile, all: Player[]): TrialParties => {
  const get = (id?: string) => all.find((p) => p.id === id) ?? null;
  return {
    suspect: get(c.trial!.suspectId),
    victim: get(c.victimId),
    officer: get(c.trial!.officerId),
    prosecutor: get(c.trial!.prosecutor?.id),
    defender: get(c.trial!.defender?.id),
    culprit: get(c.culpritId),
  };
};

describe("arrests", () => {
  it("a detective arrests someone who fits; they're held for trial", () => {
    const { thief, c, det, pool } = scene();
    arrest(det, thief, c, pool(thief), null, LATER);
    expect(c.trial?.suspectId).toBe("a");
    expect(c.trial?.evidence).toBe(1);
    expect(inJail(thief, LATER)).toBe(true);
    expect(thief.inbox![0].text).toMatch(/arrested you/);
    // In custody: no jobs, no crimes.
    expect(() => applyAction(thief, { type: "job", jobId: "cans" }, LATER, always(0))).toThrow(/held for trial/);
    expect(crimeBlock(thief, mk("z", "Zed"), "snatch", LATER)).toMatch(/cell/);
    expect(toView(thief, LATER).jail?.custodyCase).toBe("C1");
  });

  it("can't arrest someone who doesn't fit, or with too few clues, or twice", () => {
    const { thief, other, c, det, pool } = scene();
    expect(() => arrest(det, other, c, pool(other), null, LATER)).toThrow(/don't fit/);
    const patrol = career(mk("p", "Pat"), "police", 2);
    expect(() => arrest(patrol, thief, c, pool(thief), null, LATER)).toThrow(/detectives/);
    arrest(det, thief, c, pool(thief), null, LATER);
    expect(() => arrest(det, thief, c, pool(thief), null, LATER)).toThrow(/already/);
    const { thief: t2, c: c2, det: d2, pool: p2 } = scene();
    c2.tips = c2.tips.slice(0, 1);
    expect(() => arrest(d2, t2, c2, p2(t2), null, LATER)).toThrow(/two clues/);
  });
});

describe("trials", () => {
  it("lawyers join opposite sides and change the case strength", () => {
    const { thief, c, det, pool } = scene();
    arrest(det, thief, c, pool(thief), null, LATER);
    const base = trialStrength(c.trial!);
    const pros = career(mk("l1", "Prosecutor"), "courts", 6);
    const def = career(mk("l2", "Defender"), "courts", 2);
    joinTrial(pros, c, "prosecutor", thief, LATER);
    expect(trialStrength(c.trial!)).toBeGreaterThan(base);
    joinTrial(def, c, "defender", thief, LATER);
    expect(thief.inbox![0].text).toMatch(/Defender took your case/);
    expect(() => joinTrial(def, c, "prosecutor", thief, LATER)).toThrow(/already/);
    expect(() => joinTrial(career(mk("s", "Student"), "courts", 1), c, "defender", thief, LATER)).toThrow(/attorneys/);
  });

  it("guilty: jail time, the victim is paid back, the officer gains reputation", () => {
    const { thief, victim, c, det, pool } = scene();
    arrest(det, thief, c, pool(thief), null, LATER);
    const judge = career(mk("j", "Judge Ruth"), "courts", BALANCE.justice.judgeRank);
    decideTrial(c, parties(c, [thief, victim, det]), { judge, verdict: "guilty" }, LATER + 1000, always(0));
    expect(c.trial!.verdict).toBe("guilty");
    expect(thief.custodyCase).toBeNull();
    expect(thief.jailUntil).toBe(LATER + 1000 + BALANCE.justice.sentenceMs.snatch);
    expect(thief.dirty).toBe(0); // restitution comes out of the dirty loot first
    expect(victim.bank).toBe(20);
    expect(det.reputation).toBe(3);
    expect(inJail(thief, LATER + 2000)).toBe(true);
    const out = LATER + 1000 + BALANCE.justice.sentenceMs.snatch + 1;
    tick(thief, out);
    expect(inJail(thief, out)).toBe(false);
  });

  it("the duty judge decides when no player judge rules, by case strength", () => {
    const { thief, victim, c, det, pool } = scene();
    arrest(det, thief, c, pool(thief), null, LATER);
    decideTrial(c, parties(c, [thief, victim, det]), { judge: null }, c.trial!.deadline, always(0.99));
    expect(c.trial!.verdict).toBe("not_guilty");
    expect(c.trial!.decidedBy).toBe("the duty judge");
    expect(inJail(thief, c.trial!.deadline + 1)).toBe(false);
    expect(victim.inbox![0].text).toMatch(/not guilty/);
  });

  it("convicting the wrong person tells only the real criminal", () => {
    const { thief, victim, c, det } = scene();
    const lookalike = mk("y", "Ivan Petresk");
    c.tips = c.tips.filter((x) => x.trait !== "nameStart");
    arrest(det, lookalike, c, [thief, victim].map((player) => ({ player, crewTag: null })), null, LATER);
    const judge = career(mk("j", "Judge Ruth"), "courts", BALANCE.justice.judgeRank);
    decideTrial(c, parties(c, [thief, victim, det, lookalike]), { judge, verdict: "guilty" }, LATER, always(0));
    expect(thief.inbox![0].text).toMatch(/Someone else is doing your time/);
    expect(JSON.stringify(trialView(c, judge, LATER))).not.toMatch(/Novak|bribed/);
  });

  it("bribes: the envelope comes back unless the judge takes it", () => {
    const { thief, victim, c, det, pool } = scene();
    thief.bank = 500;
    arrest(det, thief, c, pool(thief), null, LATER);
    offerBribe(thief, c, 200);
    // Dirty money first ($20 of loot), then the bank.
    expect(thief.dirty).toBe(0);
    expect(thief.bank).toBe(320);
    const judge = career(mk("j", "Judge Ruth"), "courts", BALANCE.justice.judgeRank);
    expect(trialView(c, judge, LATER).envelope).toBe(200);
    expect(trialView(c, det, LATER).envelope).toBe(0);
    decideTrial(c, parties(c, [thief, victim, det]), { judge, takeBribe: true }, LATER, always(0));
    expect(c.trial!.verdict).toBe("not_guilty");
    expect(c.trial!.bribed).toBe(true);
    expect(judge.dirty).toBe(200);
    expect(judge.stats.integrity).toBeLessThan(0);

    const s2 = scene();
    s2.thief.bank = 500;
    arrest(s2.det, s2.thief, s2.c, s2.pool(s2.thief), null, LATER);
    offerBribe(s2.thief, s2.c, 200);
    decideTrial(s2.c, parties(s2.c, [s2.thief, s2.victim, s2.det]), { judge: null }, s2.c.trial!.deadline, always(0));
    expect(s2.c.trial!.verdict).toBe("guilty");
    // The envelope comes back as dirty cash ($200); restitution takes $20 of it. Then the court's
    // fine ($250 minimum) comes out of savings.
    expect(s2.c.trial!.fine).toBe(250);
    expect(s2.thief.bank).toBe(320 - 250);
    expect(s2.thief.dirty).toBe(180);
  });

  it("judges can't rule on their own cases", () => {
    const { thief, victim, c, det, pool } = scene();
    arrest(det, thief, c, pool(thief), null, LATER);
    const judge = career(mk("j", "Judge Ruth"), "courts", BALANCE.justice.judgeRank);
    joinTrial(judge, c, "defender", thief, LATER);
    expect(() => decideTrial(c, parties(c, [thief, victim, det, judge]), { judge, verdict: "not_guilty" }, LATER, always(0))).toThrow(/Recuse/);
  });
});
