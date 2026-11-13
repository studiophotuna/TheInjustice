// Who may play. Crookvale has crime, guns, drugs and a casino with simulated gambling, so it's for
// adults. The form asks for a birth date without saying the minimum age (a neutral age gate),
// and the date is kept privately on the character. Change the age here.
import { GameError } from "./types";

export const AGE = { min: 18 };

export const UNDERAGE = "Sorry, Crookvale isn't available to you.";

/** Checks a "YYYY-MM-DD" birth date. Returns it, or throws a player-facing error. */
export function parseBirthDate(raw: unknown, now: number): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) throw new GameError("Enter your date of birth.");
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) throw new GameError("That date doesn't exist.");
  if (date.getTime() > now) throw new GameError("That date is in the future.");
  if (ageOn(s, now) > 120) throw new GameError("Check the year.");
  return s;
}

/** Whole years old on this day. */
export function ageOn(birth: string, now: number): number {
  const [y, m, d] = birth.split("-").map(Number);
  const t = new Date(now);
  let age = t.getUTCFullYear() - y;
  if (t.getUTCMonth() + 1 < m || (t.getUTCMonth() + 1 === m && t.getUTCDate() < d)) age--;
  return age;
}

export const oldEnough = (birth: string, now: number) => ageOn(birth, now) >= AGE.min;
