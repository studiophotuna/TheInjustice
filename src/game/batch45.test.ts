import { describe, expect, it } from "vitest";
import { applyAction, createPlayer } from "./engine";
import { newCity } from "./city";
import { DOG_BREEDS, DOG_PRICES, dogView } from "./dogs";
import { DOG_HOME, POUND, poundRestock, poundShipment, poundView, returnDog, takeDog } from "./stock";

const NOW = Date.UTC(2027, 9, 1, 12);
const always = (v: number) => () => v;

describe("the pound", () => {
  it("every breed lives in one city, and every city has a pound with dogs", () => {
    for (const b of DOG_BREEDS) expect(DOG_HOME[b], b).toBeTruthy();
    for (const c of ["varrow", "solmarra", "kestrova", "meridian"] as const) expect(Object.keys(poundView(newCity(c, NOW))).length).toBeGreaterThan(0);
  });

  it("you only see and adopt the breeds this city's pound has", () => {
    const p = createPlayer("acct_d1", "Walker", NOW, "varrow");
    p.cash = 20_000;
    p.housing = 1 as never;
    expect(dogView(p, NOW).breeds.map((b) => b.id).sort()).toEqual(["junkyard", "mutt"]);
    expect(() => applyAction(p, { type: "dog_buy", breed: "mastiff", name: "Tank" }, NOW, always(0.5))).toThrow(/Halcyon|pound/);
  });

  it("kennels fill by luck, never past their size, and only so often", () => {
    const c = newCity("kestrova", NOW);
    poundShipment(c, DOG_PRICES, always(0));
    expect(Object.values(c.pound!).reduce((a, b) => a + b, 0)).toBe(1);
    for (let i = 0; i < 60; i++) poundShipment(c, DOG_PRICES, Math.random);
    for (const [b, n] of Object.entries(c.pound!)) expect(n).toBeLessThanOrEqual(POUND.cap(DOG_PRICES[b]));
    const d = newCity("varrow", NOW);
    expect(poundRestock(d, NOW, DOG_PRICES, always(0.5))).toBe(true);
    expect(poundRestock(d, NOW + 1000, DOG_PRICES, always(0.5))).toBe(false);
    expect(poundRestock(d, NOW + POUND.everyMs, DOG_PRICES, always(0.5))).toBe(true);
  });

  it("an adoption takes a dog from the kennel; an empty kennel refuses", () => {
    const c = newCity("solmarra", NOW);
    c.pound = { pitbull: 1 };
    takeDog(c, "pitbull");
    expect(c.pound.pitbull).toBe(0);
    expect(() => takeDog(c, "pitbull")).toThrow(/None left/);
    expect(() => takeDog(c, "husky")).toThrow(/Ironmoor/);
    returnDog(c, "pitbull");
    expect(c.pound.pitbull).toBe(1);
  });

  it("the pound can't be owned or targeted", () => {
    const c = newCity("varrow", NOW);
    expect(Object.keys(c.shops ?? {})).not.toContain("pound");
  });
});

describe("every breed can be asked for", () => {
  it("the request parser accepts all breeds", async () => {
    const { parseAction } = await import("../server/actions");
    for (const b of DOG_BREEDS) expect(parseAction({ type: "dog_buy", breed: b, name: "Rex" })).toMatchObject({ breed: b });
  });
});
