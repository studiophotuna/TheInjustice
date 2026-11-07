import { describe, expect, it } from "vitest";
import { createPlayer } from "./engine";
import { buyCosmetic, creditFavors, hasMic, MIC } from "./favors";
import { attackPlayer, fightFace } from "./social";
import { DOG_BREEDS, DOGS } from "./dogs";

const NOW = 1_800_000_000_000;

describe("the microphone", () => {
  it("is bought once with Favors and lets you speak in Global", () => {
    const p = createPlayer("m1", "Mic Owner", NOW);
    expect(hasMic(p)).toBe(false);
    creditFavors(p, 1000, "Grant", NOW, "g-mic");
    buyCosmetic(p, MIC, NOW);
    expect(hasMic(p)).toBe(true);
    expect(() => buyCosmetic(p, MIC, NOW)).toThrow(/already/);
    // It isn't worn like a look.
    expect(p.cosmetics?.frame ?? null).toBeNull();
  });
});

describe("fights show the real opponent", () => {
  it("a player fight carries the opponent's photo, career and looks", () => {
    const a = createPlayer("a1", "Attacker", NOW - 30 * 86_400_000);
    const t = createPlayer("t1", "Target", NOW - 30 * 86_400_000);
    t.profile = { photo: "/faces/mk4818.jpg" };
    t.path = "police";
    t.cosmetics = { owned: ["frame:gilded"], frame: "frame:gilded" };
    t.immuneUntil = 0;
    expect(fightFace(t)).toEqual({ photo: "/faces/mk4818.jpg", path: "police", look: { frame: "gilded", color: null, banner: null } });
    const { fight } = attackPlayer(a, t, NOW, () => 0.5);
    expect(fight.face?.photo).toBe("/faces/mk4818.jpg");
  });
});

describe("dogs", () => {
  it("every breed has a photo-friendly id, a price and a guard value", () => {
    expect(DOG_BREEDS.length).toBe(9);
    for (const b of DOG_BREEDS) expect(DOGS.breeds[b].guard).toBeGreaterThan(0);
  });
});
