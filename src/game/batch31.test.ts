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

describe("NPCs are drawn as their career, as a man or a woman", () => {
  it("contacts and regulars get their own career's character", async () => {
    const { NPC_FACES, careerFace } = await import("./content/faces");
    const { regularPhoto, ROSTER } = await import("./regulars");
    expect(NPC_FACES.reyes).toBe("/careers/police-f-face.webp");
    expect(NPC_FACES.kozak).toBe("/careers/enforcer-face.webp");
    expect(NPC_FACES.mugger).toBe("/careers/street-face.webp");
    // Careers without a woman's picture share one.
    expect(careerFace("military", "f")).toBe("/careers/military-face.webp");
    const lucia = ROSTER.solmarra.find((d) => d.key === "lucia")!;
    expect(regularPhoto("solmarra", "lucia")).toBe(careerFace(lucia.path, "f"));
  });
});
