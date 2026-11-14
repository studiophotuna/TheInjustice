// Crimes and heists as a run of cards, like fights (see components/caperscene.tsx). The server
// already works a job out step by step: casing it, the lock, the vault, the guards, the lookout,
// the getaway. This records those steps so the screen can play them back. Nothing here rolls
// anything: it only describes what the crime code already decided. No odds, no gear.

import type { FightSummary, GameEvent } from "./types";

export type CaperCard =
  | "case" | "lift" | "snatch" | "lock" | "inside" | "vault" | "guards" | "lookout"
  | "getaway" | "alarm" | "dog" | "owner" | "witness" | "hotwire" | "hacker"
  // Arson
  | "douse" | "light" | "blaze" | "sprinkler" | "patrol"
  // Turf war
  | "rally" | "hold" | "clash" | "flag";

export interface CaperStep {
  card: CaperCard;
  /** Did this part go your way. */
  ok: boolean;
  /** One line of what happened. */
  line: string;
  /** Who did it, on crew jobs. */
  who?: string;
}

/**
 * How the job ended: clean, done but seen, nothing to take, caught in the act, all arrested,
 * or it simply didn't work (foiled). Turf wars end with the district taken or held.
 */
export type CaperResult = "clean" | "seen" | "empty" | "caught" | "busted" | "foiled" | "taken" | "held";

export interface Caper {
  steps: CaperStep[];
  result: CaperResult;
  /** Whether it went the viewer's way, when the result alone doesn't say (turf wars). */
  good?: boolean;
}

/** The event that plays the job on screen. Its text is the log line; the steps are the scene. */
export function caperEvent(title: string, steps: CaperStep[], result: CaperResult, good?: boolean): GameEvent {
  const won = good ?? (result === "clean" || result === "seen");
  const fight: FightSummary = {
    opponent: title,
    icon: "",
    won,
    lines: [steps[steps.length - 1]?.line ?? ""],
    outcome: won ? "win" : "loss",
    caper: good === undefined ? { steps, result } : { steps, result, good },
  };
  return { tone: won ? "good" : result === "empty" ? "info" : "bad", text: title, fight };
}

/** Witnesses add a last card: you got away, but someone saw. */
export function witnessStep(n: number, line?: string): CaperStep[] {
  return n ? [{ card: "witness", ok: false, line: line ?? (n === 1 ? "Someone saw it happen." : "People saw it happen.") }] : [];
}
