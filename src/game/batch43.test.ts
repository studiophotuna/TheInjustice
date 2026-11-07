import { describe, expect, it } from "vitest";
import { AGE, ageOn, oldEnough, parseBirthDate } from "./age";
import { applyAction, createPlayer } from "./engine";
import { playerFighter } from "./combat";
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
