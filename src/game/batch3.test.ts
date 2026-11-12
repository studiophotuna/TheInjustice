import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { backAlleyTreat, hireLawyer, retainerFee, searchHome, setBackAlley } from "./batch3";
import { addTip, commitCrime } from "./crime";
import { createPlayer, inHospital, tick } from "./engine";
import { arrest, lawyerPower } from "./justice";
import { audit } from "./racket";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const career = (p: Player, path: Player["path"], rank: number) => {
  p.path = path;
  p.rank = rank;
  return p;
};

function scene() {
  const thief = mk("a", "Novak Petresk");
  const victim = mk("t", "Victor");
  victim.cash = 200;
  const c = commitCrime(thief, victim, "snatch", LATER, always(0), { caseId: "C1", district: "X", crewTag: null, witnesses: [] }).caseFile!;
  c.tips = [];
  for (let i = 0; i < 3; i++) addTip(c, "witness", 1, LATER, always(i / 6));
  const det = career(mk("d", "Dana"), "police", 4);
  return { thief, victim, c, det };
}

describe("search warrants", () => {
  it("searching the real criminal turns up the goods and makes the case airtight", () => {
    const { thief, victim, c, det } = scene();
    searchHome(det, thief, c, [{ player: victim, crewTag: null }], null, LATER, always(0.5));
    expect(c.searches?.[0].found).toBe(true);
    expect(() => searchHome(det, thief, c, [], null, LATER, always(0.5))).toThrow(/already searched/);
    arrest(det, thief, c, [], null, LATER);
    expect(c.trial?.evidence).toBe(1);
  });

  it("no warrant for someone who doesn't fit; an innocent search costs the detective", () => {
    const { c, det } = scene();
    const other = mk("o", "Bo");
    other.stats.strength = other.stats.toughness = 900;
    expect(() => searchHome(det, other, c, [], null, LATER, always(0.5))).toThrow(/warrant/);
    const lookalike = mk("y", "Ivan Petresk");
    det.reputation = 5;
    c.tips = c.tips.filter((t) => t.trait !== "nameStart");
    searchHome(det, lookalike, c, [], null, LATER, always(0.5));
    expect(c.searches?.[0].found).toBe(false);
    expect(det.reputation).toBe(4);
  });
});

describe("lawyers on retainer", () => {
  it("a retained lawyer takes the defense automatically at the arrest", () => {
    const { thief, c, det } = scene();
    const lawyer = career(mk("l", "Saul"), "courts", 4);
    thief.hasBankAccount = true;
    thief.bank = 3000;
    hireLawyer(thief, lawyer, LATER, lawyerPower(lawyer));
    expect(thief.bank).toBe(3000 - retainerFee(lawyer));
    expect(lawyer.cash).toBe(retainerFee(lawyer));
    arrest(det, thief, c, [], null, LATER);
    expect(c.trial?.defender?.name).toBe("Saul");
  });
});

describe("doctors' black market", () => {
  it("patients pay cash to walk out; internal affairs can find the doctor's ledger", () => {
    const doc = career(mk("d", "Mercy"), "medicine", 4);
    setBackAlley(doc, true);
    const patient = mk("p", "Patient");
    patient.hospitalUntil = LATER + 600_000;
    patient.cash = 500;
    backAlleyTreat(patient, doc, LATER);
    expect(inHospital(patient, LATER + 1)).toBe(false);
    expect(doc.dirty ?? 0).toBeGreaterThan(0);
    const ia = career(mk("i", "Ines"), "police", BALANCE.racket.audit.minRank);
    const out = audit(ia, doc, [], LATER);
    expect(out.events[0].text).toMatch(/back-alley/);
    expect(doc.backAlley).toBe(false);
    expect(doc.rank).toBe(3);
  });
});
