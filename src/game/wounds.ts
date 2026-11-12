// Old wounds. Every hospital stay from a fight you chose (or a job that went wrong) leaves an old
// wound that lowers your maximum health. Wounds fade with rest, and a doctor can operate to
// remove them. Being the victim of a random mugging never leaves one.

import { BALANCE } from "./balance";
import { GameError, type GameEvent, type Player } from "./types";
import { addMerit } from "./engine";

export const WOUNDS = {
  hpPerWound: 4,
  max: 7,
  /** One wound fades after this long without a new one. */
  fadeMs: 3 * 24 * 60 * 60_000,
  surgeryRank: 3,
  surgeryRemoves: 2,
  surgeryEnergy: 15,
  minFee: 1000,
  maxFee: 20000,
};

export const woundsOf = (p: Player) => p.wounds?.count ?? 0;

/** Maximum health after old wounds (never below 72). */
export function playerMaxHp(p: Player): number {
  return BALANCE.hp.max - WOUNDS.hpPerWound * Math.min(WOUNDS.max, woundsOf(p));
}

export function addWound(p: Player, now: number) {
  p.wounds = { count: Math.min(WOUNDS.max, woundsOf(p) + 1), at: now };
}

/** Wounds fade one at a time with rest. Called from tick(). */
export function healWounds(p: Player, now: number) {
  const w = p.wounds;
  if (!w || w.count <= 0) return;
  const faded = Math.floor((now - w.at) / WOUNDS.fadeMs);
  if (faded > 0) p.wounds = { count: Math.max(0, w.count - faded), at: w.at + faded * WOUNDS.fadeMs };
  if (p.hp > playerMaxHp(p)) p.hp = playerMaxHp(p);
}

/** How it feels, never a number. */
export function woundHint(p: Player): string | null {
  const n = woundsOf(p);
  if (!n) return null;
  if (n === 1) return "An old bruise that hasn't quite healed.";
  if (n <= 3) return "Your ribs still ache when you breathe deep.";
  if (n <= 5) return "Your body is a map of old fights. You tire quicker than you used to.";
  return "Every old wound hurts at once. A doctor would tell you to stop fighting.";
}

// ── Surgery ────────────────────────────────────────────────────────────────

export function setSurgeryFee(doctor: Player, fee: number | null): GameEvent[] {
  if (doctor.path !== "medicine" || doctor.rank < WOUNDS.surgeryRank) throw new GameError("Only doctors (Resident and up) can operate.");
  if (fee === null) {
    doctor.surgeryFee = null;
    return [{ tone: "info", text: "You stop taking surgery patients." }];
  }
  if (!Number.isFinite(fee) || fee < WOUNDS.minFee || fee > WOUNDS.maxFee) throw new GameError(`Set a fee between $${WOUNDS.minFee} and $${WOUNDS.maxFee}.`);
  doctor.surgeryFee = Math.floor(fee);
  return [{ tone: "good", text: `You're taking surgery patients at $${doctor.surgeryFee}.` }];
}

export function surgeryBlock(patient: Player, doctor: Player): string | null {
  if (doctor.path !== "medicine" || doctor.rank < WOUNDS.surgeryRank || !doctor.surgeryFee) return "They aren't taking surgery patients.";
  if (patient.id === doctor.id) return "You can't operate on yourself.";
  if (!woundsOf(patient)) return "You have no old wounds to fix.";
  if (doctor.energy < WOUNDS.surgeryEnergy) return "The doctor is too tired to operate right now.";
  if (patient.cash < doctor.surgeryFee) return `The surgery costs $${doctor.surgeryFee}, cash.`;
  return null;
}

/** The patient pays the doctor's fee; up to two old wounds are fixed. */
export function surgery(patient: Player, doctor: Player, now: number): GameEvent[] {
  const block = surgeryBlock(patient, doctor);
  if (block) throw new GameError(block);
  const fee = doctor.surgeryFee!;
  patient.cash -= fee;
  doctor.cash += fee;
  doctor.energy -= WOUNDS.surgeryEnergy;
  doctor.reputation += 1;
  const fixed = Math.min(WOUNDS.surgeryRemoves, woundsOf(patient));
  patient.wounds = { count: woundsOf(patient) - fixed, at: now };
  addMerit(doctor, "medicine", 2);
  return [{ tone: "good", text: `Dr. ${doctor.name} operates. ${fixed === 1 ? "An old wound" : "Two old wounds"} fixed. You breathe easier. -$${fee}` }];
}
