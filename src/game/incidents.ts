// The city lives on its own. Every so often something happens between the city's own people
// (the street regulars): a mugging, a snatched bag, a fire, a car wreck. Each incident is real
// work for the careers that deal with it, the same work a player's crime makes:
//
//  - Muggings and snatches open a case file: detectives work the scene and arrest the culprit,
//    the courts try them, doctors examine the victim, bankers review the money the thief banks,
//    vigilantes hunt the thief once the case goes cold.
//  - Fires go on the fire log for the Fire Department.
//  - Car wrecks put the driver in hospital and leave a wreck at the garage for mechanics.
//  - Thieves pick up a record, and hackers can scrub it for them.
//
// Anyone in hospital, player or regular, can be treated by a doctor.

import { ALT_BLOCK, sameOwner } from "./anticheat";
import { accountNumber, isMedic } from "./casework";
import { addMerit, countryOf, inHospital, inJail, shiftIntegrity } from "./engine";
import { addTip, crimeDistrict, suspectProfile } from "./crime";
import { logFire, SCRUB } from "./firehack";
import { earnDirty } from "./money";
import { notify } from "./social";
import { CARS } from "./vehicles";
import { isHeavy } from "./regulars";
import { GameError, type CaseFile, type City, type GameEvent, type Player, type Rng } from "./types";

export const INCIDENT = {
  /** One incident per city this often (when the city has enough regulars out). */
  everyMs: 75 * 60_000,
  /** How long a hurt regular spends in hospital. */
  stayMs: [60 * 60_000, 150 * 60_000] as [number, number],
  /** Chance a thief banks the money soon after (a deposit for the bank's compliance desk). */
  depositChance: 0.45,
  /** Record a thief picks up. */
  heat: 15,
  /** Wrecks wait at the garage this long. */
  walkInMs: 12 * 60 * 60_000,
  /** A doctor treats a patient: half their remaining stay. */
  treat: { energy: 8, fee: 25, feePerRank: 8, merit: 1.5 },
  /** A mechanic fixes a regular's wreck. */
  repair: { minRank: 1, energy: 10, fee: [80, 260] as [number, number], merit: 1.5 },
  /** A hacker scrubs a regular's record (they pay dirty money). */
  scrub: { energy: 10, minHeat: 10, fee: 120, feePerRank: 30 },
};

export type IncidentKind = "pickpocket" | "snatch" | "mug" | "arson" | "crash";

const WEIGHTS: [IncidentKind, number][] = [
  ["mug", 30],
  ["snatch", 25],
  ["pickpocket", 8],
  ["arson", 15],
  ["crash", 22],
];

const PLACES = ["shop", "garage", "bar", "kiosk", "diner", "workshop"];
const BYSTANDERS = ["A shopkeeper", "A bus driver", "A street vendor", "A taxi driver", "A kid on a bike"];
const pick = <T,>(xs: readonly T[], rng: Rng): T => xs[Math.floor(rng() * xs.length)];
const between = ([lo, hi]: [number, number], rng: Rng) => Math.round(lo + rng() * (hi - lo));

/** Who could be at the wrong end of a city incident right now. */
const free = (p: Player, now: number) => !p.dead && !inJail(p, now) && !inHospital(p, now);

/** Regulars who'd rob someone: the street's muscle and its drifters, never the law or the big bosses. */
const roughs = (regs: Player[], now: number) => regs.filter((r) => free(r, now) && !isHeavy(r) && (r.path === "enforcer" || r.path === null));

export function incidentDue(c: City, now: number): boolean {
  return now - (c.incidentAt ?? 0) >= INCIDENT.everyMs;
}

/** Picks what happens and to whom. Null if the city has nobody to make it happen. */
export function planIncident(regs: Player[], now: number, rng: Rng): { kind: IncidentKind; culpritId: string | null; victimId: string } | null {
  const total = WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  let kind: IncidentKind = "crash";
  for (const [k, w] of WEIGHTS) {
    if ((roll -= w) < 0) {
      kind = k;
      break;
    }
  }
  const people = regs.filter((r) => free(r, now));
  if (kind === "crash") return people.length ? { kind, culpritId: null, victimId: pick(people, rng).id } : null;
  const thieves = roughs(regs, now);
  if (!thieves.length) return null;
  const culprit = pick(thieves, rng);
  const victims = people.filter((r) => r.id !== culprit.id);
  if (!victims.length) return null;
  return { kind, culpritId: culprit.id, victimId: pick(victims, rng).id };
}

function hurt(p: Player, now: number, rng: Rng) {
  p.hospitalUntil = now + between(INCIDENT.stayMs, rng);
  p.hp = Math.min(p.hp, 15);
}

/**
 * Makes the incident happen. Mutates the people and the city. Returns the case file (for
 * street crimes) and the line for the city log.
 */
export function runIncident(
  kind: IncidentKind,
  culprit: Player | null,
  victim: Player,
  c: City,
  now: number,
  rng: Rng,
  caseId: string,
): { caseFile: CaseFile | null; line: string } {
  c.incidentAt = now;
  const district = crimeDistrict(victim, rng);

  if (kind === "crash") {
    hurt(victim, now, rng);
    const car = pick(Object.values(CARS), rng).name.toLowerCase();
    c.walkIns = [
      { id: `w${now.toString(36)}${Math.floor(rng() * 1e4).toString(36)}`, kind: "repair" as const, npcId: victim.id, npcName: victim.name, what: car, at: now, fee: between(INCIDENT.repair.fee, rng) },
      ...(c.walkIns ?? []).filter((w) => !w.doneBy && now - w.at < INCIDENT.walkInMs),
    ].slice(0, 8);
    return { caseFile: null, line: `${victim.name} wrapped a ${car} around a lamppost in ${district}. The driver is in hospital, the car is at the garage.` };
  }

  const thief = culprit!;
  thief.heat += INCIDENT.heat;
  if (kind === "arson") {
    const what = `${victim.name}'s ${pick(PLACES, rng)}`;
    logFire(c, { at: now, what, victimName: victim.name, arsonistId: thief.id, arsonistName: thief.name }, now);
    return { caseFile: null, line: `Fire in ${district}: ${what} burned overnight. The Fire Department suspects it was set.` };
  }

  const amount = Math.min(victim.cash, between([40, 220], rng));
  victim.cash -= amount;
  earnDirty(thief, amount);
  if (kind === "mug") hurt(victim, now, rng);
  const cf: CaseFile = {
    id: caseId,
    country: countryOf(victim),
    district,
    kind,
    at: now,
    victimId: victim.id,
    victimName: victim.name,
    amount,
    culpritId: thief.id,
    suspect: suspectProfile(thief, null),
    tips: [],
    witnesses: [],
    investigatedBy: [],
  };
  if (kind !== "pickpocket") addTip(cf, "victim", 0.7, now, rng, victim.id, "Victim");
  for (let i = 0; i < 2; i++) addTip(cf, "bystander", 0.6, now, rng, undefined, pick(BYSTANDERS, rng));
  if (amount >= 50 && rng() < INCIDENT.depositChance) {
    cf.deposit = { amount: Math.floor(amount * (0.6 + rng() * 0.4)), at: now + 10 * 60_000, account: accountNumber(thief.id) };
  }
  const what = { pickpocket: "had a wallet lifted", snatch: "had a bag snatched", mug: "was mugged" }[kind];
  return { caseFile: cf, line: `${victim.name} ${what} in ${district}. The police opened case #${cf.id}.` };
}

// ── Doctors: anyone in hospital ─────────────────────────────────────────────

export const treatFee = (d: Player) => INCIDENT.treat.fee + d.rank * INCIDENT.treat.feePerRank;

export function treatBlock(d: Player, patient: Player | null, now: number): string | null {
  if (!isMedic(d)) return "Only doctors (Intern and up) can treat patients.";
  if (!patient || patient.dead) return "That patient isn't here anymore.";
  if (patient.id === d.id) return "You can't treat yourself.";
  if (!inHospital(patient, now)) return "They've already been discharged.";
  if (countryOf(patient) !== countryOf(d)) return "That patient is in another city.";
  if (sameOwner(d, patient)) return ALT_BLOCK;
  if (patient.treatedStay === patient.hospitalUntil) return "Someone already treated them.";
  if (inJail(d, now) || inHospital(d, now)) return "You're in no shape for it.";
  if (d.energy < INCIDENT.treat.energy) return "You're too tired.";
  return null;
}

/** A doctor works on a patient: their remaining stay is halved, the city pays the doctor. */
export function treat(d: Player, patient: Player, now: number): GameEvent[] {
  const block = treatBlock(d, patient, now);
  if (block) throw new GameError(block);
  d.energy -= INCIDENT.treat.energy;
  patient.hospitalUntil = now + Math.round((patient.hospitalUntil - now) / 2);
  patient.treatedStay = patient.hospitalUntil;
  const fee = treatFee(d);
  d.cash += fee;
  d.jobCounts["doctor:treat"] = (d.jobCounts["doctor:treat"] ?? 0) + 1;
  if (!patient.regular) notify(patient, `Dr. ${d.name} treated you. You'll be out in half the time.`, "good", d, now);
  return [{ tone: "good", text: `You treat ${patient.name}. They'll be out in half the time. The city pays $${fee}.` }, ...addMerit(d, "medicine", INCIDENT.treat.merit)];
}

// ── Mechanics: wrecks from the street ──────────────────────────────────────

export function repairWalkInBlock(m: Player, c: City, id: string, now: number): string | null {
  if (m.path !== "mechanic" || m.rank < INCIDENT.repair.minRank) return "Only mechanics take garage jobs.";
  if (countryOf(m) !== c.country) return "That garage is in another city.";
  const w = (c.walkIns ?? []).find((x) => x.id === id);
  if (!w || now - w.at >= INCIDENT.walkInMs) return "That job isn't waiting anymore.";
  if (w.doneBy) return `${w.doneBy} already fixed it.`;
  if (inJail(m, now) || inHospital(m, now)) return "You're in no shape for it.";
  if (m.energy < INCIDENT.repair.energy) return "You're too tired.";
  return null;
}

export function repairWalkIn(m: Player, c: City, id: string, now: number): GameEvent[] {
  const block = repairWalkInBlock(m, c, id, now);
  if (block) throw new GameError(block);
  const w = c.walkIns!.find((x) => x.id === id)!;
  w.doneBy = m.name;
  m.energy -= INCIDENT.repair.energy;
  m.cash += w.fee;
  m.jobCounts["mechanic:walkin"] = (m.jobCounts["mechanic:walkin"] ?? 0) + 1;
  return [{ tone: "good", text: `You get ${w.npcName}'s ${w.what} back on the road. They pay $${w.fee}.` }, ...addMerit(m, "mechanic", INCIDENT.repair.merit)];
}

export function walkInsView(c: City | null | undefined, m: Player, now: number) {
  if (!c) return [];
  return (c.walkIns ?? [])
    .filter((w) => !w.doneBy && now - w.at < INCIDENT.walkInMs)
    .map((w) => ({ id: w.id, npcName: w.npcName, what: w.what, at: w.at, fee: w.fee, block: repairWalkInBlock(m, c, w.id, now) }));
}

// ── Hackers: the street's own records ──────────────────────────────────────

export const npcScrubFee = (h: Player) => INCIDENT.scrub.fee + h.rank * INCIDENT.scrub.feePerRank;

export function npcScrubBlock(h: Player, client: Player | null, now: number): string | null {
  if (h.path !== "hacker" || h.rank < SCRUB.minRank) return "Pen Testers and up can scrub records.";
  if (!client || !client.regular || client.dead) return "They're not around anymore.";
  if (countryOf(client) !== countryOf(h)) return "They live in another city.";
  if (client.heat < INCIDENT.scrub.minHeat) return "Their record is clean enough.";
  if (now - (client.attackLog?.scrub ?? 0) < SCRUB.cooldownMs) return "Their record was just scrubbed.";
  if (inJail(h, now) || inHospital(h, now)) return "You're in no shape for it.";
  if (h.energy < INCIDENT.scrub.energy) return "You're too tired.";
  return null;
}

export function npcScrub(h: Player, client: Player, now: number): GameEvent[] {
  const block = npcScrubBlock(h, client, now);
  if (block) throw new GameError(block);
  h.energy -= INCIDENT.scrub.energy;
  const removed = Math.min(client.heat, SCRUB.heat);
  client.heat -= removed;
  client.attackLog = { ...(client.attackLog ?? {}), scrub: now };
  const fee = npcScrubFee(h);
  earnDirty(h, fee);
  shiftIntegrity(h, -1);
  h.jobCounts["hacker:walkin"] = (h.jobCounts["hacker:walkin"] ?? 0) + 1;
  return [{ tone: "good", text: `You get into the records system for ${client.name}. Their file gets thinner. $${fee}, dirty.` }, ...addMerit(h, "hacker", SCRUB.merit)];
}

export function npcClientsView(regs: Player[], h: Player, now: number) {
  return regs
    .filter((r) => r.heat >= INCIDENT.scrub.minHeat && !r.dead)
    .slice(0, 6)
    .map((r) => ({ id: r.id, name: r.name, fee: npcScrubFee(h), block: npcScrubBlock(h, r, now) }));
}

// ── Patients ───────────────────────────────────────────────────────────────

export function patientsView(people: Player[], d: Player, now: number) {
  return people
    .filter((x) => x.id !== d.id && inHospital(x, now) && x.treatedStay !== x.hospitalUntil)
    .sort((a, b) => b.hospitalUntil - a.hospitalUntil)
    .slice(0, 10)
    .map((x) => ({ id: x.id, name: x.name, until: x.hospitalUntil, fee: treatFee(d), block: treatBlock(d, x, now) }));
}
