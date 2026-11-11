import { describe, expect, it } from "vitest";
import { advanceCity, newCity, termEnds } from "./city";
import { createPlayer, tick } from "./engine";
import { BALANCE } from "./balance";
import { CIVIC, fileRegular, regularCandidate, regularMayorDay, regularsVote } from "./regcivic";
import type { PathId, Player } from "./types";

const NOW = Date.UTC(2027, 10, 1, 12);
const reg = (key: string, path: PathId | null, rank: number, rep: number, cash: number): Player => {
  const p = createPlayer(`reg-varrow-${key}`, key[0].toUpperCase() + key.slice(1), NOW - 90 * 86_400_000, "varrow");
  p.path = path;
  p.rank = rank;
  p.regular = { country: "varrow", key, slot: -1 };
  tick(p, NOW);
  p.reputation = rep;
  p.cash = cash;
  return p;
};

describe("regulars at city hall", () => {
  it("with no mayor, the best-standing regular who can pay files; only one regular per ballot", () => {
    const c = newCity("varrow", NOW);
    const regs = [reg("webb", "police", 6, 120, 2000), reg("gus", null, 0, 10, 50), reg("crowe", "enforcer", 7, 150, 400)];
    const cand = regularCandidate(c, regs, NOW)!;
    expect(cand.name).toBe("Webb");
    fileRegular(c, cand, NOW, Math.random);
    expect(cand.cash).toBe(2000 - BALANCE.city.runFee);
    expect(regularCandidate(c, regs, NOW)).toBeNull();
  });

  it("with a mayor in office, players get the first half-day of the ballot", () => {
    const c = newCity("varrow", NOW);
    c.mayor = { id: "acct_m", name: "M", since: NOW };
    const open = termEnds(c.term) - BALANCE.city.electionMs;
    const regs = [reg("webb", "police", 6, 120, 2000)];
    expect(regularCandidate(c, regs, open + 60_000)).toBeNull();
    expect(regularCandidate(c, regs, open + CIVIC.playersFirstMs + 1)?.name).toBe("Webb");
  });

  it("players' votes decide; the street's only count when players don't", () => {
    const c = newCity("varrow", NOW);
    const webb = reg("webb", "police", 6, 120, 2000);
    fileRegular(c, webb, NOW, Math.random);
    c.candidates.push({ id: "acct_p", name: "Player", title: "x", reputation: 30, pitch: "", at: NOW });
    const regs = [webb, reg("teo", "police", 3, 30, 0), reg("ivy", "courts", 2, 20, 0), reg("bea", "banking", 2, 20, 0)];
    regularsVote(c, regs, regs, NOW, () => 0.5);
    expect(Object.keys(c.regularVotes!)).toHaveLength(4);
    // One player vote for the player beats every regular vote for Webb.
    c.votes = { acct_v: "acct_p" };
    const a = structuredClone(c);
    advanceCity(a, termEnds(a.term) + 1);
    expect(a.mayor?.name).toBe("Player");
    // No player votes: the street decides.
    const b = structuredClone(c);
    b.votes = {};
    advanceCity(b, termEnds(b.term) + 1);
    expect(b.mayor?.name).toBe("Webb");
  });

  it("a regular mayor governs within limits: moderate taxes, a chief, never a pardon", () => {
    const c = newCity("varrow", NOW);
    const webb = reg("webb", "police", 6, 120, 0);
    c.mayor = { id: webb.id, name: webb.name, since: NOW };
    c.treasury = 1000;
    const chief = reg("teo", "police", 4, 30, 0);
    regularMayorDay(c, webb, [chief], NOW, () => 0.5);
    expect(c.taxRate).toBeGreaterThanOrEqual(CIVIC.tax.law[0]);
    expect(c.taxRate).toBeLessThanOrEqual(CIVIC.tax.law[1]);
    expect(c.chief?.id).toBe(chief.id);
    expect(webb.cash).toBe(BALANCE.city.salary);
    expect(c.pardonTerm).toBe(-1);
  });
});
