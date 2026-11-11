// The regulars take part in city hall like residents: one of them may run for mayor, they all
// vote, and a regular who wins governs (taxes, bounties, crackdowns, a police chief, the soup
// kitchen, and, if they're crooked, the odd skim that internal affairs can catch).
//
// Limiters, so the city stays the players' to run:
//  - At most one regular on the ballot per city per term, and only someone with the standing
//    and the cash to file (the same fee as anyone).
//  - Regulars' votes are counted apart and only decide an election when players' votes don't:
//    a tie among players, or no player votes at all. Players always outvote the street.
//  - A regular mayor never pardons anyone, keeps taxes moderate, and doesn't touch witness
//    protection. Regulars never sign recall petitions.

import { BALANCE } from "./balance";
import { PATHS, rankTitle } from "./content/paths";
import { appointChief, collectSalary, crackdown, electionOpen, fundSoup, isMayor, setBounty, setTax, skim, termEnds } from "./city";
import { inJail } from "./engine";
import type { City, Player, Rng } from "./types";

const B = BALANCE.city;

export const CIVIC = {
  /** Players get this long into an open ballot before a regular files (unless the office is empty). */
  playersFirstMs: 12 * 60 * 60_000,
  /** A regular mayor's taxes stay within this band. */
  tax: { law: [0.03, 0.05] as [number, number], crime: [0.01, 0.03] as [number, number] },
  /** Chance a crooked regular mayor skims on a given day, and the most they take. */
  skimChance: 0.3,
  skimShare: 0.1,
};

/** "law", "crime" or "street": how a regular sees the world. */
export function sideOf(p: Pick<Player, "path">): "law" | "crime" | "street" {
  if (!p.path) return "street";
  return PATHS[p.path].side === "law" ? "law" : "crime";
}

const ballotOpenedAt = (c: City) => termEnds(c.term) - B.electionMs;

/** The regular who would file for mayor now, if any. */
export function regularCandidate(c: City, regs: Player[], now: number): Player | null {
  if (!electionOpen(c, now)) return null;
  if (c.mayor && now - ballotOpenedAt(c) < CIVIC.playersFirstMs) return null;
  if (c.candidates.some((x) => x.id.startsWith("reg-"))) return null;
  const able = regs.filter((r) => !r.dead && !inJail(r, now) && r.reputation >= B.runReputation && r.cash >= B.runFee && !c.candidates.some((x) => x.id === r.id));
  return able.sort((a, b) => b.reputation + b.rank * 10 - (a.reputation + a.rank * 10))[0] ?? null;
}

const PITCH: Record<"law" | "crime" | "street", string[]> = {
  law: ["Safe streets, honest books.", "More patrols, fewer excuses.", "A city that works for people who work."],
  crime: ["Lower taxes. Fewer questions.", "Let business be business.", "I take care of my people."],
  street: ["Somebody from the street, for once.", "Cheap food, open doors.", "Nobody's listening to us. I will."],
};

/** Files the regular for mayor, paying the fee from cash. */
export function fileRegular(c: City, r: Player, now: number, rng: Rng): string {
  r.cash -= B.runFee;
  const lines = PITCH[sideOf(r)];
  c.candidates.push({ id: r.id, name: r.name, title: rankTitle(r) ?? "Resident", reputation: r.reputation, pitch: lines[Math.floor(rng() * lines.length)], at: now });
  const line = `${r.name} is running for mayor.`;
  c.log = [{ at: now, text: line }, ...c.log].slice(0, 20);
  return line;
}

/** How much a regular likes a candidate: their own side first, then standing, then a little chance. */
function appeal(voter: Player, cand: { id: string; reputation: number }, candidate: Player | undefined, rng: Rng): number {
  const same = candidate ? (sideOf(candidate) === sideOf(voter) ? 3 : 0) : 0;
  return same + Math.log10(1 + Math.max(0, cand.reputation)) + rng() * 2;
}

/** Regulars who haven't voted this term cast a vote (counted apart from players' votes). */
export function regularsVote(c: City, regs: Player[], people: Player[], now: number, rng: Rng): number {
  if (!electionOpen(c, now) || !c.candidates.length) return 0;
  c.regularVotes = c.regularVotes ?? {};
  let n = 0;
  for (const r of regs) {
    if (r.dead || c.regularVotes[r.id]) continue;
    const ranked = c.candidates
      .filter((x) => x.id !== r.id)
      .map((x) => ({ id: x.id, score: appeal(r, x, people.find((p) => p.id === x.id), rng) }))
      .sort((a, b) => b.score - a.score);
    // A candidate votes for themselves.
    const choice = c.candidates.some((x) => x.id === r.id) ? r.id : ranked[0]?.id;
    if (!choice) continue;
    c.regularVotes[r.id] = choice;
    n += 1;
  }
  return n;
}

/** Regular votes per candidate. */
export function regularTally(c: City): Map<string, number> {
  const out = new Map<string, number>(c.candidates.map((x) => [x.id, 0]));
  for (const id of Object.values(c.regularVotes ?? {})) if (out.has(id)) out.set(id, out.get(id)! + 1);
  return out;
}

/**
 * A regular mayor's day: draw the salary, set taxes and the bounty once a term, appoint a chief,
 * now and then a crackdown (law) or a skim (crooked), and feed the soup kitchen when there's
 * money. Returns lines for the city log (already announced by the actions themselves).
 */
export function regularMayorDay(c: City, mayor: Player, police: Player[], now: number, rng: Rng): void {
  if (!mayor.regular || !isMayor(c, mayor) || inJail(mayor, now)) return;
  const side = sideOf(mayor);
  const tryIt = (fn: () => unknown) => {
    try {
      fn();
    } catch {
      /* not today */
    }
  };
  if (now - c.lastSalaryAt >= B.salaryEveryMs && c.treasury > 0) tryIt(() => collectSalary(c, mayor, now));
  if ((c.policyTerm ?? -1) !== c.term) {
    c.policyTerm = c.term;
    const [lo, hi] = side === "law" ? CIVIC.tax.law : CIVIC.tax.crime;
    tryIt(() => setTax(c, mayor, Math.round((lo + rng() * (hi - lo)) * 100) / 100, now));
    tryIt(() => setBounty(c, mayor, side === "law" ? 50 + Math.round(rng() * 5) * 10 : 0, now));
  }
  if (!c.chief) {
    const best = police.filter((o) => o.path === "police" && o.rank >= B.chiefRank && o.id !== mayor.id).sort((a, b) => b.rank - a.rank)[0];
    if (best) tryIt(() => appointChief(c, mayor, best, now));
  }
  if (side === "law" && rng() < 0.25 && now - c.lastCrackdownAt >= B.crackdownCooldownMs) tryIt(() => crackdown(c, mayor, now));
  if (side !== "law" && rng() < CIVIC.skimChance && c.treasury > 200 && !(c.skims ?? []).some((s) => s.mayorId === mayor.id && now - s.at < 24 * 60 * 60_000)) {
    tryIt(() => skim(c, mayor, Math.floor(c.treasury * CIVIC.skimShare * rng()) + 1, now));
  }
  if (side !== "crime" && rng() < 0.05 && c.treasury > 500 && (c.soupMeals ?? 0) < 20) tryIt(() => fundSoup(c, mayor, 100, now));
}
