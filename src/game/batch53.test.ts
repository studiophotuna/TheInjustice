import { describe, expect, it } from "vitest";
import { createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { JOBS } from "./content/jobs";
import { jobAudience, lineFor, seesOfficialFeed, visibleFeed } from "./feed";
import { weekStories } from "./paper";
import type { FeedLine } from "./types";

// 7.9: the street sees news; case numbers, investigation results and covert work are for officials.

const NOW = Date.UTC(2027, 10, 1, 12);
const who = (path: string | null, country: "varrow" | "solmarra" = "varrow") => {
  const p = createPlayer(`p-${path}`, "Test", NOW - 86_400_000, country);
  p.path = path as never;
  p.rank = 3;
  tick(p, NOW);
  return p;
};

describe("who counts as an official", () => {
  it("police, courts and fire in this city, and the mayor; nobody else", () => {
    const city = newCity("varrow", NOW);
    expect(seesOfficialFeed(who("police"), city, "varrow")).toBe(true);
    expect(seesOfficialFeed(who("courts"), city, "varrow")).toBe(true);
    expect(seesOfficialFeed(who("fire"), city, "varrow")).toBe(true);
    for (const path of [null, "enforcer", "hacker", "banking", "vigilante", "medicine"]) expect(seesOfficialFeed(who(path), city, "varrow")).toBe(false);
    // Another city's police don't read this city's files.
    expect(seesOfficialFeed(who("police", "solmarra"), city, "solmarra")).toBe(false);
    const mayor = who("enforcer");
    city.mayor = { id: mayor.id, name: mayor.name, since: NOW };
    expect(seesOfficialFeed(mayor, city, "varrow")).toBe(true);
  });
});

describe("what each side reads", () => {
  const lines: FeedLine[] = [
    { at: 3, text: "Rosa Vint was mugged in The Gutter.", detail: "The police opened case #060839." },
    { at: 2, to: "officials", text: "Fire investigator Hank Doyle names Lenny Pike as the arsonist behind the shop fire." },
    { at: 1, text: "Silas Crowe is running for mayor." },
  ];
  it("the street sees the news without case numbers or findings", () => {
    expect(visibleFeed(lines, false).map((l) => l.text)).toEqual(["Rosa Vint was mugged in The Gutter.", "Silas Crowe is running for mayor."]);
  });
  it("officials see everything, with the case number", () => {
    const seen = visibleFeed(lines, true).map((l) => l.text);
    expect(seen).toHaveLength(3);
    expect(seen[0]).toBe("Rosa Vint was mugged in The Gutter. The police opened case #060839.");
  });
  it("lines written before 7.9 are cleaned up for the public too", () => {
    expect(lineFor({ at: 1, text: "Marisol Cruz was mugged in The Boardwalk. The police opened case #D00B24." }, false)).toBe("Marisol Cruz was mugged in The Boardwalk.");
    expect(lineFor({ at: 1, text: "Fire investigator Salvo Greco names Rico Mancuso as the arsonist behind the kiosk fire." }, false)).toBeNull();
    expect(lineFor({ at: 1, text: "Hank Doyle worked the scene in Old Market (case #ABC123)." }, false)).toBeNull();
    expect(lineFor({ at: 1, text: "Fire investigator Salvo Greco names Rico Mancuso as the arsonist behind the kiosk fire." }, true)).not.toBeNull();
  });
  it("the paper prints only what the street may know", () => {
    const city = newCity("varrow", NOW);
    city.log = lines.map((l) => ({ ...l, at: NOW - 1000 }));
    const heads = weekStories("varrow", city, [], NOW).stories.map((s) => s.headline);
    expect(heads.some((h) => h.includes("case #"))).toBe(false);
    expect(heads.some((h) => h.includes("names Lenny Pike"))).toBe(false);
  });
});

describe("work in the street feed", () => {
  it("crime and corruption are never announced; surveillance only to officials", () => {
    expect(jobAudience(JOBS.find((j) => j.id === "take_bribe")!.tag)).toBe("secret");
    expect(jobAudience(JOBS.find((j) => j.id === "tail_suspect")!.tag)).toBe("officials");
    for (const j of JOBS.filter((x) => x.tag === "Crime" || x.tag === "Corrupt")) expect(jobAudience(j.tag)).toBe("secret");
    expect(jobAudience("Care")).toBe("public");
  });
});

describe("more people on the street (7.9)", () => {
  it("every city has people out at every hour of the day, and no two in a city share a face", async () => {
    const { ROSTER, scheduledOut, regularPhoto } = await import("./regulars");
    for (const [city, defs] of Object.entries(ROSTER)) {
      for (let h = 0; h < 24; h++) {
        const out = defs.filter((d) => !d.heavy && scheduledOut(d, Date.UTC(2027, 0, 1, h))).length;
        expect(out, `${city} at ${h}:00`).toBeGreaterThanOrEqual(5);
      }
      const careerPhotos = defs.filter((d) => d.path).map((d) => regularPhoto(city, d.key));
      expect(new Set(careerPhotos).size, city).toBe(careerPhotos.length);
    }
    // Keys are unique across the whole game (faces are looked up by key).
    const keys = Object.values(ROSTER).flat().map((d) => d.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
