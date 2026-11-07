import { describe, expect, it } from "vitest";
import { AGE, ageOn, oldEnough, parseBirthDate } from "./age";
import { applyAction, createPlayer } from "./engine";
import { playerFighter, resolveFight, type Fighter } from "./combat";
import { ITEM_BY_ID } from "./content/items";
import { armorBlock, gearTrait } from "./gear";

const NOW = Date.UTC(2027, 7, 15, 12);

describe("age check", () => {
  it("reads real dates only, and counts birthdays right", () => {
    expect(() => parseBirthDate("2001-02-30", NOW)).toThrow(/exist/);
    expect(() => parseBirthDate("2030-01-01", NOW)).toThrow(/future/);
    expect(() => parseBirthDate("hello", NOW)).toThrow(/date of birth/);
    expect(ageOn("2009-08-15", NOW)).toBe(18);
    expect(ageOn("2009-08-16", NOW)).toBe(17);
    expect(oldEnough("2009-08-15", NOW)).toBe(AGE.min <= 18);
  });

  it("an existing player who turns out too young is held", () => {
    const p = createPlayer("acct_kid", "Kid", NOW);
    applyAction(p, { type: "birthdate", birthDate: "2014-01-01" }, NOW, Math.random);
    expect(p.ageBlocked).toBe(true);
    const q = createPlayer("acct_adult", "Grown", NOW);
    applyAction(q, { type: "birthdate", birthDate: "1990-05-05" }, NOW, Math.random);
    expect(q.ageBlocked).toBeFalsy();
    expect(q.birthDate).toBe("1990-05-05");
  });
});

describe("gear", () => {
  it("armor soaks a share of every hit, worn armor less, broken none", () => {
    const p = createPlayer("acct_g1", "Plated", NOW);
    p.inventory.tactical_plate = 1;
    p.equipped = { armor: "tactical_plate" };
    const full = armorBlock(p);
    expect(full).toBeGreaterThan(0.4);
    p.wear = { tactical_plate: 10 };
    expect(armorBlock(p)).toBeLessThan(full);
    p.wear = { tactical_plate: 0 };
    expect(armorBlock(p)).toBe(0);
  });

  it("quick weapons speed you up, heavy gear slows you down, in words", () => {
    const p = createPlayer("acct_g2", "Quick", NOW);
    const base = playerFighter(p, 100).agility;
    p.inventory.switchblade = 1;
    p.equipped = { weapon: "switchblade" };
    expect(playerFighter(p, 100).agility).toBeGreaterThan(base);
    p.inventory.tactical_plate = 1;
    p.equipped = { weapon: null, armor: "tactical_plate" };
    expect(playerFighter(p, 100).agility).toBeLessThan(base);
    expect(gearTrait(ITEM_BY_ID.switchblade)).toBe("Quick");
    expect(gearTrait(ITEM_BY_ID.tactical_plate)).toBe("Heavy");
    expect(gearTrait(ITEM_BY_ID.jacket)).toBe("Light");
  });
});

describe("weapon pairs: one quick, one strong, same worth", () => {
  const PAIRS = [["bike_chain", "pipe"], ["knuckles", "baseball_bat"], ["switchblade", "hatchet"], ["snub_pistol", "revolver"], ["machine_pistol", "shotgun"]];
  function seeded(seed: number) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let x = a;
      x = Math.imul(x ^ (x >>> 15), x | 1);
      x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  }
  const winRate = (id: string) => {
    const d = ITEM_BY_ID[id];
    const rng = seeded(3);
    const foe: Fighter = { strength: 42, toughness: 42, agility: 32, hp: 100, maxHp: 100 };
    let wins = 0;
    for (let i = 0; i < 3000; i++) {
      if (resolveFight({ strength: 30 + d.power!, toughness: 30, agility: 30 + (d.agility ?? 0), hp: 100, maxHp: 100 }, { ...foe }, rng).won) wins++;
    }
    return wins / 3000;
  };
  it("each pair costs about the same, differs in kind, and wins about as often", () => {
    for (const [quick, strong] of PAIRS) {
      const q = ITEM_BY_ID[quick];
      const s = ITEM_BY_ID[strong];
      expect(Math.abs(q.price - s.price) / s.price, quick).toBeLessThan(0.15);
      expect(gearTrait(q)).toBe("Quick");
      expect(gearTrait(s)).not.toBe("Quick");
      expect(Math.abs(winRate(quick) - winRate(strong)), `${quick} vs ${strong}`).toBeLessThan(0.07);
    }
  });
});
