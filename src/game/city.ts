// City hall: every country elects a mayor for a two-week term. The ballot opens for the last
// three days of each term (or right away while the office is empty). Mayors set the city tax,
// fund a police bounty per conviction, call crackdowns on crime, pardon one prisoner a term,
// draw a salary from the treasury... and can quietly skim it, which internal affairs can catch.

import { seatsView } from "./seats";
import { checkText } from "./textfilter";
import { guardBlock, martialBlock, martialOn } from "./military";
import { BALANCE } from "./balance";
import { rankTitle } from "./content/paths";
import { COUNTRY_BY_ID } from "./content/world";
import { maxEnergy } from "./balance";
import { countryOf, inJail, shiftIntegrity } from "./engine";
import { notify, protectedUntil } from "./social";
import { buzzWord } from "./batch4";
import { caseCold } from "./crime";
import { GameError, type CaseFile, type City, type CountryId, type GameEvent, type Player } from "./types";

const B = BALANCE.city;
/** Terms are counted from this date, so every city's terms line up. */
export const CITY_EPOCH = Date.UTC(2026, 10, 2);

export const termIndex = (now: number) => Math.max(0, Math.floor((now - CITY_EPOCH) / B.termMs));
export const termEnds = (term: number) => CITY_EPOCH + (term + 1) * B.termMs;

export function newCity(country: CountryId, now: number): City {
  return {
    country,
    term: termIndex(now),
    mayor: null,
    taxRate: B.defaultTax,
    policeBounty: 0,
    treasury: 0,
    crackdownUntil: 0,
    lastCrackdownAt: 0,
    pardonTerm: -1,
    lastSalaryAt: 0,
    candidates: [],
    votes: {},
    history: [],
    log: [],
    skims: [],
  };
}

function announce(c: City, text: string, now: number) {
  c.log = [{ at: now, text }, ...c.log].slice(0, 20);
}

/** Ballot is open in the last days of a term, or any time the office is empty. */
export function electionOpen(c: City, now: number): boolean {
  return !c.mayor || now >= termEnds(c.term) - B.electionMs;
}

export function tally(c: City): Map<string, number> {
  const counts = new Map<string, number>(c.candidates.map((x) => [x.id, 0]));
  for (const id of Object.values(c.votes)) if (counts.has(id)) counts.set(id, counts.get(id)! + 1);
  return counts;
}

/** Closes every term that has ended: counts the votes and swears in the winner. */
export function advanceCity(c: City, now: number): boolean {
  let changed = false;
  while (c.term < termIndex(now)) {
    changed = true;
    const ended = termEnds(c.term);
    const counts = tally(c);
    const turnout = Object.keys(c.votes).length;
    const ranked = [...c.candidates].sort(
      (a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || (b.spent ?? 0) - (a.spent ?? 0) || b.reputation - a.reputation,
    );
    const winner = ranked[0] && (counts.get(ranked[0].id) ?? 0) > 0 ? ranked[0] : null;
    if (winner) {
      const reelected = c.mayor?.id === winner.id;
      c.mayor = { id: winner.id, name: winner.name, since: reelected ? c.mayor!.since : ended };
      announce(c, `${winner.name} ${reelected ? "is re-elected" : "wins the election"} with ${counts.get(winner.id)} of ${turnout} votes.`, ended);
    } else if (c.mayor) {
      announce(c, `Nobody won any votes. ${c.mayor.name} stays on as mayor.`, ended);
    } else {
      announce(c, "Nobody ran for mayor. City hall stays empty.", ended);
    }
    c.history = [{ term: c.term, name: winner?.name ?? null, votes: winner ? counts.get(winner.id)! : 0, turnout, at: ended }, ...c.history].slice(0, 10);
    c.candidates = [];
    c.votes = {};
    c.voteDevices = {};
    c.recall = [];
    c.voteBuys = (c.voteBuys ?? []).filter((v) => !v.exposed).slice(-50);
    c.term += 1;
  }
  return changed;
}

export const isMayor = (c: City, p: Player) => c.mayor?.id === p.id;
export const isChief = (c: City, p: Player) => c.chief?.id === p.id && p.path === "police";

// ── Elections ──────────────────────────────────────────────────────────────

export function runBlock(c: City, p: Player, now: number): string | null {
  if (!electionOpen(c, now)) return "The ballot isn't open yet.";
  if (countryOf(p) !== c.country) return "You have to live here to run.";
  if (c.candidates.some((x) => x.id === p.id)) return "You're already on the ballot.";
  if (p.reputation < B.runReputation) return `Nobody votes for a stranger. You need more reputation (${B.runReputation}).`;
  if (inJail(p, now)) return "Not from a cell.";
  if (!p.hasBankAccount || p.bank < B.runFee) return `The filing fee is $${B.runFee}, paid from the bank.`;
  return null;
}

export function runForMayor(c: City, p: Player, pitch: unknown, now: number): GameEvent[] {
  const block = runBlock(c, p, now);
  if (block) throw new GameError(block);
  const text = typeof pitch === "string" ? pitch.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140) : "";
  if (text) checkText(text, "bio");
  p.bank -= B.runFee;
  c.candidates.push({ id: p.id, name: p.name, title: rankTitle(p) ?? "Nobody", reputation: p.reputation, pitch: text, at: now });
  announce(c, `${p.name} is running for mayor.`, now);
  return [{ tone: "good", text: `You're on the ballot for mayor of ${COUNTRY_BY_ID[c.country].capital}. Go get votes.` }];
}

export function voteBlock(c: City, p: Player, now: number): string | null {
  if (!electionOpen(c, now)) return "The ballot isn't open yet.";
  if (countryOf(p) !== c.country) return "Only people who live here can vote.";
  if (now < protectedUntil(p)) return "You're too new in town to vote.";
  if (c.votes[p.id]) return "You already voted.";
  if ((p.devices ?? []).some((d) => c.voteDevices?.[d] && c.voteDevices[d] !== p.id)) return "Someone already voted from this device. One vote per person.";
  if (!c.candidates.length) return "Nobody is running yet.";
  return null;
}

export function vote(c: City, p: Player, candidateId: string, now: number): GameEvent[] {
  const block = voteBlock(c, p, now);
  if (block) throw new GameError(block);
  const cand = c.candidates.find((x) => x.id === candidateId);
  if (!cand) throw new GameError("They're not on the ballot.");
  c.votes[p.id] = cand.id;
  c.voteDevices = { ...(c.voteDevices ?? {}) };
  for (const d of p.devices ?? []) c.voteDevices[d] = p.id;
  return [{ tone: "good", text: `You voted for ${cand.name}. The ballot is secret.` }];
}

// ── Mayor's powers ─────────────────────────────────────────────────────────

function mayorOnly(c: City, p: Player) {
  if (!isMayor(c, p)) throw new GameError("Only the mayor can do that.");
  if (countryOf(p) !== c.country) throw new GameError("You have to be in your city.");
}

export function setTax(c: City, p: Player, rate: number, now: number): GameEvent[] {
  mayorOnly(c, p);
  if (!Number.isFinite(rate) || rate < 0 || rate > B.maxTax) throw new GameError(`Tax must be between 0% and ${B.maxTax * 100}%.`);
  const r = Math.round(rate * 100) / 100;
  const old = c.taxRate;
  c.taxRate = r;
  announce(c, `Mayor ${p.name} ${r > old ? "raises" : r < old ? "cuts" : "keeps"} the city tax ${r === old ? "at" : "to"} ${Math.round(r * 100)}%.`, now);
  return [{ tone: "good", text: `City tax set to ${Math.round(r * 100)}%.` }];
}

export function setBounty(c: City, p: Player, amount: number, now: number): GameEvent[] {
  mayorOnly(c, p);
  if (!Number.isFinite(amount) || amount < 0 || amount > B.maxBounty) throw new GameError(`Between $0 and $${B.maxBounty}.`);
  c.policeBounty = Math.floor(amount);
  announce(c, c.policeBounty ? `City hall pays officers $${c.policeBounty} for every conviction.` : "City hall stops paying police bounties.", now);
  return [{ tone: "good", text: `Police bounty set to $${c.policeBounty} per conviction.` }];
}

export function crackdown(c: City, p: Player, now: number): GameEvent[] {
  // The mayor or the police chief can order one.
  if (!isMayor(c, p) && !isChief(c, p)) throw new GameError("Only the mayor or the police chief can do that.");
  if (countryOf(p) !== c.country) throw new GameError("You have to be in your city.");
  if (now - c.lastCrackdownAt < B.crackdownCooldownMs) throw new GameError("One crackdown a day. The police need sleep too.");
  c.lastCrackdownAt = now;
  c.crackdownUntil = now + B.crackdownMs;
  announce(c, `${isMayor(c, p) ? "Mayor" : "Chief"} ${p.name} orders a crackdown. Extra patrols on every corner for the next hour.`, now);
  return [{ tone: "good", text: "Crackdown ordered. Crime is harder and hotter for the next hour." }];
}

export const crackdownOn = (c: City | null, now: number) => !!c && c.crackdownUntil > now;

export function pardon(c: City, p: Player, prisoner: Player, now: number): GameEvent[] {
  mayorOnly(c, p);
  if (c.pardonTerm === c.term) throw new GameError("One pardon per term.");
  if (prisoner.id === p.id) throw new GameError("You can't pardon yourself.");
  if (countryOf(prisoner) !== c.country) throw new GameError("They're not in your city.");
  if (prisoner.custodyCase) throw new GameError("They haven't been tried yet. Let the court rule first.");
  if (!inJail(prisoner, now)) throw new GameError("They're not behind bars.");
  c.pardonTerm = c.term;
  prisoner.jailUntil = now;
  prisoner.jailReason = null;
  notify(prisoner, `Mayor ${p.name} pardoned you. You walk out of your cell.`, "good", p, now);
  announce(c, `Mayor ${p.name} pardons ${prisoner.name}.`, now);
  return [{ tone: "good", text: `You pardon ${prisoner.name}. People will talk.` }];
}

export function collectSalary(c: City, p: Player, now: number): GameEvent[] {
  mayorOnly(c, p);
  if (now - c.lastSalaryAt < B.salaryEveryMs) throw new GameError("Payday is once a day.");
  const pay = Math.min(B.salary, c.treasury);
  if (pay <= 0) throw new GameError("The treasury is empty.");
  c.treasury -= pay;
  c.lastSalaryAt = now;
  p.cash += pay;
  return [{ tone: "good", text: `Mayor's salary: +$${pay}.` }];
}

/** Takes money from the treasury with no record anyone can see. Internal affairs keeps one. */
export function skim(c: City, p: Player, amount: number, now: number): GameEvent[] {
  mayorOnly(c, p);
  const a = Math.floor(amount);
  if (!Number.isFinite(a) || a <= 0) throw new GameError("How much?");
  if (a > c.treasury) throw new GameError("The treasury doesn't have that much.");
  c.treasury -= a;
  c.skims.push({ mayorId: p.id, amount: a, at: now });
  p.cash += a;
  shiftIntegrity(p, -5);
  return [{ tone: "info", text: `$${a} quietly moves from the treasury to your pocket. The books will need some creativity.` }];
}

// ── Recall ─────────────────────────────────────────────────────────────────

/** Signatures needed to remove the mayor: half the last election's turnout, at least a few. */
export function recallNeeded(c: City): number {
  return Math.max(B.recallMin, Math.ceil((c.history[0]?.turnout ?? 0) * B.recallShare));
}

export function recallBlock(c: City, p: Player, now: number): string | null {
  if (!c.mayor) return "There's no mayor to recall.";
  if (isMayor(c, p)) return "You can't sign a petition against yourself.";
  if (countryOf(p) !== c.country) return "Only people who live here can sign.";
  if (now < protectedUntil(p)) return "You're too new in town to sign.";
  if (c.recall?.includes(p.id)) return "You already signed.";
  return null;
}

/** A resident signs the recall. Enough signatures and the mayor is out; a special election opens. */
export function signRecall(c: City, p: Player, now: number): GameEvent[] {
  const block = recallBlock(c, p, now);
  if (block) throw new GameError(block);
  c.recall = [...(c.recall ?? []), p.id];
  const needed = recallNeeded(c);
  if (c.recall.length >= needed) {
    const name = c.mayor!.name;
    announce(c, `The recall petition reached ${needed} signatures. ${name} is out of office; a special election is open.`, now);
    c.mayor = null;
    c.chief = null;
    c.candidates = [];
    c.votes = {};
    c.voteDevices = {};
    c.recall = [];
    return [{ tone: "good", text: `Your signature was the last one needed. ${name} is out.` }];
  }
  if (c.recall.length === 1) announce(c, `A recall petition against Mayor ${c.mayor!.name} is going around.`, now);
  return [{ tone: "good", text: `You signed the recall petition (${c.recall.length} of ${needed}).` }];
}

// ── Witness protection ─────────────────────────────────────────────────────

export function protectBlock(c: City, p: Player, cf: CaseFile, now: number): string | null {
  if (!isMayor(c, p) && !isChief(c, p)) return "Only the mayor or the police chief can order protection.";
  if (countryOf(p) !== c.country || cf.country !== c.country) return "That case is in another city.";
  if (cf.protectedBy) return "Those witnesses are already protected.";
  if (cf.trial?.verdict || cf.hunt || caseCold(cf, now)) return "The case is closed.";
  if (!cf.tips.some((t) => t.source === "witness" && t.byId)) return "No witnesses have come forward.";
  if (c.treasury < B.protectionCost) return `A protection detail costs $${B.protectionCost} from the treasury.`;
  return null;
}

/** The mayor or chief puts a case's witnesses under guard, paid from the treasury. */
export function protectWitnesses(c: City, p: Player, cf: CaseFile, now: number): GameEvent[] {
  const block = protectBlock(c, p, cf, now);
  if (block) throw new GameError(block);
  c.treasury -= B.protectionCost;
  cf.protectedBy = { name: p.name, at: now };
  announce(c, `${isMayor(c, p) ? "Mayor" : "Chief"} ${p.name} puts the witnesses in case #${cf.id} under police protection.`, now);
  return [{ tone: "good", text: `Officers are posted outside every witness's door in case #${cf.id}. Nobody gets to them now.` }];
}

// ── Police chief ───────────────────────────────────────────────────────────

export function appointChief(c: City, mayor: Player, officer: Player, now: number): GameEvent[] {
  mayorOnly(c, mayor);
  if (officer.path !== "police" || officer.rank < B.chiefRank) throw new GameError("The chief has to be a Detective or higher.");
  if (countryOf(officer) !== c.country) throw new GameError("They work in another city.");
  if (officer.id === mayor.id) throw new GameError("You can't be your own chief.");
  if (c.chief?.id === officer.id) throw new GameError("They're already the chief.");
  c.chief = { id: officer.id, name: officer.name, since: now };
  c.chiefPaidAt = 0;
  notify(officer, `Mayor ${mayor.name} appointed you police chief of ${COUNTRY_BY_ID[c.country].capital}. You can order crackdowns and draw a daily salary.`, "story", mayor, now);
  announce(c, `Mayor ${mayor.name} appoints ${officer.name} as police chief.`, now);
  return [{ tone: "good", text: `${officer.name} is your police chief.` }];
}

export function dismissChief(c: City, mayor: Player, now: number): GameEvent[] {
  mayorOnly(c, mayor);
  if (!c.chief) throw new GameError("There's no chief to fire.");
  announce(c, `Mayor ${mayor.name} fires police chief ${c.chief.name}.`, now);
  c.chief = null;
  return [{ tone: "info", text: "The chief's office is empty." }];
}

export function chiefSalary(c: City, p: Player, now: number): GameEvent[] {
  if (!isChief(c, p)) throw new GameError("Only the police chief can do that.");
  if (now - (c.chiefPaidAt ?? 0) < B.salaryEveryMs) throw new GameError("Payday is once a day.");
  const pay = Math.min(B.chiefSalary, c.treasury);
  if (pay <= 0) throw new GameError("The treasury is empty.");
  c.treasury -= pay;
  c.chiefPaidAt = now;
  p.cash += pay;
  return [{ tone: "good", text: `Chief's salary: +$${pay}.` }];
}

// ── Soup kitchen ───────────────────────────────────────────────────────────

export function fundSoup(c: City, mayor: Player, amount: number, now: number): GameEvent[] {
  mayorOnly(c, mayor);
  const meals = Math.floor(amount / B.mealCost);
  if (!Number.isFinite(meals) || meals < 1) throw new GameError(`Meals cost $${B.mealCost} each.`);
  const cost = meals * B.mealCost;
  if (cost > c.treasury) throw new GameError("The treasury doesn't have that much.");
  c.treasury -= cost;
  c.soupMeals = (c.soupMeals ?? 0) + meals;
  mayor.reputation += Math.floor(meals / 10);
  announce(c, `Mayor ${mayor.name} pays for ${meals} free meals at the soup kitchen.`, now);
  return [{ tone: "good", text: `${meals} meals paid for. The line out the door will remember your name.` }];
}

export function soupBlock(c: City, p: Player, now: number): string | null {
  if (!(c.soupMeals ?? 0)) return "The soup kitchen is out of food.";
  if (countryOf(p) !== c.country) return "That kitchen is in another city.";
  if (p.cash + p.bank >= B.soupMaxMoney) return "The soup kitchen is for people with nothing.";
  if (now - (p.lastSoupAt ?? 0) < B.soupEveryMs) return "You already ate here today. Come back later.";
  return null;
}

export function eatSoup(c: City, p: Player, now: number): GameEvent[] {
  const block = soupBlock(c, p, now);
  if (block) throw new GameError(block);
  c.soupMeals = (c.soupMeals ?? 0) - 1;
  c.mealsServed = (c.mealsServed ?? 0) + 1;
  p.lastSoupAt = now;
  p.energy = Math.min(maxEnergy(p.housing), p.energy + B.mealEnergy);
  return [{ tone: "good", text: `A bowl of hot soup, paid for by city hall. +${B.mealEnergy} energy.` }];
}

/** Withheld tax on job pay or business income. */
export function taxOn(amount: number, rate: number): number {
  return Math.floor(amount * rate);
}

/** Puts a player's withheld tax into their city's treasury. */
export function depositTax(c: City, owed: { country: CountryId; amount: number }) {
  if (owed.country === c.country && owed.amount > 0) c.treasury += owed.amount;
}

/** Hidden skims by this player that internal affairs hasn't exposed yet. */
export function unexposedSkims(c: City, playerId: string) {
  return c.skims.filter((s) => s.mayorId === playerId && !s.exposed);
}

// ── View ───────────────────────────────────────────────────────────────────

export function cityView(c: City, p: Player, now: number) {
  const mayor = isMayor(c, p);
  return {
    country: c.country,
    city: COUNTRY_BY_ID[c.country].capital,
    mayor: c.mayor ? { name: c.mayor.name, since: c.mayor.since, you: mayor } : null,
    termEnds: termEnds(c.term),
    electionOpen: electionOpen(c, now),
    electionOpens: termEnds(c.term) - B.electionMs,
    taxRate: c.taxRate,
    policeBounty: c.policeBounty,
    treasury: c.treasury,
    crackdown: crackdownOn(c, now) ? c.crackdownUntil : null,
    chief: c.chief ? { name: c.chief.name, you: isChief(c, p) } : null,
    guards: (c.guards ?? []).filter((g) => g.until > now).length,
    seats: seatsView(c, p, now),
    mostWanted: c.mostWanted && c.mostWanted.until > now ? c.mostWanted.name : null,
    truceUntil: (c.truceUntil ?? 0) > now ? c.truceUntil! : null,
    martial: martialOn(c, now) ? c.martialUntil! : null,
    canMartial: isMayor(c, p) ? martialBlock(c, p, now) : "Only the mayor.",
    canGuard: guardBlock(c, p, now),
    editor: c.editor ? { name: c.editor.name, you: c.editor.id === p.id, price: c.editor.price } : null,
    editorControls:
      c.editor?.id === p.id
        ? { canSalary: now - (c.editorPaidAt ?? 0) >= 24 * 60 * 60_000 && c.treasury > 0, editorial: c.editorial?.text ?? "", price: c.editor.price }
        : null,
    recall: c.mayor ? { signatures: c.recall?.length ?? 0, needed: recallNeeded(c), signed: !!c.recall?.includes(p.id), canSign: recallBlock(c, p, now) } : null,
    soupMeals: c.soupMeals ?? 0,
    mealsServed: c.mealsServed ?? 0,
    canSoup: soupBlock(c, p, now),
    chiefControls: isChief(c, p)
      ? { canCrackdown: now - c.lastCrackdownAt >= B.crackdownCooldownMs, canSalary: now - (c.chiefPaidAt ?? 0) >= B.salaryEveryMs && c.treasury > 0, salary: B.chiefSalary }
      : null,
    candidates: c.candidates.map((x) => ({ id: x.id, name: x.name, title: x.title, reputation: x.reputation, pitch: x.pitch, buzz: buzzWord(x.spent ?? 0) })),
    amCandidate: c.candidates.some((x) => x.id === p.id),
    turnout: Object.keys(c.votes).length,
    myVote: c.votes[p.id] ? c.candidates.find((x) => x.id === c.votes[p.id])?.name ?? null : null,
    canRun: runBlock(c, p, now),
    canVote: voteBlock(c, p, now),
    history: c.history,
    log: c.log,
    // Mayor-only controls.
    controls: mayor
      ? {
          canCrackdown: now - c.lastCrackdownAt >= B.crackdownCooldownMs,
          canPardon: c.pardonTerm !== c.term,
          canSalary: now - c.lastSalaryAt >= B.salaryEveryMs && c.treasury > 0,
          maxTax: B.maxTax,
          maxBounty: B.maxBounty,
          salary: B.salary,
          mealCost: B.mealCost,
        }
      : null,
    // Tallies stay secret until the ballot closes; during it, only turnout is public.
    lastResult: c.history[0] ?? null,
  };
}
