import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { chooseEncounter, ENCOUNTERS, encounterView, maybeEncounter } from "./encounters";
import { createPlayer, tick } from "./engine";
import { regularUpkeep, ROSTER } from "./regulars";
import { friendsIn, tieOf, tieShift, tieView } from "./journal";
import { makeRegular } from "@/server/regulars";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const mk = () => {
  const p = createPlayer("p", "Pia", T0);
  tick(p, LATER);
  return p;
};
const seq = (...v: number[]) => {
  let i = 0;
  return () => v[Math.min(i++, v.length - 1)];
};

describe("street encounters", () => {
  it("don't happen to brand-new players, then happen now and then, with a cooldown", () => {
    const p = mk();
    expect(maybeEncounter(p, "varrow", LATER, () => 0, 2)).toEqual([]);
    const ev = maybeEncounter(p, "varrow", LATER, () => 0, 10);
    expect(ev[0].action?.target).toBe("encounter:open");
    expect(p.encounter?.name).toBeTruthy();
    // One at a time, and not again right away.
    p.encounter = null;
    expect(maybeEncounter(p, "varrow", LATER + 60_000, () => 0, 10)).toEqual([]);
    expect(maybeEncounter(p, "varrow", LATER + ENCOUNTERS.cooldownMs + 1, () => 0.99, 10)).toEqual([]);
  });

  it("show the regular's face, the situation, and what each choice costs", () => {
    const p = mk();
    maybeEncounter(p, "varrow", LATER, () => 0, 10);
    const v = encounterView(p, LATER + 1000)!;
    expect(v.photo).toMatch(/^\/careers\/[a-z-]+-face\.webp$/);
    expect(v.text.length).toBeGreaterThan(20);
    expect(v.options.length).toBeGreaterThanOrEqual(2);
    expect(v.options.every((o) => o.hint)).toBe(true);
    expect(encounterView(p, LATER + ENCOUNTERS.ttlMs + 1)).toBeNull();
  });

  it("choices change money, conscience and reputation; costs are enforced", () => {
    const p = mk();
    p.encounter = { id: "lost_wallet", key: "gus", country: "varrow", name: "Gus Marlowe", district: "The Gutter", at: LATER, expiresAt: LATER + ENCOUNTERS.ttlMs };
    const cash = p.cash;
    const integ = p.stats.integrity;
    chooseEncounter(p, 0, LATER + 1, () => 0.9);
    expect(p.cash).toBe(cash + 60);
    expect(p.stats.integrity).toBe(integ - 3);
    expect(p.encounter).toBeNull();
    expect(() => chooseEncounter(p, 0, LATER + 2, () => 0.5)).toThrow(/moved on/);

    p.encounter = { id: "hot_watch", key: "dutch", country: "varrow", name: "Dutch Kessler", district: "Iron Row", at: LATER, expiresAt: LATER + ENCOUNTERS.ttlMs };
    p.cash = 10;
    expect(() => chooseEncounter(p, 0, LATER + 3, () => 0.5)).toThrow(/\$40/);
    p.cash = 100;
    chooseEncounter(p, 0, LATER + 4, seq(0.1));
    expect(p.cash).toBe(60);
    expect(p.dirty).toBe(110);
  });

  it("a clue bought on the street goes on the board", () => {
    const p = mk();
    p.cash = 100;
    p.encounter = { id: "missing_page", key: "ivy", country: "varrow", name: "Ivy Szabo", district: "Courthouse Hill", at: LATER, expiresAt: LATER + ENCOUNTERS.ttlMs };
    const ev = chooseEncounter(p, 0, LATER + 1, () => 0.5);
    expect(p.flags).toContain("clue:missing_page");
    expect(ev[0].text).toContain("Crane");
  });

  it("regulars get their portrait", () => {
    const r = makeRegular("kestrova", "anya", LATER);
    regularUpkeep(r, LATER);
    expect(r.profile?.photo).toMatch(/^\/careers\/[a-z-]+-face\.webp$/);
  });
});


describe("the story so far", () => {
  it("starts with your release, then writes down career moves, promotions, jail and money", () => {
    const p = mk();
    expect(p.journal?.[0].text).toMatch(/Released/);
    p.path = "enforcer";
    p.rank = 1;
    tick(p, LATER + 1000);
    p.rank = 2;
    p.jailUntil = LATER + 60 * 60_000;
    p.jailReason = "Caught pickpocketing.";
    p.bank = 1500;
    tick(p, LATER + 2000);
    const texts = (p.journal ?? []).map((e) => e.text).join(" | ");
    expect(texts).toMatch(/Started over as .* in the Mafia/);
    expect(texts).toMatch(/Promoted to/);
    expect(texts).toMatch(/Locked up: Caught pickpocketing/);
    expect(texts).toMatch(/First \$1,000/);
    // Nothing is written twice.
    const n = p.journal!.length;
    tick(p, LATER + 3000);
    expect(p.journal!.length).toBe(n);
  });
});

describe("the regulars remember you", () => {
  it("choices move how a regular feels about you, and friends tip you off", () => {
    const p = mk();
    p.encounter = { id: "lost_wallet", key: "rosa", country: "varrow", name: "Rosa Vint", district: "The Gutter", at: LATER, expiresAt: LATER + ENCOUNTERS.ttlMs };
    chooseEncounter(p, 1, LATER + 1, () => 0.9);
    expect(tieOf(p, "varrow", "rosa")?.t).toBe(1);
    expect(tieView(p, "varrow", "rosa")?.label).toBe("Knows you");
    expect(p.journal?.at(-1)?.text).toMatch(/Rosa Vint: you handed in a wallet/);
    tieShift(p, "varrow", "rosa", 3, "You helped.", LATER);
    expect(friendsIn(p, "varrow")).toEqual(["rosa"]);
    // Hot, with a friend in town: the friend comes to warn you.
    p.heat = 30;
    p.encounterAt = 0;
    maybeEncounter(p, "varrow", LATER + 10, () => 0, 10);
    expect(p.encounter?.id).toBe("friend_tip");
    expect(p.encounter?.key).toBe("rosa");
  });

  it("people you've crossed stop coming over", () => {
    const p = mk();
    for (const d of ROSTER.varrow) tieShift(p, "varrow", d.key, -5, "You robbed them.", LATER);
    expect(maybeEncounter(p, "varrow", LATER, () => 0, 10)).toEqual([]);
  });
});
