// Search warrants, lawyers on retainer, and the doctors' black market.

import { assertNotAlt } from "./anticheat";
import { BALANCE } from "./balance";
import { CRIMES, caseCold, suspectsFor, type SuspectMatch } from "./crime";
import { countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { notify } from "./social";
import { canPayIllegal, earnDirty, payIllegal } from "./money";
import { sv } from "./stats";
import { seizeStash } from "./stash";
import { GameError, type CaseFile, type GameEvent, type Player, type Rng } from "./types";

const S = BALANCE.search;
const R = BALANCE.retainer;
const M = BALANCE.backAlley;

// ── Search warrants ────────────────────────────────────────────────────────

export function searchBlock(o: Player, c: CaseFile, suspect: Player | null, eligible: SuspectMatch[], now: number): string | null {
  if (o.path !== "police" || o.rank < BALANCE.crime.detectiveRank) return "Only detectives can search a home.";
  if (countryOf(o) !== c.country) return "That case is in another country.";
  if (c.trial) return "Someone has already been arrested for this.";
  if (caseCold(c, now)) return "This case went cold.";
  if (c.searches?.some((s) => s.searcherId === o.id)) return "You already searched for this case.";
  if (!suspect || suspect.dead) return "They're not around anymore.";
  if (suspect.id === o.id) return "You can't search your own place.";
  // The court clerk signs the warrant only when the suspect fits the clues.
  if (!eligible.some((s) => s.id === suspect.id)) return "No judge would sign that warrant: they don't fit the clues.";
  if (o.energy < S.energy) return "You're too tired.";
  return null;
}

/** A detective searches a suspect's home. If it's really them, the stolen goods usually turn up. */
export function searchHome(
  o: Player,
  suspect: Player,
  c: CaseFile,
  pool: { player: Player; crewTag: string | null }[],
  suspectCrewTag: string | null,
  now: number,
  rng: Rng,
): GameEvent[] {
  const eligible = suspectsFor(c, [...pool.filter((x) => x.player.id !== suspect.id), { player: suspect, crewTag: suspectCrewTag }]);
  const block = searchBlock(o, c, suspect, eligible, now);
  if (block) throw new GameError(block);
  o.energy -= S.energy;
  // A careful criminal (sharp wits) may have hidden the goods well.
  const hidden = Math.min(0.5, (sv(suspect, "wits") - 10) / 120);
  const found = suspect.id === c.culpritId && rng() >= S.missChance + hidden;
  c.searches = [...(c.searches ?? []), { searcherId: o.id, suspectId: suspect.id, suspectName: suspect.name, found, at: now }];
  const what = CRIMES[c.kind].name.toLowerCase();
  if (found) {
    const seized = seizeStash(suspect, c.country);
    const extra = [seized.dirty ? `$${seized.dirty.toLocaleString()} in dirty money` : "", seized.units ? `${seized.units} units of product` : ""].filter(Boolean).join(" and ");
    notify(suspect, `The police searched your place with a warrant. They found things from the ${what} in ${c.district}${extra ? `, and your stash: ${extra}, seized` : ""}.`, "bad", o, now);
    return [{ tone: "good", text: `Warrant served. In ${suspect.name}'s place: things from the ${what}${extra ? `, and a stash: ${extra}. Seized` : ""}. That will hold up in court.` }];
  }
  suspect.reputation += 1;
  o.reputation = Math.max(0, o.reputation - 1);
  notify(suspect, `The police turned your place upside down with a warrant. They found nothing. +1 reputation.`, "info", o, now);
  return [{ tone: "info", text: `You search ${suspect.name}'s place top to bottom. Nothing.` }];
}

/** Evidence bonus for the arrest: a successful search of this suspect makes the case airtight. */
export function searchFound(c: CaseFile, suspectId: string): boolean {
  return !!c.searches?.some((s) => s.suspectId === suspectId && s.found);
}

// ── Lawyers on retainer ────────────────────────────────────────────────────

export const retainerFee = (lawyer: Player) => R.base + lawyer.rank * R.perRank;

export function hireBlock(client: Player, lawyer: Player | null, now: number): string | null {
  if (!lawyer || lawyer.dead) return "They're not around anymore.";
  if (lawyer.id === client.id) return "You can't be your own lawyer.";
  if (lawyer.path !== "courts" || lawyer.rank < BALANCE.justice.lawyerRank) return "They're not an attorney.";
  if (client.retainer && client.retainer.until > now && client.retainer.lawyerId === lawyer.id) return "They're already your lawyer.";
  if (!client.hasBankAccount || client.bank < retainerFee(lawyer)) return `A week of ${lawyer.name}'s time costs $${retainerFee(lawyer)} from the bank.`;
  return null;
}

/** A week on retainer: if you're arrested, this lawyer takes your defense automatically. */
export function hireLawyer(client: Player, lawyer: Player, now: number, lawyerPower: number): GameEvent[] {
  assertNotAlt(client, lawyer);
  const block = hireBlock(client, lawyer, now);
  if (block) throw new GameError(block);
  const fee = retainerFee(lawyer);
  client.bank -= fee;
  lawyer.cash += fee;
  client.retainer = { lawyerId: lawyer.id, name: lawyer.name, power: lawyerPower, until: now + R.weekMs };
  notify(lawyer, `${client.name} put you on retainer for a week: $${fee}. If they're arrested, you defend them.`, "good", client, now);
  return [{ tone: "good", text: `${lawyer.name} is your lawyer for the next week. If you're arrested, they're already on it.` }];
}

// ── Doctors' black market ──────────────────────────────────────────────────

export const backAlleyFee = (doctor: Player) => M.base + doctor.rank * M.perRank;

export function setBackAlley(d: Player, open: boolean): GameEvent[] {
  if (d.path !== "medicine" || d.rank < BALANCE.casework.clinic.minRank) throw new GameError("Only doctors can do that.");
  d.backAlley = open;
  return [{ tone: "info", text: open ? "Word gets around: you'll patch people up, no questions asked." : "You close the back door." }];
}

export function backAlleyBlock(patient: Player, doctor: Player | null, now: number): string | null {
  if (!inHospital(patient, now)) return "You're not in the clinic.";
  if (!doctor || !doctor.backAlley || doctor.dead) return "That doctor isn't taking back-alley patients.";
  if (doctor.id === patient.id) return "You can't treat yourself.";
  if (countryOf(doctor) !== countryOf(patient)) return "They work in another country.";
  if (inJail(doctor, now)) return "They're behind bars.";
  if (!canPayIllegal(patient, backAlleyFee(doctor))) return `It's $${backAlleyFee(doctor)}, cash only.`;
  return null;
}

/** The patient pays cash and walks out today. Nothing on record but the doctor's secret ledger. */
export function backAlleyTreat(patient: Player, doctor: Player, now: number): GameEvent[] {
  assertNotAlt(patient, doctor);
  const block = backAlleyBlock(patient, doctor, now);
  if (block) throw new GameError(block);
  const fee = backAlleyFee(doctor);
  payIllegal(patient, fee);
  earnDirty(doctor, fee);
  patient.hospitalUntil = now;
  patient.hp = Math.max(patient.hp, 60);
  shiftIntegrity(doctor, -3);
  doctor.offBooks = [...(doctor.offBooks ?? []), { at: now, amount: fee }];
  notify(doctor, `A patient slipped out the back door: $${fee}, cash.`, "info", undefined, now);
  return [{ tone: "good", text: `A doctor stitches you up in a back room. $${fee}, no paperwork, and you're back on your feet.` }];
}
