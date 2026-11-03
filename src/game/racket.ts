// Stage 4 of the justice chain: the Mafia fights back, and internal affairs fights corruption.
//  - Mafia Soldiers lean on the witnesses of their own crimes. A scared witness takes back
//    their statement; a brave one goes to the police with a fresh clue.
//  - Mafia Capos offer a police officer money to lose a file. Taking it buries the case;
//    refusing it hands the police a clue about who offered.
//  - Internal affairs (Police Sergeant and up) audits officials. Hidden records of taken
//    envelopes, buried deposits and lost files come out, and the guilty are disciplined.

import { BALANCE } from "./balance";
import { CRIMES, addTip, caseCold, eyeAccuracy, fileLost } from "./crime";
import { addMerit, countryOf, inJail, shiftIntegrity } from "./engine";
import { PATHS } from "./content/paths";
import { notify } from "./social";
import { sv } from "./stats";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { GameError, type CaseFile, type City, type GameEvent, type Player, type Rng } from "./types";

const R = BALANCE.racket;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export const isMafia = (p: Player, minRank: number = R.intimidate.minRank) => p.path === "enforcer" && p.rank >= minRank;
export const isInternalAffairs = (p: Player) => p.path === "police" && p.rank >= R.audit.minRank;

/** Still worth fighting over: no verdict, not cold, file not lost, nobody arrested yet. */
function stillOpen(c: CaseFile, now: number) {
  return !c.trial && !c.hunt && !caseCold(c, now);
}

// ── Intimidation ───────────────────────────────────────────────────────────

export function intimidateBlock(m: Player, c: CaseFile, now: number): string | null {
  if (!isMafia(m)) return `Only the Mafia leans on witnesses (${PATHS.enforcer.ranks[R.intimidate.minRank - 1]} and up).`;
  if (c.culpritId !== m.id) return "That's not your job.";
  if (c.trial) return "It's in court now. Too late to scare anyone.";
  if (!stillOpen(c, now)) return "That case is closed.";
  if (c.intimidatedAt) return "You already sent the message.";
  if (c.protectedBy) return "The witnesses are under police protection. Nobody can get near them.";
  if (!c.tips.some((t) => t.source === "witness" && t.byId)) return "Nobody talked. Yet.";
  if (inJail(m, now)) return "You're in a cell.";
  if (m.energy < R.intimidate.energy) return "You're too tired.";
  return null;
}

/** Chance a witness folds under pressure (0.15–0.85). */
export function foldChance(m: Player, w: Player): number {
  const atk = sv(m, "nerve") + sv(m, "charisma") * 0.5;
  const def = sv(w, "nerve") * 1.5;
  return clamp(0.5 + (atk - def) / (atk + def), 0.15, 0.85);
}

/**
 * The criminal sends a message to whoever talked. `witnesses` are the players behind the
 * case's witness tips. The criminal never learns who they are.
 */
export function intimidate(m: Player, c: CaseFile, witnesses: Player[], now: number, rng: Rng): GameEvent[] {
  const block = intimidateBlock(m, c, now);
  if (block) throw new GameError(block);
  m.energy -= R.intimidate.energy;
  m.heat += R.intimidate.heat;
  shiftIntegrity(m, -2);
  m.stats.nerve += 0.4;
  c.intimidatedAt = now;

  let folded = 0;
  let stood = 0;
  for (const w of witnesses) {
    const tips = c.tips.filter((t) => t.source === "witness" && t.byId === w.id);
    if (!tips.length) continue;
    if (rng() < foldChance(m, w)) {
      c.tips = c.tips.filter((t) => !(t.source === "witness" && t.byId === w.id));
      folded++;
      notify(w, `A dead rat on your doorstep, and a note: "Case #${c.id}. Forget what you saw." You took back your statement.`, "bad", undefined, now);
    } else {
      stood++;
      w.stats.nerve += 0.5;
      w.reputation += 1;
      addTip(c, "witness", Math.min(0.95, eyeAccuracy(w) + 0.2), now, rng, w.id, "Threatened witness");
      notify(w, `Someone threatened you over case #${c.id}. You didn't flinch, and you told the police even more. +1 reputation.`, "good", undefined, now);
    }
  }
  const events: GameEvent[] = [...addMerit(m, "enforcer", 1)];
  if (folded) events.push({ tone: "good", text: `${folded === 1 ? "A witness" : `${folded} witnesses`} suddenly can't remember a thing.` });
  if (stood) events.push({ tone: "bad", text: `${stood === 1 ? "One witness" : `${stood} witnesses`} didn't scare. The police know more now.` });
  return events;
}

// ── Paying off a cop ───────────────────────────────────────────────────────

export function payoffBlock(m: Player, c: CaseFile, cop: Player | null, amount: number, now: number): string | null {
  if (!isMafia(m, R.payoff.minRank)) return `Only a ${PATHS.enforcer.ranks[R.payoff.minRank - 1]} or higher has those connections.`;
  if (c.culpritId !== m.id) return "That's not your job.";
  if (!stillOpen(c, now)) return c.trial ? "It's in court now. Try the judge." : "That case is closed.";
  if (c.payoff?.status === "pending") return "There's already an envelope on someone's desk.";
  if (c.payoff?.status === "refused") return "Word got around. Nobody will take your money on this one.";
  if (!cop || cop.dead) return "Pick an officer.";
  if (cop.path !== "police" || cop.rank < R.payoff.copMinRank) return "They can't make a file disappear.";
  if (cop.id === m.id) return "Nice try.";
  if (countryOf(cop) !== c.country) return "They work in another country.";
  if (!Number.isFinite(amount) || amount < R.payoff.minAmount) return `At least $${R.payoff.minAmount}. Cops aren't cheap.`;
  if (!canPayIllegal(m, Math.floor(amount), true)) return "You don't have that much.";
  return null;
}

/** The money leaves the criminal now and waits on the officer's desk. */
export function offerPayoff(m: Player, c: CaseFile, cop: Player, amount: number, now: number): GameEvent[] {
  const block = payoffBlock(m, c, cop, amount, now);
  if (block) throw new GameError(block);
  const a = Math.floor(amount);
  payIllegal(m, a, true);
  shiftIntegrity(m, -2);
  c.payoff = { fromId: m.id, copId: cop.id, copName: cop.name, amount: a, at: now, status: "pending" };
  notify(cop, `A man in a camel coat left an envelope on your desk: $${a}, and a case number, #${c.id}. Check your case files.`, "story", undefined, now);
  return [{ tone: "info", text: `The envelope is on ${cop.name}'s desk. If they refuse, you get it back.` }];
}

export function withdrawPayoff(m: Player, c: CaseFile): GameEvent[] {
  const po = c.payoff;
  if (!po || po.fromId !== m.id || po.status !== "pending") throw new GameError("There's no envelope to take back.");
  po.status = "withdrawn";
  earnDirty(m, po.amount);
  return [{ tone: "info", text: `You take the $${po.amount} back.` }];
}

/** The officer decides. `briber` is the criminal (to refund or name). */
export function answerPayoff(cop: Player, c: CaseFile, briber: Player | null, victim: Player | null, take: boolean, now: number, rng: Rng): GameEvent[] {
  const po = c.payoff;
  if (!po || po.copId !== cop.id || po.status !== "pending") throw new GameError("There's no envelope for you.");
  if (take) {
    po.status = "taken";
    earnDirty(cop, po.amount);
    shiftIntegrity(cop, -8);
    if (victim) notify(victim, `The police say the file on case #${c.id} was lost. Nobody is looking anymore.`, "bad", undefined, now);
    if (briber) {
      notify(briber, `Case #${c.id} is gone. The file walked out of the station.`, "good", undefined, now);
      addMerit(briber, "enforcer", 2);
    }
    return [{ tone: "info", text: `You pocket $${po.amount}. Case #${c.id} goes into the shredder.` }];
  }
  po.status = "refused";
  cop.reputation += 2;
  shiftIntegrity(cop, 3);
  if (briber) {
    earnDirty(briber, po.amount);
    notify(briber, `${cop.name} sent your envelope back. And they took notes.`, "bad", undefined, now);
  }
  // Refusing hands the police something solid about who tried.
  addTip(c, "detective", 1, now, rng, cop.id, `Officer ${cop.name}`, ["nameStart", "nameEnd", "crew"]);
  return [{ tone: "good", text: `You send the money back and put the attempt in the file. +2 reputation.` }];
}

// ── Internal affairs ───────────────────────────────────────────────────────

/** Careers that can be bought. */
export function isOfficial(p: Player): boolean {
  return (
    (p.path === "police" && p.rank >= 2) ||
    (p.path === "courts" && p.rank >= BALANCE.justice.judgeRank) ||
    (p.path === "banking" && p.rank >= Math.min(BALANCE.casework.bank.minRank, BALANCE.launderService.minRank)) ||
    (p.path === "medicine" && p.rank >= BALANCE.casework.clinic.minRank) ||
    (p.path === "military" && p.rank >= 3)
  );
}

export function auditBlock(a: Player, target: Player | null, now: number, isMayor = false): string | null {
  if (!isInternalAffairs(a)) return `Only internal affairs can audit (Police ${PATHS.police.ranks[R.audit.minRank - 1]} and up).`;
  if (!target || target.dead) return "They're not around anymore.";
  if (target.id === a.id) return "You can't audit yourself.";
  if (!isOfficial(target) && !isMayor) return "They're not an official.";
  if (countryOf(target) !== countryOf(a)) return "They work in another country.";
  if (now - (a.attackLog?.[`audit:${target.id}`] ?? 0) < R.audit.cooldownMs) return "You audited them recently.";
  if (a.energy < R.audit.energy) return "You're too tired.";
  return null;
}

/** What the target did wrong in this case, if anything (server-only records). */
export function corruptionIn(c: CaseFile, targetId: string): { role: string; amount: number } | null {
  if (c.exposed?.some((e) => e.id === targetId)) return null;
  if (c.trial?.bribed && c.trial.judgeId === targetId) return { role: "judge who took an envelope", amount: Math.max(50, c.amount) };
  if (c.deposit?.review === "buried" && c.deposit.reviewerId === targetId) return { role: "banker who buried a deposit", amount: c.deposit.amount };
  if (c.payoff?.status === "taken" && c.payoff.copId === targetId) return { role: "officer who lost a file", amount: c.payoff.amount };
  return null;
}

/**
 * Internal affairs digs through the target's cases. `cases` are the country's recent case
 * files; any that show corruption are marked as exposed and returned for saving.
 */
export function audit(
  a: Player,
  target: Player,
  cases: CaseFile[],
  now: number,
  city: City | null = null,
): { events: GameEvent[]; changed: CaseFile[]; cityChanged: boolean } {
  const block = auditBlock(
    a,
    target,
    now,
    city?.mayor?.id === target.id || !!city?.skims.some((x) => x.mayorId === target.id) || !!city?.candidates.some((x) => x.id === target.id),
  );
  if (block) throw new GameError(block);
  a.energy -= R.audit.energy;
  a.attackLog = { ...(a.attackLog ?? {}), [`audit:${target.id}`]: now };
  a.stats.wits += 0.4;

  const found = cases.map((c) => ({ c, hit: corruptionIn(c, target.id) })).filter((x) => x.hit);
  const skims = city ? city.skims.filter((x) => x.mayorId === target.id && !x.exposed) : [];
  const bought = city ? (city.voteBuys ?? []).filter((x) => x.candidateId === target.id && !x.exposed) : [];
  // Doctors' secret ledger of back-alley patients counts like a skim.
  const offBooks = [...(target.offBooks ?? []), ...(target.launderLog ?? []), ...(target.gunSales ?? [])].filter((x) => !x.exposed);
  const skimmed = skims.reduce((s, x) => s + x.amount, 0);
  const backAlley = offBooks.reduce((s, x) => s + x.amount, 0);
  if (!found.length && !skims.length && !offBooks.length && !bought.length) {
    target.reputation += 1;
    notify(target, "Internal affairs went through your files. They found nothing. +1 reputation.", "good", undefined, now);
    return { events: [{ tone: "info", text: `${target.name} comes up clean. Or careful.` }], changed: [], cityChanged: false };
  }
  const total = found.reduce((s, x) => s + x.hit!.amount, 0) + skimmed + backAlley + bought.reduce((s, x) => s + x.amount, 0);
  if (bought.length && city) {
    for (const x of bought) x.exposed = true;
    city.candidates = city.candidates.filter((x) => x.id !== target.id);
    city.log = [{ at: now, text: `Internal affairs caught ${target.name} buying votes. Struck off the ballot.` }, ...city.log].slice(0, 20);
  }
  for (const x of offBooks) x.exposed = true;
  if (offBooks.length) {
    target.backAlley = false;
    target.launderService = null;
  }
  const fine = Math.min(target.cash + target.bank, total * 2);
  const fromCash = Math.min(target.cash, fine);
  target.cash -= fromCash;
  target.bank -= fine - fromCash;
  if (target.path) target.rank = Math.max(1, target.rank - 1);
  target.reputation = Math.max(0, target.reputation - 5);
  target.jailUntil = Math.max(target.jailUntil ?? 0, now + R.audit.jailMs);
  target.jailReason = `Held by internal affairs${skimmed ? " for skimming the city treasury" : ""}.`;
  shiftIntegrity(target, -5);
  for (const { c, hit } of found) {
    c.exposed = [...(c.exposed ?? []), { id: target.id, name: target.name, role: hit!.role, at: now, by: a.name }];
  }
  for (const x of skims) x.exposed = true;
  if (city && skimmed) {
    // The skimmed money goes back to the city, and the mayor is removed from office.
    city.treasury += Math.min(fine, skimmed);
    if (city.mayor?.id === target.id) city.mayor = null;
    city.log = [{ at: now, text: `Internal affairs caught Mayor ${target.name} skimming $${skimmed} from the treasury. City hall is empty until the next vote.` }, ...city.log].slice(0, 20);
  }
  const hits = found.length + (skims.length ? 1 : 0) + (offBooks.length ? 1 : 0) + (bought.length ? 1 : 0);
  a.reputation += Math.min(10, 5 * hits);
  addMerit(a, "police", 3 * hits);
  const ids = [
    ...found.map((x) => `#${x.c.id}`),
    ...(skimmed ? ["the city treasury"] : []),
    ...(offBooks.length
      ? [target.path === "banking" ? "laundering for clients" : target.path === "military" ? "selling army weapons" : `${offBooks.length} back-alley patient${offBooks.length > 1 ? "s" : ""}`]
      : []),
    ...(bought.length ? ["buying votes"] : []),
  ].join(", ");
  notify(
    target,
    `Internal affairs caught you (${ids}). Fined $${fine}${target.path ? `, demoted to ${PATHS[target.path].ranks[target.rank - 1]}` : ""}${skimmed ? ", removed from office" : ""}, and held for ${Math.round(R.audit.jailMs / 60_000)} minutes.`,
    "bad",
    a,
    now,
  );
  return {
    events: [{ tone: "good", text: `Got them. ${target.name} was dirty on ${ids}. Fined $${fine}${target.path ? " and demoted" : ""}${skimmed ? ", and removed from office" : ""}.` }],
    changed: found.map((x) => x.c),
    cityChanged: skims.length > 0 || bought.length > 0,
  };
}

// ── Views ──────────────────────────────────────────────────────────────────

/** The criminal's own jobs, as they know them. Never shows who the witnesses are. */
export function myCaseView(c: CaseFile | null, mine: NonNullable<Player["myCases"]>[number], m: Player, now: number) {
  const status = !c
    ? "closed"
    : c.trial
      ? c.trial.verdict
        ? c.trial.verdict === "guilty" ? "convicted" : "acquitted"
        : "in court"
      : fileLost(c)
        ? "file lost"
        : c.hunt
          ? "hunted"
          : caseCold(c, now)
            ? "cold"
            : "open";
  return {
    caseId: mine.caseId,
    crime: CRIMES[mine.kind].name,
    district: mine.district,
    victimName: mine.victimName,
    at: mine.at,
    status,
    clues: c && status === "open" ? c.tips.length : null,
    statements: c && status === "open" ? c.tips.filter((t) => t.source === "witness" && t.byId).length : null,
    protectedWitnesses: !!c?.protectedBy,
    canIntimidate: c ? intimidateBlock(m, c, now) : "That case is closed.",
    canPayoff: c ? payoffBlock(m, c, null, R.payoff.minAmount, now)?.replace("Pick an officer.", "") || null : "That case is closed.",
    payoffAllowed: isMafia(m, R.payoff.minRank),
    payoff: c?.payoff && c.payoff.fromId === m.id ? { copName: c.payoff.copName, amount: c.payoff.amount, status: c.payoff.status } : null,
  };
}
