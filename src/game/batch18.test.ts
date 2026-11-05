import { describe, expect, it } from "vitest";
import { BALANCE } from "./balance";
import { exitChecklist, exitJobsNeeded, mustGetOut } from "./career";
import { applyAction, createPlayer, tick } from "./engine";
import type { Player } from "./types";

const T0 = 1_800_000_000_000;
const LATER = T0 + BALANCE.pvp.protectionMs + 1;
const always = (v: number) => () => v;
const mk = (path: Player["path"], rank: number) => {
  const p = createPlayer("p", "Pia", T0);
  tick(p, LATER);
  p.path = path;
  p.rank = rank;
  p.energy = 100;
  p.cash = 500;
  return p;
};

describe("getting out", () => {
  it("the Mafia always has to get out; the higher the rank, the longer the way back", () => {
    expect(mustGetOut(mk("enforcer", 1))).toBe(true);
    expect(exitJobsNeeded(mk("enforcer", 1))).toBe(5);
    expect(exitJobsNeeded(mk("enforcer", 7))).toBe(35);
  });

  it("an honest lawyer simply resigns; a dirty one has to clean up first", () => {
    const honest = mk("courts", 4);
    expect(mustGetOut(honest)).toBe(false);
    applyAction(honest, { type: "leave_career" }, LATER, always(0.5));
    expect(honest.path).toBeNull();

    const dirty = mk("police", 3);
    dirty.dirty = 400;
    expect(mustGetOut(dirty)).toBe(true);
    expect(() => applyAction(dirty, { type: "leave_career" }, LATER, always(0.5))).toThrow(/dirty/);
    expect(exitJobsNeeded(dirty)).toBe(9);
  });

  it("honest jobs count toward getting out; one crooked job resets the count", () => {
    const p = mk("enforcer", 1);
    applyAction(p, { type: "start_exit" }, LATER, always(0.5));
    applyAction(p, { type: "job", jobId: "cans" }, LATER + 1000, always(0.5));
    applyAction(p, { type: "job", jobId: "cans" }, LATER + 2000, always(0.5));
    expect(p.exiting?.jobs).toBe(2);
    const ev = applyAction(p, { type: "job", jobId: "shoplift" }, LATER + 3000, always(0.5));
    expect(p.exiting?.jobs).toBe(0);
    expect(ev.some((e) => /square one/.test(e.text))).toBe(true);
  });

  it("the checklist shows what's left, and leaving works once everything is done", () => {
    const p = mk("enforcer", 2);
    applyAction(p, { type: "start_exit" }, LATER, always(0.5));
    p.heat = 30;
    p.dirty = 50;
    const left = exitChecklist(p, LATER).filter((i) => !i.done).map((i) => i.id);
    expect(left).toEqual(expect.arrayContaining(["jobs", "heat", "dirty"]));
    p.exiting = { at: LATER, jobs: 10 };
    p.heat = 0;
    p.dirty = 0;
    p.stats.integrity = 5;
    applyAction(p, { type: "leave_career" }, LATER + 5000, always(0.5));
    expect(p.path).toBeNull();
    expect(p.exiting).toBeNull();
  });

  it("you can change your mind", () => {
    const p = mk("enforcer", 3);
    applyAction(p, { type: "start_exit" }, LATER, always(0.5));
    applyAction(p, { type: "abandon_exit" }, LATER + 1, always(0.5));
    expect(p.exiting).toBeNull();
  });
});
