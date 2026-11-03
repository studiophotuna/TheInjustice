// Stage 3 of the justice chain: other careers feed the case files.
//  - Doctors examine victims of snatches and muggings: reliable physical clues.
//  - Bankers review cash deposits made soon after a crime: report them (a name clue from
//    bank records) or bury them for a fee.
//  - Vigilantes hunt suspects on cold cases the police couldn't close, outside the law.

import { BALANCE } from "./balance";
import { playerFighter, resolveFight } from "./combat";
import { CRIMES, addTip, caseCold, suspectsFor, type SuspectMatch } from "./crime";
import { addMerit, countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { notify, protectedUntil } from "./social";
import { COUNTRY_BY_ID } from "./content/world";
import { GameError, type CaseFile, type FightSummary, type GameEvent, type Player, type Rng } from "./types";

const C = BALANCE.casework;

export const isMedic = (p: Player) => p.path === "medicine" && p.rank >= C.clinic.minRank;
export const isBanker = (p: Player) => p.path === "banking" && p.rank >= C.bank.minRank;
export const isVigilante = (p: Player) => p.path === "vigilante" && p.rank >= C.vigilante.minRank;

// ── Doctors ────────────────────────────────────────────────────────────────

export function examineBlock(d: Player, c: CaseFile, now: number): string | null {
  if (!isMedic(d)) return "Only doctors can examine victims.";
  if (countryOf(d) !== c.country) return "That patient is in another country.";
  if (c.kind === "pickpocket") return "A pickpocket leaves no marks.";
  if (c.examinedBy) return `${c.examinedBy.name} already examined this patient.`;
  if (caseCold(c, now) || c.trial?.verdict || c.hunt) return "This case is closed.";
  if (d.id === c.victimId) return "You can't examine yourself.";
  if (d.id === c.culpritId) return "Better not get involved with this one.";
  return null;
}

/** Bruises and scrapes tell a doctor about the attacker's build and speed. */
export function examine(d: Player, c: CaseFile, victim: Player | null, now: number, rng: Rng): GameEvent[] {
  const block = examineBlock(d, c, now);
  if (block) throw new GameError(block);
  c.examinedBy = { id: d.id, name: d.name, at: now };
  const tip = addTip(c, "doctor", Math.min(0.97, 0.85 + d.rank * 0.015), now, rng, d.id, "Doctor", ["build", "reflexes"]);
  const fee = C.clinic.fee + d.rank * C.clinic.feePerRank;
  d.cash += fee;
  d.reputation += 1;
  d.stats.perception += 0.4;
  const events: GameEvent[] = [...addMerit(d, "medicine", 2), { tone: "good", text: `You examine ${c.victimName}. ${tip.text.replace(/^Doctor: /, "")} The city pays $${fee}.` }];
  if (victim) {
    if (inHospital(victim, now)) victim.hospitalUntil = now + Math.round((victim.hospitalUntil - now) / 2);
    notify(victim, `Dr. ${d.name} examined your injuries${inHospital(victim, now) ? " and sped up your recovery" : ""}. The report went into case #${c.id}.`, "good", d, now);
  }
  return events;
}

// ── Bankers ────────────────────────────────────────────────────────────────

/** A stable, meaningless account number so bankers never see the customer's name. */
export function accountNumber(playerId: string): string {
  let h = 0;
  for (const ch of playerId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return `${String(1000 + (h % 9000))}-${String(h % 97).padStart(2, "0")}`;
}

/** Files a flagged deposit on its case (called by the server after a deposit). */
export function fileDeposit(c: CaseFile, depositor: { id: string }, flag: { amount: number; at: number }): boolean {
  if (c.culpritId !== depositor.id || c.deposit || c.trial?.verdict || c.hunt) return false;
  c.deposit = { amount: flag.amount, at: flag.at, account: accountNumber(depositor.id) };
  return true;
}

export function reviewBlock(b: Player, c: CaseFile, now: number): string | null {
  if (!isBanker(b)) return "Only bank officers review deposits.";
  if (countryOf(b) !== c.country) return "That bank is in another country.";
  if (!c.deposit) return "Nothing to review.";
  if (c.deposit.review) return "Already reviewed.";
  if (caseCold(c, now) || c.trial?.verdict || c.hunt) return "This case is closed.";
  if (b.id === c.culpritId) return "That's your own account.";
  return null;
}

/**
 * "report": bank records give the police part of the account holder's name.
 * "bury": the banker takes a fee from the account and the flag disappears.
 */
export function reviewDeposit(b: Player, c: CaseFile, depositor: Player | null, choice: "report" | "bury", now: number, rng: Rng): GameEvent[] {
  const block = reviewBlock(b, c, now);
  if (block) throw new GameError(block);
  const dep = c.deposit!;
  dep.review = choice === "report" ? "reported" : "buried";
  dep.reviewerName = b.name;
  dep.reviewerId = b.id;
  if (choice === "report") {
    const tip = addTip(c, "bank", 1, now, rng, b.id, "Bank records", ["nameStart", "nameEnd", "nameLength"]);
    b.reputation += 1;
    shiftIntegrity(b, 1);
    b.stats.wits += 0.4;
    return [{ tone: "good", text: `You file a report on account ${dep.account}. ${tip.text.replace(/^Bank records: /, "")}` }, ...addMerit(b, "banking", 2)];
  }
  const fee = depositor ? Math.min(depositor.bank, Math.floor(dep.amount * C.bank.buryShare)) : 0;
  if (depositor) {
    depositor.bank -= fee;
    notify(depositor, `A bank officer made a problem with your deposit disappear. Handling fee: $${fee}.`, "info", undefined, now);
  }
  b.cash += fee;
  shiftIntegrity(b, -5);
  addMerit(b, "banking", 0.5);
  return [{ tone: "info", text: `The flag on account ${dep.account} quietly disappears. $${fee} finds its way into your pocket.` }];
}

// ── Vigilantes ─────────────────────────────────────────────────────────────

export function huntBlock(v: Player, c: CaseFile, suspect: Player | null, eligible: SuspectMatch[], now: number): string | null {
  if (!isVigilante(v)) return "Only vigilantes take cold cases.";
  if (countryOf(v) !== c.country) return "That case is in another country.";
  if (c.trial) return "The courts have this one.";
  if (c.hunt) return "Someone already went after this one.";
  if (c.payoff?.status === "taken") return "The file is gone.";
  if (!caseCold(c, now)) return "The police are still on it. Wait until it goes cold.";
  if (c.tips.length < 2) return "Not enough clues to go on.";
  if (!suspect || suspect.dead) return "They're not around anymore.";
  if (suspect.id === v.id) return "You can't hunt yourself.";
  if (!eligible.some((s) => s.id === suspect.id)) return "They don't fit the clues well enough.";
  if (countryOf(suspect) !== c.country || suspect.travel) return "They've left the country.";
  if (inJail(suspect, now)) return "They're behind bars already.";
  if (inHospital(suspect, now)) return "They're in the clinic.";
  if (now < protectedUntil(suspect)) return "They're new in town.";
  if (inJail(v, now) || inHospital(v, now)) return "You're in no shape to hunt.";
  if (v.energy < C.vigilante.energy) return "You're too tired.";
  if (v.hp < 20) return "You're too hurt.";
  return null;
}

/** The vigilante corners a suspect. No judge, no jury, and no protection from the law. */
export function hunt(
  v: Player,
  suspect: Player,
  victim: Player | null,
  c: CaseFile,
  pool: { player: Player; crewTag: string | null }[],
  suspectCrewTag: string | null,
  now: number,
  rng: Rng,
): { events: GameEvent[]; fight: FightSummary } {
  const eligible = suspectsFor(c, [...pool.filter((x) => x.player.id !== suspect.id), { player: suspect, crewTag: suspectCrewTag }]);
  const block = huntBlock(v, c, suspect, eligible, now);
  if (block) throw new GameError(block);
  v.energy -= C.vigilante.energy;
  v.heat += C.vigilante.heat * COUNTRY_BY_ID[c.country].heatMult;

  const res = resolveFight(playerFighter(v, 100), { ...playerFighter(suspect, 100), hp: suspect.hp }, rng);
  const fight: FightSummary = { opponent: suspect.name, icon: "🧍", won: res.won, lines: res.lines, outcome: res.won ? "win" : "loss" };
  v.hp = res.playerHp;
  const crime = CRIMES[c.kind].name.toLowerCase();
  let restitution = 0;
  const events: GameEvent[] = [{ tone: res.won ? "good" : "bad", text: `Hunt: ${suspect.name}`, fight }];

  if (res.won) {
    suspect.hp = Math.max(1, suspect.hp - Math.max(30, suspect.hp * 0.6));
    restitution = Math.min(suspect.cash, c.amount);
    suspect.cash -= restitution;
    if (victim && victim.id !== suspect.id) {
      victim.cash += restitution;
      notify(victim, `A masked figure left an envelope at your door: $${restitution}, and a note: "Case #${c.id}. Handled."`, "good", undefined, now);
    }
    v.reputation += 3;
    v.stats.nerve += 0.5;
    notify(suspect, `A masked vigilante caught you alone and made you pay for the ${crime} in ${c.district}${restitution ? `: $${restitution}` : ""}.`, "bad", undefined, now);
    events.push({ tone: "good", text: `${suspect.name} goes down. ${restitution ? `$${restitution} goes back to ${c.victimName}.` : "Their pockets are empty."}` });
  } else {
    suspect.reputation += 1;
    if (v.hp <= 0) {
      v.hp = 0;
      v.hospitalUntil = now + BALANCE.hp.hospitalMinMs;
      fight.outcome = "ko";
    }
    notify(suspect, `A masked vigilante jumped you over the ${crime} in ${c.district}. You fought them off.`, "good", undefined, now);
    events.push({ tone: "bad", text: `${suspect.name} fought you off.${v.hp <= 0 ? " You wake up in the clinic." : ""}` });
  }
  events.push(...addMerit(v, "vigilante", res.won ? 3 : 1));
  c.hunt = { hunterId: v.id, hunterName: v.name, suspectId: suspect.id, suspectName: suspect.name, won: res.won, at: now, restitution };

  // Only the real criminal knows if the vigilante got it wrong.
  const wrong = suspect.id !== c.culpritId;
  if (res.won && wrong) notify(suspect, "You've never even been to that part of town.", "story", undefined, now);
  return { events, fight };
}

// ── Views ──────────────────────────────────────────────────────────────────

export function patientView(c: CaseFile, viewer: Player, now: number) {
  return {
    caseId: c.id,
    crime: CRIMES[c.kind].name,
    victimName: c.victimName,
    district: c.district,
    at: c.at,
    canExamine: examineBlock(viewer, c, now),
  };
}

export function depositView(c: CaseFile, viewer: Player, now: number) {
  const d = c.deposit!;
  return {
    caseId: c.id,
    account: d.account,
    amount: d.amount,
    at: d.at,
    minutesAfter: Math.max(1, Math.round((d.at - c.at) / 60_000)),
    crime: CRIMES[c.kind].name,
    district: c.district,
    canReview: reviewBlock(viewer, c, now),
  };
}

export function coldCaseView(c: CaseFile, viewer: Player, now: number, suspects: SuspectMatch[]) {
  return {
    caseId: c.id,
    crime: CRIMES[c.kind].name,
    victimName: c.victimName,
    district: c.district,
    at: c.at,
    amount: c.amount,
    clues: c.tips.map((t) => t.text),
    suspects,
    canHunt: c.hunt ? "Someone already went after this one." : c.tips.length < 2 ? "Not enough clues to go on." : null,
    hunt: c.hunt ? { hunterName: c.hunt.hunterName, suspectName: c.hunt.suspectName, won: c.hunt.won } : null,
  };
}
