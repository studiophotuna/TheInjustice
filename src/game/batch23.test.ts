import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { applyAction, createPlayer, tick } from "./engine";
import { seizeStash, STASH, stashView } from "./stash";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const NOW = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (housing = 2): Player => {
  const p = createPlayer("p", "Pia", T0, "varrow");
  tick(p, NOW);
  p.housing = housing as Player["housing"];
  p.cash = 5_000;
  p.dirty = 20_000;
  p.drugs = { herb: 30, powder: 5 };
  return p;
};
const stash = (p: Player, op: "put" | "take", what: "cash" | "dirty" | "herb" | "pills" | "powder", amount?: number) =>
  applyAction(p, { type: "stash", op, what, amount }, NOW, always(0.5));

describe("home stash", () => {
  it("a box hides nothing", () => {
    const p = mk(0);
    expect(() => stash(p, "put", "dirty")).toThrow(/nowhere/);
    expect(stashView(p).spot).toBeNull();
  });

  it("hides money and product up to what the place can hold, and gives it back", () => {
    const p = mk(2);
    stash(p, "put", "dirty");
    expect(p.dirty).toBe(20_000 - STASH.money[2]);
    expect(p.stash?.varrow?.dirty).toBe(STASH.money[2]);
    expect(() => stash(p, "put", "cash", 10)).toThrow(/full/);
    stash(p, "put", "herb");
    expect(p.drugs?.herb).toBe(30 - STASH.units[2]);
    stash(p, "take", "dirty", 1_000);
    expect(p.dirty).toBe(20_000 - STASH.money[2] + 1_000);
    expect(() => stash(p, "take", "pills")).toThrow(/none/);
  });

  it("hide everything risky in one go", () => {
    const p = mk(5);
    applyAction(p, { type: "stash", op: "put_all" }, NOW, always(0.5));
    expect(p.dirty).toBe(0);
    expect(p.drugs?.herb).toBe(0);
    expect(p.drugs?.powder).toBe(0);
    expect(p.cash).toBe(5_000);
    expect(stashView(p).units).toBe(35);
  });

  it("is only reachable in that city", () => {
    const p = mk(2);
    stash(p, "put", "dirty", 500);
    p.country = "solmarra";
    p.homes = { ...(p.homes ?? {}), solmarra: 2 };
    expect(() => stash(p, "take", "dirty")).toThrow(/none/);
    expect(stashView(p).elsewhere[0]).toMatchObject({ money: 500 });
  });

  it("a warrant takes the dirty money and product, not the clean cash", () => {
    const p = mk(3);
    stash(p, "put", "cash", 1_000);
    stash(p, "put", "dirty", 4_000);
    stash(p, "put", "powder");
    expect(seizeStash(p, "varrow")).toEqual({ dirty: 4_000, units: 5 });
    expect(p.stash?.varrow).toEqual({ cash: 1_000, dirty: 0, drugs: {} });
  });
});
