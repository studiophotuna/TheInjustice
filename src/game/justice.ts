// Stage 2 of the justice chain: arrests, trials, verdicts, bribes and jail.
// A detective arrests someone who fits the clues. The suspect is held for trial. Lawyers
// argue, a judge rules (or the court clerk does when no judge shows up), and the guilty
// serve time and pay the victim back. Nobody is ever told whether the verdict was right.

import { courtMartial } from "./military";
import { BALANCE } from "./balance";
import { CRIMES, caseCold, suspectsFor, type SuspectMatch } from "./crime";
import { COUNTRY_BY_ID } from "./content/world";
import { addMerit, countryOf, inJail, shiftIntegrity } from "./engine";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { bumpSeason } from "./season";
import { notify } from "./social";
import { sv } from "./stats";
import { GameError, type CaseFile, type CourtParty, type GameEvent, type Player, type Rng, type Trial, type Verdict } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const minutes = (ms: number) => `${Math.round(ms / 60_000)} minutes`;

export function isDetective(p: Player): boolean {
  return p.path === "police" && p.rank >= BALANCE.crime.detectiveRank;
}
export function isLawyer(p: Player): boolean {
  return p.path === "courts" && p.rank >= BALANCE.justice.lawyerRank;
}
export function isJudge(p: Player): boolean {
  return p.path === "courts" && p.rank >= BALANCE.justice.judgeRank;
}

/** How well a lawyer argues (0.3–1), from rank and hidden wits and charisma. */
export function lawyerPower(p: Player): number {
  return clamp(0.3 + p.rank * 0.06 + (sv(p, "wits") + sv(p, "charisma") - 20) / 200, 0.3, 1);
}

/** Chance the case holds up in court (0.05–0.95). Shown to judges as "case strength". */
export function trialStrength(t: Trial): number {
  return clamp(0.15 + 0.7 * t.evidence + (t.prosecutor?.power ?? 0) * 0.2 - (t.defender?.power ?? 0) * 0.2, 0.05, 0.95);
}

export function arrestBlock(o: Player, c: CaseFile, suspect: Player | null, eligible: SuspectMatch[], now: number): string | null {
  if (!isDetective(o)) return "Only detectives can make arrests.";
  if (countryOf(o) !== c.country) return "That case is in another country.";
  if (c.trial) return "Someone has already been arrested for this.";
  if (caseCold(c, now)) return "This case went cold.";
  if (c.tips.length < 2) return "You need at least two clues to make an arrest.";
  if (!suspect || suspect.dead) return "They're not around anymore.";
  if (suspect.id === o.id) return "You can't arrest yourself.";
  if (!eligible.some((s) => s.id === suspect.id)) return "They don't fit the clues well enough.";
  if (countryOf(suspect) !== c.country || suspect.travel) return "They've left the country.";
  if (inJail(suspect, now)) return "They're already behind bars.";
  if (o.energy < BALANCE.justice.arrestEnergy) return "You're too tired.";
  return null;
}

/** Detective `o` arrests `suspect` for case `c`. `pool` is who the detective could check against. */
export function arrest(o: Player, suspect: Player, c: CaseFile, pool: { player: Player; crewTag: string | null }[], suspectCrewTag: string | null, now: number): GameEvent[] {
  const eligible = suspectsFor(c, [...pool.filter((x) => x.player.id !== suspect.id), { player: suspect, crewTag: suspectCrewTag }]);
  const block = arrestBlock(o, c, suspect, eligible, now);
  if (block) throw new GameError(block);
  const match = eligible.find((s) => s.id === suspect.id)!;
  const searched = c.searches?.some((s) => s.suspectId === suspect.id && s.found);
  o.energy -= BALANCE.justice.arrestEnergy;
  o.jobCounts.arrest = (o.jobCounts.arrest ?? 0) + 1;
  bumpSeason(o, "arrests", 1, now);
  const deadline = now + BALANCE.justice.trialMs;
  c.trial = {
    suspectId: suspect.id,
    suspectName: suspect.name,
    officerId: o.id,
    officerName: o.name,
    at: now,
    deadline,
    // Stolen goods found with a warrant make the case airtight.
    evidence: searched ? 1 : match.matches / c.tips.length,
  };
  // A lawyer on retainer takes the defense right away.
  if (suspect.retainer && suspect.retainer.until > now && suspect.retainer.lawyerId !== o.id) {
    c.trial.defender = { id: suspect.retainer.lawyerId, name: suspect.retainer.name, power: suspect.retainer.power };
  }
  suspect.custodyCase = c.id;
  suspect.jailUntil = deadline;
  suspect.bailAmount = bailFor(c);
  suspect.jailReason = `Held for trial: the ${CRIMES[c.kind].name.toLowerCase()} in ${c.district} (case #${c.id}).`;
  notify(
    suspect,
    `Detective ${o.name} arrested you for the ${CRIMES[c.kind].name.toLowerCase()} on ${c.victimName} in ${c.district}. Trial within ${minutes(BALANCE.justice.trialMs)}.`,
    "bad",
    o,
    now,
  );
  o.stats.wits += 0.4;
  return [{ tone: "good", text: `You arrest ${suspect.name}. Case #${c.id} goes to court.` }, ...addMerit(o, "police", 2)];
}

export function joinBlock(l: Player, c: CaseFile, side: "prosecutor" | "defender"): string | null {
  const t = c.trial;
  if (!isLawyer(l)) return "Only attorneys can argue a case.";
  if (!t || t.verdict) return "There's no trial to join.";
  if (countryOf(l) !== c.country) return "That court is in another country.";
  if (l.id === t.suspectId) return "Get your own lawyer.";
  if (t[side]) return `The ${side === "prosecutor" ? "prosecution" : "defense"} already has a lawyer.`;
  if (t.prosecutor?.id === l.id || t.defender?.id === l.id) return "You're already on this case.";
  return null;
}

export function joinTrial(l: Player, c: CaseFile, side: "prosecutor" | "defender", suspect: Player | null, now: number): GameEvent[] {
  const block = joinBlock(l, c, side);
  if (block) throw new GameError(block);
  const party: CourtParty = { id: l.id, name: l.name, power: lawyerPower(l) };
  c.trial![side] = party;
  if (side === "defender" && suspect) notify(suspect, `${l.name} took your case. You have a defense attorney.`, "good", l, now);
  return [
    { tone: "good", text: side === "prosecutor" ? `You take the prosecution of ${c.trial!.suspectName}.` : `You take ${c.trial!.suspectName}'s defense.` },
    ...addMerit(l, "courts", 1),
  ];
}

/** The suspect slips money into an envelope for the judge. Held until the verdict. */
export function offerBribe(s: Player, c: CaseFile, amount: number): GameEvent[] {
  const t = c.trial;
  if (!t || t.verdict || t.suspectId !== s.id) throw new GameError("You're not on trial for that.");
  if (t.bribe) throw new GameError("The envelope is already on the judge's desk.");
  if (!Number.isFinite(amount) || amount < BALANCE.justice.minBribe) throw new GameError(`At least $${BALANCE.justice.minBribe}, or nobody will take you seriously.`);
  const a = Math.floor(amount);
  if (!canPayIllegal(s, a, true)) throw new GameError("You don't have that much.");
  payIllegal(s, a, true);
  t.bribe = a;
  shiftIntegrity(s, -3);
  return [{ tone: "info", text: `Your lawyer's cousin delivers an envelope with $${a}. If no judge takes it, it comes back.` }];
}

export function judgeBlock(j: Player, c: CaseFile): string | null {
  const t = c.trial;
  if (!isJudge(j)) return "Only judges can rule.";
  if (!t || t.verdict) return "There's nothing to rule on.";
  if (countryOf(j) !== c.country) return "That court is in another country.";
  if ([t.suspectId, t.officerId, t.prosecutor?.id, t.defender?.id, c.victimId].includes(j.id)) return "You're too close to this case. Recuse yourself.";
  return null;
}

/** Bail scales with what was stolen. */
export function bailFor(c: CaseFile): number {
  return Math.max(BALANCE.bail.min, c.amount * BALANCE.bail.multiplier);
}

export function bailBlock(payer: Player, c: CaseFile): string | null {
  const t = c.trial;
  if (!t || t.verdict) return "There's no one to bail out.";
  if (t.bail) return "Bail is already paid.";
  if (countryOf(payer) !== c.country) return "You have to be at the courthouse.";
  if (!payer.hasBankAccount || payer.bank < bailFor(c)) return `Bail is $${bailFor(c)}, paid from the bank.`;
  return null;
}

/** Anyone (the suspect too) pays bail; the suspect waits for the verdict outside. */
export function postBail(payer: Player, suspect: Player, c: CaseFile, now: number): GameEvent[] {
  const block = bailBlock(payer, c);
  if (block) throw new GameError(block);
  if (suspect.custodyCase !== c.id) throw new GameError("They're not being held for this case.");
  const amount = bailFor(c);
  payer.bank -= amount;
  c.trial!.bail = { payerId: payer.id, payerName: payer.name, amount };
  suspect.custodyCase = null;
  suspect.onBail = c.id;
  suspect.jailUntil = now;
  suspect.jailReason = null;
  if (payer.id !== suspect.id) notify(suspect, `${payer.name} posted your $${amount} bail. You're out until the verdict.`, "good", payer, now);
  return [
    {
      tone: "good",
      text: payer.id === suspect.id
        ? `You post $${amount} bail and walk out. The trial still goes on; you'll get the money back at the verdict.`
        : `You post $${amount} bail for ${suspect.name}. You'll get it back at the verdict.`,
    },
  ];
}

export interface TrialParties {
  /** Whoever posted bail, to refund. */
  bailPayer?: Player | null;
  suspect: Player | null;
  victim: Player | null;
  officer: Player | null;
  prosecutor: Player | null;
  defender: Player | null;
  /** The real criminal (server-only). Same object as `suspect` if the arrest was right. */
  culprit: Player | null;
}

/** Ids of everyone a verdict touches (to load and lock them together). */
export function trialPartyIds(c: CaseFile): string[] {
  const t = c.trial!;
  return [...new Set([t.suspectId, c.victimId, t.officerId, t.prosecutor?.id, t.defender?.id, c.culpritId, t.bail?.payerId].filter((x): x is string => !!x))];
}

/**
 * Closes the trial. `judge` null means the court clerk decides by the strength of the case.
 * `takeBribe` means the judge pockets the envelope and lets the suspect walk.
 */
export function decideTrial(
  c: CaseFile,
  parties: TrialParties,
  opts: { judge: Player | null; verdict?: Verdict; takeBribe?: boolean },
  now: number,
  rng: Rng,
): GameEvent[] {
  const t = c.trial;
  if (!t || t.verdict) throw new GameError("There's nothing to rule on.");
  const { judge } = opts;
  if (judge) {
    const block = judgeBlock(judge, c);
    if (block) throw new GameError(block);
  }
  const events: GameEvent[] = [];
  let verdict: Verdict;
  if (judge && opts.takeBribe) {
    if (!t.bribe) throw new GameError("There's no envelope.");
    verdict = "not_guilty";
    earnDirty(judge, t.bribe);
    shiftIntegrity(judge, -8);
    t.bribed = true;
    events.push({ tone: "info", text: `You slide the envelope into your robe. $${t.bribe}. Not guilty.` });
    t.bribe = 0;
  } else if (judge) {
    if (opts.verdict !== "guilty" && opts.verdict !== "not_guilty") throw new GameError("Guilty or not guilty?");
    verdict = opts.verdict;
  } else {
    verdict = rng() < trialStrength(t) ? "guilty" : "not_guilty";
  }
  // An unopened envelope goes back to the suspect.
  if (t.bribe && parties.suspect) earnDirty(parties.suspect, t.bribe);
  t.bribe = 0;

  t.verdict = verdict;
  t.decidedBy = judge ? `Judge ${judge.name}` : "the court clerk";
  if (judge) t.judgeId = judge.id;
  t.decidedAt = now;
  const s = parties.suspect;
  const crime = CRIMES[c.kind].name.toLowerCase();

  if (s) {
    s.custodyCase = null;
    s.onBail = null;
    s.bailAmount = 0;
    if (verdict === "guilty") {
      const sentence = Math.round(BALANCE.justice.sentenceMs[c.kind] * COUNTRY_BY_ID[c.country].heatMult);
      t.sentenceMs = sentence;
      s.jailUntil = now + sentence;
      s.jailReason = `Serving ${minutes(sentence)} for the ${crime} in ${c.district}.`;
      s.heat = Math.max(0, s.heat - 10);
      // A stolen car still in the thief's garage goes back to its owner instead of money.
      const car = c.kind === "car_theft" && c.car ? (s.garage ?? []).find((x) => x.id === c.car!.id) : undefined;
      if (car && parties.victim && parties.victim.id !== s.id) {
        s.garage = (s.garage ?? []).filter((x) => x !== car);
        parties.victim.garage = [...(parties.victim.garage ?? []), { ...car, hot: undefined }];
        t.carReturned = { name: c.car!.name, city: COUNTRY_BY_ID[car.country].capital };
      }
      // Pay the victim back from cash first, then savings.
      const owed = t.carReturned ? 0 : c.amount;
      const fromDirty = Math.min(s.dirty ?? 0, owed);
      s.dirty = (s.dirty ?? 0) - fromDirty;
      const fromCash = Math.min(s.cash, owed - fromDirty);
      const fromBank = Math.min(s.bank, owed - fromDirty - fromCash);
      s.cash -= fromCash;
      s.bank -= fromBank;
      t.restitution = fromDirty + fromCash + fromBank;
      notify(s, `Guilty, says ${t.decidedBy}. ${minutes(sentence)} in a cell${t.carReturned ? `, and the ${t.carReturned.name.toLowerCase()} goes back to ${c.victimName}` : t.restitution ? `, and $${t.restitution} goes back to ${c.victimName}` : ""}.`, "bad", undefined, now);
      if (s.path === "military") courtMartial(s, `convicted of ${crime}`, now);
    } else {
      s.jailUntil = now;
      s.jailReason = null;
      s.reputation += 1;
      notify(s, `Not guilty, says ${t.decidedBy}. You walk out of the courthouse a free person.`, "good", undefined, now);
    }
  }

  // Bail goes back to whoever paid it, whatever the verdict.
  if (t.bail && parties.bailPayer) {
    parties.bailPayer.bank += t.bail.amount;
    if (parties.bailPayer.id !== s?.id) notify(parties.bailPayer, `Case #${c.id} is closed. Your $${t.bail.amount} bail comes back to your bank.`, "info", undefined, now);
  }

  const v = parties.victim;
  if (v && v.id !== s?.id) {
    if (verdict === "guilty" && t.restitution) v.bank += t.restitution;
    notify(
      v,
      verdict === "guilty"
        ? `Case #${c.id}: ${t.suspectName} was found guilty of the ${crime}.${t.carReturned ? ` Your ${t.carReturned.name.toLowerCase()} is back: it's parked in ${t.carReturned.city}.` : ""}${t.restitution ? ` $${t.restitution} was returned to your bank.` : ""}`
        : `Case #${c.id}: ${t.suspectName} was found not guilty. Whoever robbed you is still out there.`,
      verdict === "guilty" ? "good" : "bad",
      undefined,
      now,
    );
  }

  const o = parties.officer;
  if (o) {
    o.reputation = Math.max(0, o.reputation + (verdict === "guilty" ? 3 : -1));
    if (verdict === "guilty") addMerit(o, "police", 3);
    notify(o, `Case #${c.id}: ${verdict === "guilty" ? "your arrest stuck. Guilty. +3 reputation." : "the court let your suspect go."}`, verdict === "guilty" ? "good" : "bad", undefined, now);
  }
  const pr = parties.prosecutor;
  if (pr && verdict === "guilty") {
    pr.reputation += 2;
    addMerit(pr, "courts", 3);
    pr.stats.wits += 0.4;
    notify(pr, `Case #${c.id}: you won the prosecution. +2 reputation.`, "good", undefined, now);
  }
  const df = parties.defender;
  if (df && verdict === "not_guilty") {
    df.reputation += 2;
    addMerit(df, "courts", 3);
    df.stats.charisma += 0.4;
    notify(df, `Case #${c.id}: your client walked. +2 reputation.`, "good", undefined, now);
  }
  if (judge) {
    judge.reputation += 1;
    judge.stats.wits += 0.3;
    events.push({ tone: "good", text: `Case #${c.id}: ${verdict === "guilty" ? "guilty" : "not guilty"}.` }, ...addMerit(judge, "courts", 2));
  }

  // The real criminal learns someone else is doing their time. Nobody else ever knows.
  const culprit = parties.culprit;
  if (verdict === "guilty" && culprit && culprit.id !== t.suspectId && !culprit.dead) {
    notify(culprit, `${t.suspectName} was convicted for what you did in ${c.district}. Someone else is doing your time.`, "story", undefined, now);
  }
  return events;
}

/** What players see of a trial. Never reveals the real criminal or whether a bribe was taken. */
export function trialView(c: CaseFile, viewer: Player, now: number) {
  const t = c.trial!;
  const decided = !!t.verdict;
  return {
    caseId: c.id,
    crime: CRIMES[c.kind].name,
    district: c.district,
    victimName: c.victimName,
    amount: c.amount,
    suspectName: t.suspectName,
    officerName: t.officerName,
    at: t.at,
    deadline: t.deadline,
    prosecutor: t.prosecutor?.name ?? null,
    defender: t.defender?.name ?? null,
    strength: decided ? null : Math.round(trialStrength(t) * 100),
    clues: c.tips.map((x) => x.text),
    verdict: t.verdict ?? null,
    decidedBy: t.decidedBy ?? null,
    decidedAt: t.decidedAt ?? null,
    sentenceMin: t.sentenceMs ? Math.round(t.sentenceMs / 60_000) : null,
    restitution: t.restitution ?? null,
    envelope: !decided && isJudge(viewer) && !judgeBlock(viewer, c) ? t.bribe ?? 0 : 0,
    bail: t.bail ? { payerName: t.bail.payerName, amount: t.bail.amount } : null,
    bailAmount: bailFor(c),
    canBail: decided ? "Closed." : bailBlock(viewer, c),
    canProsecute: decided ? "Closed." : joinBlock(viewer, c, "prosecutor"),
    canDefend: decided ? "Closed." : joinBlock(viewer, c, "defender"),
    canJudge: decided ? "Closed." : judgeBlock(viewer, c),
    overdue: !decided && now >= t.deadline,
  };
}
