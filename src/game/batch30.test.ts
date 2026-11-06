import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { newCity } from "./city";
import { COUNTRIES } from "./content/world";
import { JOBS } from "./content/jobs";
import { PATHS } from "./content/paths";
import { SCHOOLS } from "./content/schools";
import { BACKGROUNDS } from "./backgrounds";
import { torchBusiness } from "./arson";
import { FIRE, fireLogView, hireScrub, investigateFire, SCRUB, scrubBlock } from "./firehack";
import { FUGITIVE, goOnTheRun, huntBlock } from "./fugitive";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string, country: "varrow" | "kestrova" | "meridian" = "varrow"): Player => {
  const p = createPlayer(id, id.toUpperCase(), T0, country);
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.cash = 50_000;
  return p;
};

describe("course locations", () => {
  it("nothing is listed as coming soon that already exists", () => {
    for (const c of COUNTRIES) {
      for (const planned of c.plannedSchools) expect(SCHOOLS.some((s) => s.name === planned.name)).toBe(false);
    }
  });

  it("a career offer enrolls you at the school in the city you're in", () => {
    const p = mk("rook", "kestrova");
    p.offers = ["police"];
    applyAction(p, { type: "offer", path: "police", accept: true }, NOW, always(0.5));
    expect(p.application?.school).toBe("ironmoor_police");
  });

  it("with no school for it here, the offer still goes to the career's main school", () => {
    const p = mk("rook", "kestrova");
    p.offers = ["banking"];
    applyAction(p, { type: "offer", path: "banking", accept: true }, NOW, always(0.5));
    expect(p.application?.school).toBe("solace_finance");
  });
});

describe("every career is complete", () => {
  it("every career has work at every rank, a way in, and a background pointing to it", () => {
    for (const path of Object.keys(PATHS) as (keyof typeof PATHS)[]) {
      const def = PATHS[path];
      for (let r = 1; r <= def.ranks.length; r++) {
        // Ranks without their own job still have lower-rank work to do.
        expect(JOBS.some((j) => j.path === path && (j.minRank ?? 1) <= r)).toBe(true);
      }
      if (def.school) expect(SCHOOLS.some((s) => s.id === def.school)).toBe(true);
      expect(BACKGROUNDS.some((b) => b.career === path)).toBe(true);
    }
  });

  it("the new careers and schools exist", () => {
    expect(PATHS.hacker.school).toBe("halcyon_tech");
    expect(PATHS.fire.school).toBe("grayhaven_fire");
    expect(SCHOOLS.filter((s) => s.path === "courts").map((s) => s.country).sort()).toEqual(["meridian", "varrow"]);
  });
});

describe("fire investigators", () => {
  it("arson goes on the fire log, and an investigator can name the arsonist", () => {
    const owner = mk("own");
    owner.properties = { laundromat: NOW };
    const a = mk("ash");
    a.path = "enforcer";
    a.crewId = "kz";
    const c = newCity("varrow", NOW);
    c.treasury = 5_000;
    torchBusiness(a, owner, "laundromat", c, NOW, always(0));
    expect(c.fires).toHaveLength(1);
    const f = mk("fifi");
    f.path = "fire";
    f.rank = FIRE.investigateRank;
    const view = fireLogView(c, f, NOW);
    expect(view[0].block).toBeNull();
    const heat = a.heat;
    investigateFire(f, c, view[0].id, a, NOW + 1, always(0));
    expect(c.fires![0].solved?.arsonistName).toBe("ASH");
    expect(a.heat).toBe(heat + FIRE.heat);
    expect(f.cash).toBe(50_000 + FIRE.reward);
    expect(fireLogView(c, f, NOW + 2)[0].block).toMatch(/Already solved/);
  });

  it("a fire watch stops all arson", () => {
    const owner = mk("own");
    owner.properties = { laundromat: NOW };
    const a = mk("ash");
    a.path = "enforcer";
    a.crewId = "kz";
    const c = newCity("varrow", NOW);
    c.fireWatchUntil = NOW + 60_000;
    expect(() => torchBusiness(a, owner, "laundromat", c, NOW, always(0))).toThrow(/fire watch/);
  });
});

describe("hackers", () => {
  it("scrub a client's record for a fee, once every few hours", () => {
    const h = mk("juno");
    h.path = "hacker";
    h.rank = SCRUB.minRank;
    applyAction(h, { type: "scrub_set", open: true, fee: 600 }, NOW, always(0.5));
    const client = mk("cal");
    client.heat = 30;
    client.dirty = 1_000;
    hireScrub(h, client, NOW);
    expect(client.heat).toBe(10);
    expect(client.dirty).toBe(400);
    expect(h.dirty).toBe(600);
    expect(scrubBlock(h, client, NOW + 1)).toMatch(/just scrubbed/);
  });
});

describe("hideouts", () => {
  it("going to ground hides a fugitive and halves the time left", () => {
    const p = mk("rook");
    goOnTheRun(p, NOW);
    p.lastLieLowAt = NOW - 60_000;
    applyAction(p, { type: "lie_low" }, NOW, always(0.5));
    expect(p.fugitive!.until).toBe(NOW + FUGITIVE.ms / 2);
    const d = mk("dana");
    d.path = "police";
    d.rank = BALANCE.crime.detectiveRank;
    expect(huntBlock(d, p, NOW + 1)).toMatch(/gone to ground/);
  });
});
