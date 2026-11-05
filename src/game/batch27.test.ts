import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { applyBackground, BACKGROUNDS, backgroundView } from "./backgrounds";
import { newCity } from "./city";
import { JOB_BY_ID } from "./content/jobs";
import { CUSTOMS, creditSeizure, customsBlock, endShift, onDuty, startShift } from "./customs";
import { sv } from "./stats";
import { parseAction } from "../server/actions";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (id: string): Player => {
  const p = createPlayer(id, id.toUpperCase(), T0, "varrow");
  tick(p, NOW);
  p.energy = 100;
  p.heat = 0;
  p.cash = 50_000;
  return p;
};

describe("starting backgrounds", () => {
  it("each points to a real career and a real first job", () => {
    for (const b of BACKGROUNDS) {
      if (b.firstJob !== "gym") expect(JOB_BY_ID[b.firstJob]).toBeTruthy();
      const p = mk("xx");
      applyBackground(p, b.id);
      expect(backgroundView(p)?.career).toBeTruthy();
    }
  });

  it("gives a small head start, never a career", () => {
    const plain = mk("aa");
    const nurse = mk("bb");
    applyBackground(nurse, "nurse");
    expect(sv(nurse, "wits")).toBeGreaterThan(sv(plain, "wits"));
    expect(sv(nurse, "wits") - sv(plain, "wits")).toBeLessThan(10);
    expect(nurse.path).toBeNull();
    expect(nurse.offers).toEqual([]);
    expect(backgroundView(nurse)?.show).toBe(true);
    nurse.path = "medicine";
    expect(backgroundView(nurse)?.show).toBe(false);
  });

  it("is accepted at character creation, and unknown ones are refused", () => {
    expect(parseAction({ type: "create", name: "Rook", background: "garage" })).toMatchObject({ background: "garage" });
    expect(() => parseAction({ type: "create", name: "Rook", background: "astronaut" })).toThrow();
  });
});

describe("customs officers", () => {
  const officer = (path: "police" | "military" = "police", rank = 2) => {
    const o = mk("off");
    o.path = path;
    o.rank = rank;
    o.stats.perception = 900;
    return o;
  };

  it("police and soldiers rank 2+ take a shift; others can't", () => {
    const c = newCity("varrow", NOW);
    expect(customsBlock(c, mk("bum"), NOW)).toMatch(/rank 2/);
    const o = officer("military");
    startShift(c, o, NOW);
    expect(onDuty(c, NOW)).toHaveLength(1);
    expect(o.energy).toBe(100 - CUSTOMS.energy);
    expect(onDuty(c, NOW + CUSTOMS.shiftMs + 1)).toHaveLength(0);
    endShift(c, o, NOW + 1);
    expect(onDuty(c, NOW + 1)).toHaveLength(0);
  });

  it("an officer on duty stops and searches drivers; the seizure is theirs to claim", () => {
    const o = officer();
    const smuggler = mk("smug");
    applyAction(smuggler, { type: "car_buy", model: "sedan" }, NOW, always(0.5));
    applyAction(smuggler, { type: "cargo_buy", carId: smuggler.garage![0].id, good: "pistols", qty: 10 }, NOW, always(0.5));
    // rng 0.3: under the manned stop chance, over the unmanned one.
    applyAction(smuggler, { type: "drive", to: "solmarra", carId: smuggler.garage![0].id }, NOW, always(0.3), { customs: [{ id: o.id, name: o.name, eye: 60 }] });
    expect(smuggler.travel?.incident?.officer?.name).toBe("OFF");
    expect(smuggler.travel?.incident?.seized).toBe(true);
    expect(smuggler.customsSeizure?.officerId).toBe(o.id);
    const cash = o.cash;
    const bounty = creditSeizure(o, smuggler.customsSeizure!.value, smuggler.name, smuggler.customsSeizure!.what, NOW);
    expect(o.cash).toBe(cash + bounty);
    expect(bounty).toBe(Math.max(25, Math.round(smuggler.customsSeizure!.value * CUSTOMS.bountyShare)));
  });

  it("with nobody on duty, the same roll drives straight through", () => {
    const smuggler = mk("smug");
    applyAction(smuggler, { type: "car_buy", model: "sedan" }, NOW, always(0.5));
    applyAction(smuggler, { type: "cargo_buy", carId: smuggler.garage![0].id, good: "pistols", qty: 10 }, NOW, always(0.5));
    applyAction(smuggler, { type: "drive", to: "solmarra", carId: smuggler.garage![0].id }, NOW, always(0.3));
    expect(smuggler.travel?.incident?.kind).not.toBe("checkpoint");
  });

  it("the station checks a passenger's bags while customs is on duty", () => {
    const o = officer();
    const p = mk("mule");
    p.drugs = { powder: 5 };
    applyAction(p, { type: "travel", to: "solmarra", mode: "train" }, NOW, always(0.2), { customs: [{ id: o.id, name: o.name, eye: 40 }] });
    expect(p.drugs).toEqual({});
    expect(p.customsSeizure?.officerId).toBe(o.id);
  });
});
