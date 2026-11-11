import { describe, expect, it } from "vitest";
import { FACES, REGULAR_LOOKS, regularFace } from "./content/faces";
import { ROSTER } from "./regulars";
import { validPhoto } from "./profile";

describe("photo faces", () => {
  it("every regular has a look, and a face that matches it", () => {
    for (const list of Object.values(ROSTER)) {
      for (const r of list) {
        const look = REGULAR_LOOKS[r.key];
        expect(look, r.key).toBeTruthy();
        expect(regularFace(r.key)!.g).toBe(look.g);
      }
    }
  });

  it("nobody in the same city shares a face", () => {
    for (const list of Object.values(ROSTER)) {
      const srcs = list.map((r) => regularFace(r.key)!.src);
      expect(new Set(srcs).size).toBe(srcs.length);
    }
  });

  it("players can pick one of the game's faces, and nothing else by path", () => {
    const f = Object.values(FACES)[0].src;
    expect(validPhoto(f)).toBe(f);
    expect(() => validPhoto("/faces/../../etc/passwd")).toThrow();
  });
});

describe("city groups", () => {
  it("cover every regular exactly once", () => {
    const keys = Object.values(ROSTER).flat().map((r) => r.key).sort();
    expect(Object.keys(REGULAR_LOOKS).sort()).toEqual(keys);
  });
});

describe("NPCs are drawn as their career and rank", () => {
  it("a different photo for every rank, and contacts keep their own", async () => {
    const { NPC_FACES, rankPortrait } = await import("./content/faces");
    const { regularPhoto } = await import("./regulars");
    // Mafia: the soldier and the boss are different people; the Boss is the old man.
    expect(rankPortrait("enforcer", 2)).not.toBe(rankPortrait("enforcer", 7));
    expect(rankPortrait("enforcer", 7)).toBe("/portraits/enforcer-3.jpg");
    // An intern isn't the doctor.
    expect(rankPortrait("medicine", 2)).not.toBe(rankPortrait("medicine", 4));
    for (const p of ["police", "enforcer", "courts", "vigilante", "medicine", "banking", "military", "mechanic", "hacker", "fire"]) {
      const all = new Set(Array.from({ length: 8 }, (_, i) => rankPortrait(p, i + 1)));
      expect(all.size, p).toBeGreaterThanOrEqual(7);
    }
    // The story's people have their own photos: never a rank photo, never a regular's face.
    const STORY = ["reyes", "kozak", "marsh", "silas", "mercy", "quell", "brann", "dobrev", "okafor", "brennan", "crane", "benny"];
    const { existsSync } = await import("node:fs");
    const { REGULAR_LOOKS, regularFace, STORY_SOURCE_FACES } = await import("./content/faces");
    const ranks = new Set(["police", "enforcer", "courts", "vigilante", "medicine", "banking", "military", "mechanic", "hacker", "fire"].flatMap((p) => Array.from({ length: 8 }, (_, i) => rankPortrait(p, i + 1))));
    const regularFaces = new Set(Object.keys(REGULAR_LOOKS).map((k) => regularFace(k)?.src));
    const otherNpcs = Object.entries(NPC_FACES).filter(([id]) => !STORY.includes(id)).map(([, src]) => src);
    for (const id of STORY) {
      const src = NPC_FACES[id];
      expect(src, id).toBe(`/portraits/story/${id}.jpg`);
      expect(existsSync(`public${src}`), id).toBe(true);
      expect(ranks.has(src), id).toBe(false);
      expect(otherNpcs.includes(src), id).toBe(false);
    }
    for (const src of STORY_SOURCE_FACES) expect(regularFaces.has(src), src).toBe(false);
    expect(regularPhoto("solmarra", "lucia")).toMatch(/^\/portraits\/[a-z0-9-]+\.jpg$/);
  });
});
