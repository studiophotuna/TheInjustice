import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { closedUntil, torchBusiness, torchChance } from "./arson";
import { newCity } from "./city";
import { playerFighter } from "./combat";
import { ITEM_BY_ID } from "./content/items";
import { PROPERTY_BY_ID } from "./content/properties";
import { applyAction, createPlayer, tick } from "./engine";
import { equippedId, gearPower, usesLeft, wearGear } from "./gear";
import { attackPlayer } from "./social";
import { toView } from "./view";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, name: string) => {
  const p = createPlayer(id, name, T0);
  tick(p, LATER);
  return p;
};

describe("equipment", () => {
  it("buying gear equips it; only equipped gear counts in a fight", () => {
    const p = mk("p", "Pia");
    p.cash = 5000;
    const bare = playerFighter(p, 100).strength;
    applyAction(p, { type: "buy", itemId: "knuckles" }, LATER, always(0.5));
    expect(equippedId(p, "weapon")).toBe("knuckles");
    expect(playerFighter(p, 100).strength).toBeCloseTo(bare + ITEM_BY_ID.knuckles.power!);
    applyAction(p, { type: "buy", itemId: "pipe" }, LATER, always(0.5));
    expect(equippedId(p, "weapon")).toBe("knuckles"); // keeps the one in hand
    applyAction(p, { type: "unequip", slot: "weapon" }, LATER, always(0.5));
    expect(playerFighter(p, 100).strength).toBeCloseTo(bare);
    applyAction(p, { type: "equip", itemId: "pipe" }, LATER, always(0.5));
    expect(equippedId(p, "weapon")).toBe("pipe");
  });

  it("gear wears out with use, hits softer when worn, and does nothing when broken", () => {
    const p = mk("p", "Pia");
    p.cash = 1000;
    applyAction(p, { type: "buy", itemId: "pipe" }, LATER, always(0.5));
    const full = gearPower(p, "weapon");
    wearGear(p, ["weapon"], 20);
    expect(gearPower(p, "weapon")).toBeLessThan(full);
    expect(gearPower(p, "weapon")).toBeGreaterThan(0);
    const out = wearGear(p, ["weapon"], 50);
    expect(out[0].text).toMatch(/broken/);
    expect(gearPower(p, "weapon")).toBe(0);
    // A working one can't be re-bought; a broken one can be replaced.
    p.cash = 1000;
    applyAction(p, { type: "buy", itemId: "pipe" }, LATER, always(0.5));
    expect(usesLeft(p, "pipe")).toBe(ITEM_BY_ID.pipe.durability);
    expect(() => applyAction(p, { type: "buy", itemId: "pipe" }, LATER, always(0.5))).toThrow(/Repair it/);
  });

  it("repairs cost money in proportion to the wear; issued gear is serviced free once a day", () => {
    const p = mk("p", "Pia");
    p.cash = 2000;
    applyAction(p, { type: "buy", itemId: "vest" }, LATER, always(0.5));
    wearGear(p, ["armor"], 20);
    const before = p.cash;
    applyAction(p, { type: "repair", itemId: "vest" }, LATER, always(0.5));
    expect(p.cash).toBeLessThan(before);
    expect(usesLeft(p, "vest")).toBe(ITEM_BY_ID.vest.durability);

    const cop = mk("c", "Cole");
    cop.path = "police";
    cop.rank = 2;
    tick(cop, LATER + 1);
    expect(equippedId(cop, "weapon")).toBe("service_pistol");
    wearGear(cop, ["weapon"], 10);
    applyAction(cop, { type: "repair", itemId: "service_pistol" }, LATER + 2, always(0.5));
    wearGear(cop, ["weapon"], 10);
    expect(() => applyAction(cop, { type: "repair", itemId: "service_pistol" }, LATER + 3, always(0.5))).toThrow(/once a day/);
  });

  it("player fights wear both sides' gear", () => {
    const a = mk("a", "Ava");
    const t = mk("t", "Tom");
    a.cash = t.cash = 2000;
    applyAction(a, { type: "buy", itemId: "knuckles" }, LATER, always(0.5));
    applyAction(t, { type: "buy", itemId: "jacket" }, LATER, always(0.5));
    attackPlayer(a, t, LATER, always(0.5));
    expect(usesLeft(a, "knuckles")).toBe(ITEM_BY_ID.knuckles.durability! - 1);
    expect(usesLeft(t, "jacket")).toBe(ITEM_BY_ID.jacket.durability! - 1);
    expect(toView(a, LATER).gear[0]).toMatchObject({ id: "knuckles", equipped: true });
  });

  it("issued and black-market gear never shows in the shop", () => {
    const p = mk("p", "Pia");
    const shop = toView(p, LATER).shop.map((i) => i.id);
    expect(shop).not.toContain("service_pistol");
    expect(shop).not.toContain("army_rifle");
    expect(shop).toContain("penthouse");
  });
});

describe("torching a business", () => {
  const setup = () => {
    const a = mk("a", "Arturo");
    a.path = "enforcer";
    a.rank = 3;
    a.crewId = "crew-a";
    const owner = mk("o", "Olive");
    owner.properties = { laundromat: LATER - 3_600_000 };
    return { a, owner, city: newCity("varrow", LATER) };
  };

  it("success closes the business, burns the takings, and makes the news", () => {
    const { a, owner, city } = setup();
    a.stats.nerve = a.stats.agility = a.stats.wits = 2000;
    expect(torchChance(a, "laundromat")).toBeGreaterThan(0.8);
    torchBusiness(a, owner, "laundromat", city, LATER, always(0.01));
    expect(closedUntil(owner, "laundromat")).toBeGreaterThan(LATER);
    expect(owner.inbox?.[0].text).toMatch(/burned down/);
    expect(city.log[0].text).toMatch(/arson/);
    expect(() => applyAction(owner, { type: "collect_property", id: "laundromat" }, LATER + 60_000, always(0.5))).toThrow(/burned-out/);
    expect(() => torchBusiness(a, owner, "laundromat", city, LATER + 1, always(0.01))).toThrow(/already|Lie low/);
    // Reopens later and earns again.
    const reopen = closedUntil(owner, "laundromat") + 3 * 3_600_000;
    applyAction(owner, { type: "collect_property", id: "laundromat" }, reopen, always(0.5));
    expect(owner.bank).toBeGreaterThan(0);
  });

  it("a failed attempt can land the arsonist in a cell", () => {
    const { a, owner, city } = setup();
    const rolls = [0.99, 0.1];
    torchBusiness(a, owner, "laundromat", city, LATER, () => rolls.shift() ?? 0.5);
    expect(a.jailReason).toMatch(/gas can/);
    expect(closedUntil(owner, "laundromat")).toBe(0);
  });

  it("only crews can do it, not against their own, and bigger businesses are harder", () => {
    const { a, owner, city } = setup();
    const loner = mk("l", "Loner");
    expect(() => torchBusiness(loner, owner, "laundromat", city, LATER, always(0.01))).toThrow(/Only a crew/);
    owner.crewId = "crew-a";
    expect(() => torchBusiness(a, owner, "laundromat", city, LATER, always(0.01))).toThrow(/crewmate/);
    expect(PROPERTY_BY_ID.corner_bar.price).toBeGreaterThan(PROPERTY_BY_ID.laundromat.price);
    a.stats.nerve = a.stats.agility = a.stats.wits = 49;
    expect(torchChance(a, "corner_bar")).toBeLessThan(torchChance(a, "laundromat"));
  });
});
