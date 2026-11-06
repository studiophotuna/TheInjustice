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
