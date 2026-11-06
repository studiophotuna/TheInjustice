import { describe, expect, it } from "vitest";
import { buyCosmetic, COSMETICS, creditFavors, equipCosmetic, favorsView, lookOf } from "./favors";
import { applyModAction } from "./moderation";
import { createPlayer } from "./engine";
import { defaultFace, NPC_FACES, REGULAR_LOOKS, regularFace } from "./content/faces";

const NOW = 1_800_000_000_000;
const mk = () => createPlayer("t1", "Test Player", NOW);
const frame = COSMETICS.find((c) => c.kind === "frame")!;
const color = COSMETICS.find((c) => c.kind === "color")!;

describe("Favors", () => {
  it("start at zero, and a purchase notice is only ever counted once", () => {
    const p = mk();
    expect(favorsView(p).balance).toBe(0);
    expect(creditFavors(p, 550, "Pack of 550", NOW, "pay_123")).toBe(true);
    expect(creditFavors(p, 550, "Pack of 550", NOW, "pay_123")).toBe(false);
    expect(p.favors).toBe(550);
    expect(favorsView(p).log[0].delta).toBe(550);
  });

  it("buy a look, wear it, take it off; never without enough Favors", () => {
    const p = mk();
    expect(() => buyCosmetic(p, frame.id, NOW)).toThrow(/enough Favors/);
    creditFavors(p, 500, "Grant", NOW, "g1");
    buyCosmetic(p, frame.id, NOW);
    expect(p.favors).toBe(500 - frame.price);
    expect(lookOf(p)?.frame).toBe(frame.id.split(":")[1]);
    expect(() => buyCosmetic(p, frame.id, NOW)).toThrow(/already/);
    equipCosmetic(p, "frame", null);
    expect(lookOf(p)).toBeNull();
    expect(() => equipCosmetic(p, "color", color.id)).toThrow(/own/);
    expect(() => equipCosmetic(p, "color", frame.id)).toThrow();
  });

  it("buy only looks: money, energy, stats and gear don't change", () => {
    const p = mk();
    creditFavors(p, 1000, "Grant", NOW, "g2");
    const before = JSON.stringify({ cash: p.cash, bank: p.bank, energy: p.energy, stats: p.stats, inventory: p.inventory });
    for (const c of COSMETICS.slice(0, 4)) buyCosmetic(p, c.id, NOW);
    expect(JSON.stringify({ cash: p.cash, bank: p.bank, energy: p.energy, stats: p.stats, inventory: p.inventory })).toBe(before);
  });

  it("moderators can grant within limits", () => {
    const p = mk();
    expect(applyModAction(p, "grant_favors", 0, "test", NOW, 300)).toMatch(/300/);
    expect(p.favors).toBe(300);
    expect(() => applyModAction(p, "grant_favors", 0, "", NOW, 0)).toThrow();
  });
});

describe("default faces", () => {
  it("never give a player a face a regular or story character wears", () => {
    const taken = new Set([...Object.values(NPC_FACES), ...Object.keys(REGULAR_LOOKS).map((k) => regularFace(k)!.src)]);
    for (const n of ["Quell", "Mercy", "Victor", "Lucia Ferro", "Novak Petresk", "Ana", "Sam"]) {
      expect(taken.has(defaultFace(n).src)).toBe(false);
    }
  });
});
