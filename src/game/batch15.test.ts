import { describe, expect, it } from "vitest";
import { AMBUSH, cancelAmbush, executeAmbush, planAmbush, sideStrength, takeRole } from "./ambush";
import { BALANCE } from "./balance";
import { newCity } from "./city";
import { applyAction, createPlayer, softCap, tick } from "./engine";
import { addMember, createCrew } from "./social";
import type { Player } from "./types";
import { addWound, playerMaxHp, setSurgeryFee, surgery, WOUNDS, woundHint, woundsOf } from "./wounds";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};
const strong = (p: Player, xp: number) => {
  for (const k of Object.keys(p.stats) as (keyof Player["stats"])[]) p.stats[k] = xp;
  return p;
};

describe("old wounds", () => {
  it("each wound lowers max health, capped at seven, and the hint never shows a number", () => {
    const p = mk("p", "Pia");
    expect(playerMaxHp(p)).toBe(100);
    addWound(p, LATER);
    expect(playerMaxHp(p)).toBe(96);
    for (let i = 0; i < 10; i++) addWound(p, LATER);
    expect(woundsOf(p)).toBe(WOUNDS.max);
    expect(playerMaxHp(p)).toBe(72);
    expect(woundHint(p)).not.toMatch(/\d/);
  });

  it("wounds fade one every three days of rest, and health is capped to the new max", () => {
    const p = mk("p", "Pia");
    for (let i = 0; i < 3; i++) addWound(p, LATER);
    p.hp = playerMaxHp(p);
    tick(p, LATER + WOUNDS.fadeMs * 2 + 1000);
    expect(woundsOf(p)).toBe(1);
  });

  it("a doctor at Resident and up sets a fee and operates, fixing two wounds", () => {
    const doc = mk("d", "Doc");
    doc.path = "medicine";
    doc.rank = 2;
    expect(() => setSurgeryFee(doc, 3000)).toThrow();
    doc.rank = 3;
    expect(() => setSurgeryFee(doc, 400)).toThrow();
    setSurgeryFee(doc, 3000);
    const pat = mk("p", "Pat");
    for (let i = 0; i < 3; i++) addWound(pat, LATER);
    pat.cash = 4000;
    const cash = doc.cash;
    surgery(pat, doc, LATER);
    expect(woundsOf(pat)).toBe(1);
    expect(pat.cash).toBe(1000);
    expect(doc.cash).toBe(cash + 3000);
    expect(() => surgery(doc, doc, LATER)).toThrow();
  });
});

describe("stat soft cap", () => {
  it("is full speed below 70 and halves every 10 points above", () => {
    expect(softCap(50)).toBe(1);
    expect(softCap(70)).toBe(1);
    expect(softCap(80)).toBeCloseTo(0.5);
    expect(softCap(90)).toBeCloseTo(0.25);
  });

  it("training gains slow down for a maxed player", () => {
    const low = mk("a", "Ann");
    const high = strong(mk("b", "Ben"), 10_000);
    const before = { low: low.stats.toughness, high: high.stats.toughness };
    for (const p of [low, high]) {
      p.energy = 100;
      p.cash = 1000;
      applyAction(p, { type: "train", stat: "toughness" }, LATER + 1, always(0.5));
    }
    const gLow = low.stats.toughness - before.low;
    const gHigh = high.stats.toughness - before.high;
    expect(gLow).toBeGreaterThan(0);
    expect(gHigh).toBeLessThan(gLow / 4);
  });
});

function setup() {
  const boss = mk("b", "Boss Bea");
  boss.path = "enforcer";
  boss.rank = 5;
  boss.cash = BALANCE.crew.createCost;
  const crew = createCrew(boss, "c", "Iron Row", "IRW", LATER);
  const m = ["Ari", "Bo", "Cy", "Dee"].map((n, i) => {
    const p = mk(`m${i}`, n);
    p.path = "enforcer";
    p.rank = 3;
    addMember(crew, p, LATER);
    return p;
  });
  const target = mk("t", "Tank Tom");
  target.cash = 900;
  return { boss, crew, m, target, city: newCity("varrow", LATER) };
}
const ctx = (extra: Partial<Parameters<typeof executeAmbush>[9]> = {}) => ({ caseId: "AMB001", crewTag: "IRW", backup: [], witnesses: [], ...extra });

describe("crew ambushes", () => {
  it("combined attackers count with diminishing weight", () => {
    const ps = [1, 2, 3].map((i) => strong(mk(`x${i}`, `X${i}`), 400));
    const one = sideStrength(ps.slice(0, 1), AMBUSH.weights);
    const three = sideStrength(ps, AMBUSH.weights);
    expect(three / one).toBeCloseTo(2.2, 1);
  });

  it("roles fill once each; attackers top out at three", () => {
    const { boss, crew, m, target } = setup();
    planAmbush(crew, boss, target, LATER);
    takeRole(crew, boss, "attacker", LATER);
    takeRole(crew, m[0], "attacker", LATER);
    takeRole(crew, m[1], "attacker", LATER);
    expect(() => takeRole(crew, m[2], "attacker", LATER)).toThrow(/Three/);
    takeRole(crew, m[2], "driver", LATER);
    expect(() => takeRole(crew, m[3], "driver", LATER)).toThrow();
    takeRole(crew, m[3], "lookout", LATER);
    expect(() => takeRole(crew, m[0], "lookout", LATER)).toThrow();
  });

  it("can't target newcomers, crewmates, or the same player twice in a day", () => {
    const { boss, crew, m, target } = setup();
    const fresh = createPlayer("n", "Newbie", LATER);
    expect(() => planAmbush(crew, boss, fresh, LATER)).toThrow(/new/);
    expect(() => planAmbush(crew, boss, m[0], LATER)).toThrow();
    target.ambushedAt = LATER - 1000;
    expect(() => planAmbush(crew, boss, target, LATER)).toThrow(/recently/);
  });

  it("a crew of five beats a much stronger lone player: hospital, wound, cash split, case, vendetta", () => {
    const { boss, crew, m, target, city } = setup();
    for (const p of [boss, ...m]) strong(p, 900);
    strong(target, 2500);
    planAmbush(crew, boss, target, LATER);
    takeRole(crew, boss, "attacker", LATER);
    takeRole(crew, m[0], "attacker", LATER);
    takeRole(crew, m[1], "attacker", LATER);
    takeRole(crew, m[2], "driver", LATER);
    takeRole(crew, m[3], "lookout", LATER);
    // Alone, any one attacker is weaker than the target.
    expect(sideStrength([boss], [1])).toBeLessThan(sideStrength([target], [1]));
    const w = mk("w", "Witness Wu");
    const backup = mk("k", "Backup Kai");
    const { caseFile } = executeAmbush(crew, boss, [boss, m[0], m[1]], m[2], m[3], target, city, LATER + 60_000, always(0.3), ctx({ witnesses: [w], backup: [backup] }));
    expect(target.hp).toBe(1);
    expect(target.hospitalUntil).toBeGreaterThan(LATER);
    expect(woundsOf(target)).toBe(1);
    expect(target.cash).toBe(0);
    expect(boss.dirty).toBe(180);
    expect(m[0].vendetta?.victimId).toBe(target.id);
    // The lookout succeeded: no witnesses and no backup.
    expect(caseFile?.kind).toBe("assault");
    expect(caseFile?.witnesses).toEqual([]);
    expect(w.sightings ?? []).toHaveLength(0);
    expect(crew.ambush).toBeNull();
    expect(() => planAmbush(crew, boss, mk("z", "Zed"), LATER + 120_000)).toThrow(/recently/);
  });

  it("without a lookout, witnesses see it and the target's crew comes to help", () => {
    const { boss, crew, m, target, city } = setup();
    strong(boss, 600);
    strong(target, 600);
    planAmbush(crew, boss, target, LATER);
    takeRole(crew, boss, "attacker", LATER);
    const w = mk("w", "Witness Wu");
    const backup = strong(mk("k", "Backup Kai"), 600);
    const hp = boss.hp;
    const { caseFile, events } = executeAmbush(crew, boss, [boss], null, null, target, city, LATER + 60_000, always(0.5), ctx({ witnesses: [w], backup: [backup] }));
    expect(caseFile).toBeNull();
    expect(boss.hp).toBe(hp - AMBUSH.failDamage);
    expect(events.some((e) => e.text.includes("Backup Kai"))).toBe(true);
    void m;
  });

  it("a driver halves the damage when it goes wrong; the leader can call it off", () => {
    const { boss, crew, m, target, city } = setup();
    strong(target, 3000);
    planAmbush(crew, boss, target, LATER);
    takeRole(crew, boss, "attacker", LATER);
    takeRole(crew, m[0], "driver", LATER);
    const hp = boss.hp;
    executeAmbush(crew, boss, [boss], m[0], null, target, city, LATER + 60_000, always(0.1), ctx());
    expect(boss.hp).toBe(hp - AMBUSH.failDamage / 2);
    expect(boss.jailUntil ?? 0).toBeLessThanOrEqual(LATER + 60_000);

    const s = setup();
    planAmbush(s.crew, s.boss, s.target, LATER);
    expect(() => cancelAmbush(s.crew, s.m[0], LATER)).toThrow();
    cancelAmbush(s.crew, s.boss, LATER);
    expect(s.crew.ambush).toBeNull();
  });
});
