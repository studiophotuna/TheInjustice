import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import {
  addTip,
  caseView,
  commitCrime,
  crimeBlock,
  ignoreSighting,
  investigate,
  reportSighting,
  suspectProfile,
  suspectsFor,
} from "./crime";
import { createPlayer, tick } from "./engine";
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

function setup(witnessCount = 2) {
  const a = mk("a", "Novak Petresk");
  const t = mk("t", "Target");
  t.cash = 200;
  const witnesses = Array.from({ length: witnessCount }, (_, i) => mk(`w${i}`, `Witness${i}`));
  return { a, t, witnesses };
}

const ctx = (witnesses: Player[]) => ({ caseId: "C1", district: "Southside", crewTag: null, witnesses });

describe("street crime", () => {
  it("a successful snatch takes cash, opens an anonymous case and asks witnesses", () => {
    const { a, t, witnesses } = setup();
    const out = commitCrime(a, t, "snatch", LATER, always(0), ctx(witnesses));
    expect(out.caseFile).not.toBeNull();
    expect(a.cash).toBe(20); // 10% at the low end of the range
    expect(t.cash).toBe(180);
    // The victim is told a case exists but not who did it.
    expect(t.inbox![0].text).toMatch(/case #C1/);
    expect(t.inbox![0].fromName).toBeUndefined();
    expect(t.inbox![0].text).not.toMatch(/Novak/);
    for (const w of witnesses) expect(w.sightings?.[0].caseId).toBe("C1");
    // The victim saw something; two player witnesses mean no stand-in bystanders.
    expect(out.caseFile!.tips.map((x) => x.source)).toEqual(["victim"]);
  });

  it("bystanders fill in when the streets are empty", () => {
    const { a, t } = setup(0);
    const out = commitCrime(a, t, "pickpocket", LATER, always(0), ctx([]));
    expect(out.caseFile!.tips.filter((x) => x.source === "bystander")).toHaveLength(BALANCE.crime.minWitnesses);
  });

  it("getting caught reveals your name to the victim and opens no case", () => {
    const { a, t, witnesses } = setup();
    const out = commitCrime(a, t, "pickpocket", LATER, always(0.99), ctx(witnesses));
    expect(out.caseFile).toBeNull();
    expect(t.inbox![0].text).toMatch(/Novak Petresk/);
    expect(witnesses[0].sightings ?? []).toHaveLength(0);
  });

  it("is blocked against newcomers and repeat targets", () => {
    const a = mk("a", "Ace");
    const fresh = createPlayer("n", "New", LATER);
    expect(crimeBlock(a, fresh, "snatch", LATER)).toMatch(/new in town/);
    const { t, witnesses } = setup();
    commitCrime(a, t, "snatch", LATER, always(0), ctx(witnesses));
    expect(crimeBlock(a, t, "snatch", LATER + 1000)).toMatch(/recognize/);
  });

  it("the police view never leaks the culprit or tip accuracy", () => {
    const { a, t, witnesses } = setup();
    const c = commitCrime(a, t, "snatch", LATER, always(0), ctx(witnesses)).caseFile!;
    const json = JSON.stringify(caseView(c, a, LATER));
    expect(json).not.toMatch(/culprit|"correct"|suspect"|"a"/);
  });
});

describe("witness reports", () => {
  it("reporting adds a tip, rewards the witness and warns the culprit anonymously", () => {
    const { a, t, witnesses } = setup(1);
    const c = commitCrime(a, t, "snatch", LATER, always(0), ctx(witnesses)).caseFile!;
    const w = witnesses[0];
    const before = c.tips.length;
    reportSighting(w, c, a, LATER + 1000, always(0));
    expect(c.tips).toHaveLength(before + 1);
    expect(c.tips.at(-1)!.source).toBe("witness");
    expect(w.sightings).toHaveLength(0);
    expect(w.reputation).toBe(BALANCE.crime.reportRep);
    expect(a.inbox![0].text).toMatch(/someone talked/);
    expect(a.inbox![0].text).not.toMatch(/Witness0/);
    expect(() => reportSighting(w, c, a, LATER + 2000, always(0))).toThrow(/too late/);
  });

  it("tips cover new traits first and can be wrong", () => {
    const { a, t } = setup(0);
    const c = commitCrime(a, t, "pickpocket", LATER, always(0), ctx([])).caseFile!;
    const traits = c.tips.map((x) => x.trait);
    expect(new Set(traits).size).toBe(traits.length);
    const wrong = addTip(c, "witness", 0, LATER, always(0.5));
    expect(wrong.correct).toBe(false);
    expect(wrong.value).not.toBe(c.suspect[wrong.trait]);
  });

  it("looking away just clears the sighting", () => {
    const { a, t, witnesses } = setup(1);
    commitCrime(a, t, "snatch", LATER, always(0), ctx(witnesses));
    expect(toView(witnesses[0], LATER).sightings).toHaveLength(1);
    ignoreSighting(witnesses[0], "C1");
    expect(toView(witnesses[0], LATER).sightings).toHaveLength(0);
  });

  it("sightings expire", () => {
    const { a, t, witnesses } = setup(1);
    commitCrime(a, t, "snatch", LATER, always(0), ctx(witnesses));
    expect(toView(witnesses[0], LATER + BALANCE.crime.sightingMs + 1).sightings).toHaveLength(0);
  });
});

describe("police case work", () => {
  const detective = () => {
    const d = mk("d", "Detective");
    d.path = "police";
    d.rank = BALANCE.crime.detectiveRank;
    return d;
  };

  it("detectives add one reliable clue per case", () => {
    const { a, t } = setup(0);
    const c = commitCrime(a, t, "snatch", LATER, always(0), ctx([])).caseFile!;
    const d = detective();
    const n = c.tips.length;
    investigate(d, c, LATER, always(0));
    expect(c.tips).toHaveLength(n + 1);
    expect(c.tips.at(-1)!.correct).toBe(true);
    expect(() => investigate(d, c, LATER, always(0))).toThrow(/already/);
  });

  it("patrol officers can't work scenes; cold cases can't be worked", () => {
    const { a, t } = setup(0);
    const c = commitCrime(a, t, "snatch", LATER, always(0), ctx([])).caseFile!;
    const cop = mk("c", "Cop");
    cop.path = "police";
    cop.rank = 2;
    expect(() => investigate(cop, c, LATER, always(0))).toThrow(/detectives/);
    expect(() => investigate(detective(), c, LATER + BALANCE.crime.coldMs + 1, always(0))).toThrow(/cold/);
  });

  it("correct tips narrow the suspects down to the culprit", () => {
    const { a, t } = setup(0);
    const c: CaseFile = commitCrime(a, t, "snatch", LATER, always(0), ctx([])).caseFile!;
    c.tips = [];
    for (let i = 0; i < 4; i++) addTip(c, "detective", 1, LATER, always(i / 6));
    const decoy = mk("x", "Bob");
    decoy.stats.strength = 900;
    const list = suspectsFor(c, [a, t, decoy].map((player) => ({ player, crewTag: null })));
    expect(list[0].name).toBe("Novak Petresk");
    expect(list.some((s) => s.name === "Target")).toBe(false);
    expect(suspectProfile(a, null).nameEnd).toBe("esk");
  });
});
