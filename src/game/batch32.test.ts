import { describe, expect, it } from "vitest";
import { buyCosmetic, COSMETICS, CUSTOM, creditFavors, equipCosmetic, favorsView, lookOf, reviewUpload, startUpload, validUpload } from "./favors";
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

describe("your own frame or banner", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const jpg = "data:image/jpeg;base64,/9j/4AAQ";

  it("only accepts the right image types, at a sensible size", () => {
    expect(validUpload("frame", png)).toBe(png);
    expect(() => validUpload("frame", jpg)).toThrow(/PNG or WebP/);
    expect(validUpload("banner", jpg)).toBe(jpg);
    expect(() => validUpload("banner", "data:image/svg+xml;base64,PHN2Zz4=")).toThrow();
    expect(() => validUpload("banner", "x".repeat(CUSTOM.banner.maxChars + 1))).toThrow(/too big/);
  });

  it("costs Favors, waits for approval, and can't be worn before it", () => {
    const p = mk();
    expect(() => startUpload(p, "frame", "aaa111", NOW)).toThrow(/enough Favors/);
    creditFavors(p, 1000, "Grant", NOW, "g3");
    startUpload(p, "frame", "aaa111", NOW);
    expect(p.favors).toBe(1000 - CUSTOM.frame.price);
    expect(() => startUpload(p, "frame", "bbb222", NOW)).toThrow(/waiting/);
    expect(() => equipCosmetic(p, "frame", "upload:aaa111")).toThrow(/approved/);
    expect(lookOf(p)).toBeNull();
  });

  it("approved: worn straight away; others see it", () => {
    const p = mk();
    creditFavors(p, 1000, "Grant", NOW, "g4");
    startUpload(p, "banner", "ccc333", NOW);
    reviewUpload(p, "banner", "ccc333", true, "", CUSTOM.banner.price, NOW);
    expect(lookOf(p)?.banner).toBe("u-ccc333");
    equipCosmetic(p, "banner", null);
    equipCosmetic(p, "banner", "upload:ccc333");
    expect(favorsView(p).custom.banner?.status).toBe("approved");
  });

  it("rejected: the Favors come back exactly once, with the reason", () => {
    const p = mk();
    creditFavors(p, 1000, "Grant", NOW, "g5");
    startUpload(p, "frame", "ddd444", NOW);
    const ev = reviewUpload(p, "frame", "ddd444", false, "Not a frame", CUSTOM.frame.price, NOW);
    expect(ev[0].text).toMatch(/Not a frame/);
    expect(p.favors).toBe(1000);
    reviewUpload(p, "frame", "ddd444", false, "again", CUSTOM.frame.price, NOW);
    expect(p.favors).toBe(1000);
    // A decision about an old, replaced upload changes nothing.
    startUpload(p, "frame", "eee555", NOW);
    expect(reviewUpload(p, "frame", "ddd444", true, "", 0, NOW)).toEqual([]);
    expect(favorsView(p).custom.frame?.id).toBe("eee555");
  });
});
