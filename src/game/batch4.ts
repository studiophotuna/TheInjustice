// Election campaigns and vote buying, loans and loan sharks, revenge contracts.

import { fightFace } from "./social";
import { assertNotAlt } from "./anticheat";
import { BALANCE } from "./balance";
import { playerFighter, resolveFight } from "./combat";
import { CRIMES, caseCold } from "./crime";
import { countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { notify } from "./social";
import { canPayIllegal, earnDirty, payIllegal, takeCarried } from "./money";
import { sv } from "./stats";
import { GameError, type CaseFile, type City, type FightSummary, type GameEvent, type Loan, type Player, type Rng } from "./types";

const C = BALANCE.campaign;
const L = BALANCE.loans;
const K = BALANCE.contracts;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// ── Campaigns and vote buying ──────────────────────────────────────────────

/** How loud a campaign is, in words. */
export function buzzWord(spent: number): string | null {
  if (spent <= 0) return null;
  return spent < 300 ? "a few posters" : spent < 1000 ? "posters on every corner" : spent < 3000 ? "rallies every night" : "the whole city is talking";
}

export function campaign(c: City, p: Player, amount: number, now: number): GameEvent[] {
  const cand = c.candidates.find((x) => x.id === p.id);
  if (!cand) throw new GameError("You're not on the ballot.");
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a < C.min) throw new GameError(`At least $${C.min}.`);
  if (!p.hasBankAccount || p.bank < a) throw new GameError("You don't have that much in the bank.");
  p.bank -= a;
  cand.spent = (cand.spent ?? 0) + a;
  c.treasury += Math.floor(a * C.permitShare);
  if ((cand.spent ?? 0) - a < 300 && (cand.spent ?? 0) >= 300) {
    c.log = [{ at: now, text: `${p.name}'s campaign posters are on every corner.` }, ...c.log].slice(0, 20);
  }
  return [{ tone: "good", text: `$${a} into the campaign. ${buzzWord(cand.spent ?? 0)}.` }];
}

/** A candidate slips a resident cash for their vote. Nobody sees it but internal affairs. */
export function buyVote(c: City, candidate: Player, voter: Player, amount: number, now: number): GameEvent[] {
  assertNotAlt(candidate, voter);
  if (!c.candidates.some((x) => x.id === candidate.id)) throw new GameError("You're not on the ballot.");
  if (voter.id === candidate.id) throw new GameError("You already have your own vote.");
  if (countryOf(voter) !== c.country) throw new GameError("They don't live here.");
  if (c.votes[voter.id]) throw new GameError("They already voted.");
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a < C.minBribe) throw new GameError(`Nobody sells their vote for less than $${C.minBribe}.`);
  if (!canPayIllegal(candidate, a)) throw new GameError("You don't have that much on you.");
  payIllegal(candidate, a);
  earnDirty(voter, a);
  shiftIntegrity(candidate, -4);
  c.voteBuys = [...(c.voteBuys ?? []), { candidateId: candidate.id, voterId: voter.id, amount: a, at: now }];
  notify(voter, `${candidate.name} pressed $${a} into your hand. "For your vote." The ballot is still secret.`, "info", candidate, now);
  return [{ tone: "info", text: `You slip ${voter.name} $${a}. Whether they vote for you is their business.` }];
}

/** Unexposed vote buying by this candidate (for internal affairs). */
export function voteBuysBy(c: City, id: string) {
  return (c.voteBuys ?? []).filter((v) => v.candidateId === id && !v.exposed);
}

// ── Loans ──────────────────────────────────────────────────────────────────

/** Bankers lend at legal rates; the Mafia lends at whatever rate it likes. */
export function lenderKind(p: Player): Loan["kind"] | null {
  if (p.path === "banking" && p.rank >= BALANCE.casework.bank.minRank) return "bank";
  if (p.path === "enforcer" && p.rank >= 2) return "shark";
  return null;
}

export function offerLoan(lender: Player, borrower: Player, amount: number, rate: number, now: number): GameEvent[] {
  assertNotAlt(lender, borrower);
  const kind = lenderKind(lender);
  if (!kind) throw new GameError("Only bankers and the Mafia lend money.");
  if (lender.id === borrower.id) throw new GameError("You can't lend to yourself.");
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a < L.min) throw new GameError(`Loans start at $${L.min}.`);
  const maxRate = kind === "bank" ? L.bankMaxRate : L.sharkMaxRate;
  if (!Number.isFinite(rate) || rate < 0 || rate > maxRate) throw new GameError(`Interest between 0% and ${Math.round(maxRate * 100)}%.`);
  if (lender.bank < a) throw new GameError("You don't have that much in the bank.");
  if ((borrower.loanOffers ?? []).some((o) => o.lenderId === lender.id)) throw new GameError("You already made them an offer.");
  borrower.loanOffers = [...(borrower.loanOffers ?? []), { id: `${lender.id.slice(0, 6)}${now}`, lenderId: lender.id, lenderName: lender.name, kind, amount: a, rate, at: now }];
  notify(borrower, `${lender.name} offers you a $${a} loan at ${Math.round(rate * 100)}%. Check your loans.`, "info", lender, now);
  return [{ tone: "good", text: `You offer ${borrower.name} $${a} at ${Math.round(rate * 100)}%.` }];
}

export function acceptLoan(borrower: Player, lender: Player, offerId: string, now: number): GameEvent[] {
  assertNotAlt(borrower, lender);
  const offer = (borrower.loanOffers ?? []).find((o) => o.id === offerId);
  if (!offer || offer.lenderId !== lender.id) throw new GameError("That offer is gone.");
  borrower.loanOffers = (borrower.loanOffers ?? []).filter((o) => o.id !== offerId);
  if (lender.bank < offer.amount) throw new GameError(`${lender.name} doesn't have the money anymore.`);
  lender.bank -= offer.amount;
  borrower.cash += offer.amount;
  const loan: Loan = {
    id: offer.id,
    kind: offer.kind,
    lenderId: lender.id,
    lenderName: lender.name,
    borrowerId: borrower.id,
    borrowerName: borrower.name,
    owed: Math.round(offer.amount * (1 + offer.rate)),
    due: now + L.termMs,
    status: "active",
  };
  borrower.loans = [...(borrower.loans ?? []), loan];
  lender.loans = [...(lender.loans ?? []), { ...loan }];
  notify(lender, `${borrower.name} took your $${offer.amount} loan. They owe you $${loan.owed}.`, "good", borrower, now);
  return [{ tone: "good", text: `$${offer.amount} in your pocket. You owe ${lender.name} $${loan.owed} within three days.` }];
}

function closeLoan(borrower: Player, lender: Player, id: string, status: Loan["status"]) {
  for (const p of [borrower, lender]) p.loans = (p.loans ?? []).map((l) => (l.id === id ? { ...l, status } : l)).filter((l) => l.status === "active" || l.id === id).slice(-10);
}

export function repayLoan(borrower: Player, lender: Player, id: string, now: number): GameEvent[] {
  const loan = (borrower.loans ?? []).find((l) => l.id === id && l.status === "active");
  if (!loan) throw new GameError("No such debt.");
  if (borrower.cash + borrower.bank < loan.owed) throw new GameError(`You need $${loan.owed}.`);
  const fromCash = Math.min(borrower.cash, loan.owed);
  borrower.cash -= fromCash;
  borrower.bank -= loan.owed - fromCash;
  lender.bank += loan.owed;
  closeLoan(borrower, lender, id, "repaid");
  if (now <= loan.due) borrower.reputation += 1;
  notify(lender, `${borrower.name} paid back $${loan.owed}.`, "good", borrower, now);
  return [{ tone: "good", text: `Debt paid: $${loan.owed} to ${lender.name}.` }];
}

/**
 * An overdue debt. Bankers seize what's in the borrower's bank account. Loan sharks send the
 * muscle: a fight, and the winner decides how it ends.
 */
export function collectLoan(lender: Player, borrower: Player, id: string, now: number, rng: Rng): { events: GameEvent[]; fight?: FightSummary } {
  const loan = (lender.loans ?? []).find((l) => l.id === id && l.status === "active" && l.lenderId === lender.id);
  if (!loan) throw new GameError("No such loan.");
  if (now < loan.due) throw new GameError("It's not due yet.");
  if (loan.kind === "bank") {
    const take = Math.min(borrower.bank, loan.owed);
    borrower.bank -= take;
    lender.bank += take;
    borrower.reputation = Math.max(0, borrower.reputation - 3);
    closeLoan(borrower, lender, id, "collected");
    notify(borrower, `The bank seized $${take} from your account for your overdue loan.`, "bad", lender, now);
    return { events: [{ tone: "good", text: `You seize $${take} of the $${loan.owed} owed from ${borrower.name}'s account.` }] };
  }
  if (inJail(borrower, now) || inHospital(borrower, now) || borrower.travel || countryOf(borrower) !== countryOf(lender)) {
    throw new GameError("You can't get to them right now.");
  }
  if (lender.energy < L.collectEnergy) throw new GameError("You're too tired.");
  lender.energy -= L.collectEnergy;
  const res = resolveFight(playerFighter(lender, 100), { ...playerFighter(borrower, 100), hp: borrower.hp }, rng);
  const fight: FightSummary = { opponent: borrower.name, icon: "🧍", won: res.won, lines: res.lines, beats: res.beats, start: res.start, outcome: res.won ? "win" : "loss", face: fightFace(borrower) };
  lender.hp = Math.max(5, res.playerHp);
  lender.heat += 4;
  if (!res.won) {
    notify(borrower, `${lender.name} came to collect and you sent them packing. The debt is still there.`, "good", lender, now);
    return { events: [{ tone: "bad", text: `${borrower.name} fights you off. The debt stands.`, fight }], fight };
  }
  const fromCash = takeCarried(borrower, loan.owed);
  const fromBank = Math.min(borrower.bank, loan.owed - fromCash);
  borrower.bank -= fromBank;
  earnDirty(lender, fromCash + fromBank);
  borrower.hp = Math.max(5, borrower.hp - 40);
  closeLoan(borrower, lender, id, "collected");
  notify(borrower, `${lender.name} came to collect. You paid $${fromCash + fromBank}, and then some.`, "bad", lender, now);
  return { events: [{ tone: "good", text: `${borrower.name} pays up: $${fromCash + fromBank}.`, fight }], fight };
}

// ── Revenge contracts ──────────────────────────────────────────────────────

export function postContract(victim: Player, c: CaseFile, reward: number, now: number): GameEvent[] {
  if (c.victimId !== victim.id) throw new GameError("You weren't the one robbed.");
  if (c.contract && !c.contract.done) throw new GameError("There's already a contract out.");
  if (c.trial?.verdict === "guilty") throw new GameError("The court already took care of it.");
  const r = Math.floor(reward);
  if (!Number.isFinite(r) || r < K.min) throw new GameError(`At least $${K.min}, or nobody will bother.`);
  if (!victim.hasBankAccount || victim.bank < r) throw new GameError("You don't have that much in the bank.");
  victim.bank -= r;
  c.contract = { posterId: victim.id, posterName: victim.name, reward: r, at: now, tried: [], done: false };
  return [{ tone: "good", text: `Word goes out: $${r} to whoever gets your money back for case #${c.id}.` }];
}

export function contractBlock(m: Player, c: CaseFile, now: number): string | null {
  if (!(m.path === "enforcer" && m.rank >= 2)) return "Only the Mafia takes these jobs.";
  if (!c.contract || c.contract.done) return "That job is done.";
  if (c.culpritId === m.id) return "Collecting from yourself would be awkward.";
  if (c.victimId === m.id) return "Hire someone else.";
  if (c.contract.tried.includes(m.id)) return "You already tried this one.";
  if (countryOf(m) !== c.country) return "That's in another country.";
  if (inJail(m, now) || inHospital(m, now)) return "You're in no shape for it.";
  if (m.energy < K.energy) return "You're too tired.";
  return null;
}

/** Odds of tracking the robber down from the clues. */
export function trackOdds(m: Player, c: CaseFile): number {
  return clamp(0.25 + 0.08 * c.tips.length + (sv(m, "wits") + sv(m, "perception") - 20) / 150, 0.1, 0.9);
}

/**
 * A Mafia player takes the job: asks around (wits, perception, and the clues), then collects
 * from whoever did it. `culprit` is the real criminal (server-only).
 */
export function workContract(m: Player, c: CaseFile, culprit: Player | null, victim: Player | null, now: number, rng: Rng): { events: GameEvent[]; fight?: FightSummary } {
  const block = contractBlock(m, c, now);
  if (block) throw new GameError(block);
  m.energy -= K.energy;
  const k = c.contract!;
  k.tried.push(m.id);
  if (!culprit || culprit.dead || rng() >= trackOdds(m, c)) {
    return { events: [{ tone: "info", text: "You ask around for hours. The trail goes cold." }] };
  }
  if (inJail(culprit, now) || inHospital(culprit, now) || culprit.travel || countryOf(culprit) !== c.country) {
    return { events: [{ tone: "info", text: "You find out who did it, but they're out of reach for now." }] };
  }
  const res = resolveFight(playerFighter(m, 100), { ...playerFighter(culprit, 100), hp: culprit.hp }, rng);
  const fight: FightSummary = { opponent: "The robber", icon: "🧍", won: res.won, lines: res.lines, beats: res.beats, start: res.start, outcome: res.won ? "win" : "loss" };
  m.hp = Math.max(5, res.playerHp);
  m.heat += 4;
  const what = CRIMES[c.kind].name.toLowerCase();
  if (!res.won) {
    notify(culprit, `Someone came after you over the ${what} in ${c.district}. You handled it.`, "good", undefined, now);
    return { events: [{ tone: "bad", text: "You found the robber, but they were too much for you.", fight }], fight };
  }
  const want = c.amount;
  const fromCash = takeCarried(culprit, want);
  const fromBank = Math.min(culprit.bank, want - fromCash);
  culprit.bank -= fromBank;
  culprit.hp = Math.max(5, culprit.hp - 35);
  const recovered = fromCash + fromBank;
  if (victim) victim.cash += recovered;
  earnDirty(m, k.reward);
  k.done = true;
  notify(culprit, `Someone came to collect for the ${what} in ${c.district}. You paid back $${recovered}.`, "bad", undefined, now);
  if (victim) notify(victim, `Your contract on case #${c.id} is done. $${recovered} came back to you.`, "good", undefined, now);
  return { events: [{ tone: "good", text: `You found the robber and made them pay: $${recovered} back to ${k.posterName}, $${k.reward} for you.`, fight }], fight };
}

export function contractView(c: CaseFile, m: Player, now: number) {
  return {
    caseId: c.id,
    crime: CRIMES[c.kind].name,
    district: c.district,
    victimName: c.victimName,
    reward: c.contract!.reward,
    clues: c.tips.map((t) => t.text),
    canTake: contractBlock(m, c, now),
    cold: caseCold(c, now),
  };
}
