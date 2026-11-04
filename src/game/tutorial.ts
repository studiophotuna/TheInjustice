// Your first day: a short checklist that walks a new player through the basics, with a small
// reward for each step. Steps are detected from what the player has actually done.

import { GameError, type GameEvent, type Player } from "./types";

export interface TutorialStep {
  id: string;
  title: string;
  hint: string;
  /** Where the "Show me" button goes. */
  go: string;
  done: (p: Player) => boolean;
}

const did = (p: Player, pred: (key: string) => boolean) => Object.keys(p.jobCounts).some(pred);

export const TUTORIAL: TutorialStep[] = [
  { id: "job", title: "Do your first job", hint: "Jobs build your hidden strengths and pay a little.", go: "tab:jobs", done: (p) => did(p, (k) => !k.includes(":")) },
  { id: "eat", title: "Eat something", hint: "Food in the Shop refills energy.", go: "tab:shop", done: (p) => p.fullUntil > 0 },
  { id: "daily", title: "Collect your daily reward", hint: "Come back every day for a bigger one.", go: "tab:home", done: (p) => !!p.daily?.lastClaim },
  { id: "bank", title: "Put money in the bank", hint: "Muggers can't steal what's in the bank.", go: "place:bank", done: (p) => p.hasBankAccount && p.bank > 0 },
  { id: "gym", title: "Train at the gym", hint: "The gym builds strength, toughness or agility.", go: "tab:fight", done: (p) => did(p, (k) => k.startsWith("gym:")) },
  { id: "fight", title: "Win a street fight", hint: "Your gut tells you who you can beat.", go: "tab:fight", done: (p) => (p.jobCounts["fight:win"] ?? 0) > 0 },
  { id: "story", title: "Read a chapter of your story", hint: "Who framed you? The Ledger remembers.", go: "tab:city", done: (p) => p.flags.some((f) => f.startsWith("read:")) },
  { id: "people", title: "See who's out on the streets", hint: "Other players: allies, rivals, marks.", go: "tab:people", done: (p) => p.flags.includes("visited:people") },
  { id: "map", title: "Visit the city", hint: "Police, courthouse, hospital, bank, academy, city hall.", go: "tab:city", done: (p) => p.flags.includes("visited:map") },
  { id: "career", title: "Find a career", hint: "Enroll at the Academy, or impress the right people.", go: "place:academy", done: (p) => !!p.path || !!p.application || p.offers.length > 0 },
];

export const TUTORIAL_REWARD = 15;
export const TUTORIAL_BONUS = 100;

/** Claims the reward for a finished step; finishing them all pays a bonus. */
export function claimTutorial(p: Player, stepId: string): GameEvent[] {
  if (stepId === "all") {
    const ready = TUTORIAL.filter((s) => !p.flags.includes(`tut:${s.id}`) && s.done(p));
    if (!ready.length) throw new GameError("Nothing to claim.");
    return ready.flatMap((s) => claimTutorial(p, s.id));
  }
  const step = TUTORIAL.find((s) => s.id === stepId);
  if (!step) throw new GameError("Unknown step.");
  if (p.flags.includes(`tut:${step.id}`)) throw new GameError("Already claimed.");
  if (!step.done(p)) throw new GameError("Not done yet.");
  p.flags.push(`tut:${step.id}`);
  p.cash += TUTORIAL_REWARD;
  p.reputation += 1;
  const events: GameEvent[] = [{ tone: "good", text: `${step.title}: done. +$${TUTORIAL_REWARD}, +1 reputation.` }];
  if (TUTORIAL.every((s) => p.flags.includes(`tut:${s.id}`))) {
    p.cash += TUTORIAL_BONUS;
    events.push({ tone: "story", text: `Your first day is over. You know how this city works now. +$${TUTORIAL_BONUS}.` });
  }
  return events;
}

export function tutorialView(p: Player) {
  if (p.flags.includes("tut:hidden")) return null;
  const steps = TUTORIAL.map((s) => ({ id: s.id, title: s.title, hint: s.hint, go: s.go, done: s.done(p), claimed: p.flags.includes(`tut:${s.id}`) }));
  if (steps.every((s) => s.claimed)) return null;
  // Past the basics (rank 2+), the checklist only shows up if there's something to claim.
  if (p.rank >= 2 && !steps.some((s) => s.done && !s.claimed)) return null;
  return steps;
}
