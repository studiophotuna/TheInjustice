import { describe, expect, it } from "vitest";
import { applyAction, createPlayer } from "./engine";
import { buyCosmetic, creditFavors, decorOf, equipCosmetic, paintOf, PAINTS } from "./favors";
import { docksView } from "./vehicles";
import { addMarks, buyPass, claimReward, ensurePass, PASS, passView } from "./pass";

const NOW = Date.UTC(2027, 2, 10, 12);
const always = (v: number) => () => v;

describe("season pass", () => {
  it("climbs by playing: jobs count", () => {
    const p = createPlayer("s1", "Climber", NOW);
    for (let i = 0; i < 5; i++) {
      p.energy = 100;
      applyAction(p, { type: "job", jobId: "cans" }, NOW + i * 1000, always(0.5));
    }
    expect(passView(p, NOW).marks).toBe(5);
  });

  it("free rewards for everyone, pass rewards after buying, each once", () => {
    const p = createPlayer("s2", "Holder", NOW);
    for (let i = 0; i < 30; i++) addMarks(p, "train", NOW);
    expect(() => claimReward(p, 2, "free", NOW)).toThrow(/haven't reached/);
    claimReward(p, 1, "free", NOW);
    expect(p.cosmetics!.owned).toContain("color:jade");
    expect(() => claimReward(p, 1, "free", NOW)).toThrow(/Already/);
    expect(() => claimReward(p, 0, "paid", NOW)).toThrow(/season pass/);
    creditFavors(p, PASS.price, "test", NOW, "t1");
    buyPass(p, NOW);
    expect(p.favors).toBe(0 + 10 * 0);
    claimReward(p, 0, "paid", NOW);
    expect(p.cosmetics!.owned).toContain("color:ember");
    claimReward(p, 1, "paid", NOW);
    expect(p.favors).toBe(50);
  });

  it("pass looks can't be bought in the shop", () => {
    const p = createPlayer("s3", "Shopper", NOW);
    creditFavors(p, 1000, "test", NOW, "t2");
    expect(() => buyCosmetic(p, "frame:halo", NOW)).toThrow(/season pass/);
  });

  it("hands out what was earned but not collected when the month turns", () => {
    const p = createPlayer("s4", "Forgetful", NOW);
    for (let i = 0; i < 12; i++) addMarks(p, "train", NOW);
    const before = p.favors ?? 0;
    ensurePass(p, Date.UTC(2027, 3, 2));
    expect(p.favors).toBe(before + 10);
    expect(p.pass!.marks).toBe(0);
  });

  it("a look you already own turns into Favors", () => {
    const p = createPlayer("s5", "Again", NOW);
    p.cosmetics = { owned: ["color:jade"] };
    for (let i = 0; i < 30; i++) addMarks(p, "train", NOW);
    const before = p.favors ?? 0;
    claimReward(p, 1, "free", NOW);
    expect(p.favors).toBe(before + PASS.dupeFavors);
  });
});

describe("car paint and home decor", () => {
  it("paint recolours every car you own, decor changes your place", () => {
    const p = createPlayer("pd1", "Painter", NOW);
    creditFavors(p, 1000, "test", NOW, "pd");
    p.garage = [{ id: "c1", model: "sedan", country: "varrow", condition: 100 } as never];
    buyCosmetic(p, "paint:candy", NOW);
    expect(paintOf(p)).toBe(PAINTS.candy);
    expect(docksView(p, "varrow", NOW).garage[0].color).toBe(PAINTS.candy);
    buyCosmetic(p, "decor:loft", NOW);
    expect(decorOf(p)).toBe("/decor/loft.jpg");
    equipCosmetic(p, "paint", null);
    expect(paintOf(p)).toBeNull();
  });
});
