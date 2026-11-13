// The ending of the case: once every lead is closed, you decide what to do with everything you have
// on Judge Crane. Four choices, one per player, forever. Each gives a final chapter, a street
// title and a lasting effect: standing, money or a favour. Never fighting power, never odds.

import { LEADS } from "./leads";
import { GameError, type GameEvent, type Player } from "./types";

export type CaseEndingId = "court" | "press" | "kozak" | "keep";
export const CASE_ENDINGS: CaseEndingId[] = ["court", "press", "kozak", "keep"];

export const ENDING = {
  court: { title: "Exonerated", reputation: 15, integrity: 10 },
  press: { title: "The one who talked", reputation: 25, integrity: 5 },
  kozak: { title: "Kozak's friend", dirty: 25_000, integrity: -15 },
  /** Blackmail: an envelope a week while Crane's heart holds out. */
  keep: { title: "Holds the Ledger", weekly: 2_000, weeks: 8, everyMs: 7 * 86_400_000, integrity: -10 },
} as const;

/** What players can read about each choice before they make it. */
export const ENDING_CHOICES: { id: CaseEndingId; label: string; line: string }[] = [
  { id: "court", label: "Take it to court", line: "A judge who isn't bought. Crane is convicted and your record is wiped clean." },
  { id: "press", label: "Give it to the press", line: "The whole city reads it. Crane resigns, and everyone knows your name." },
  { id: "kozak", label: "Sell it to Kozak", line: "$25,000 in dirty money, and Crane owes you one: once, a jail sentence goes away." },
  { id: "keep", label: "Keep it", line: "Blackmail. An envelope of cash every week, for as long as Crane's heart holds out." },
];

/** The last lead: closing it makes the case whole. */
const FINAL_LEAD = LEADS[LEADS.length - 1].id;

export const caseComplete = (p: Player) => !!p.leads?.[FINAL_LEAD]?.closedAt;

export function endingBlock(p: Player): string | null {
  if (p.caseEnding) return "You've already decided what to do with the case.";
  if (!caseComplete(p)) return "Close every lead first. The case isn't whole yet.";
  return null;
}

function notice(p: Player, text: string, now: number) {
  p.inbox = [{ id: `${now}-ending`, at: now, text, tone: "story" as const, read: false }, ...(p.inbox ?? [])].slice(0, 30);
}

export function chooseEnding(p: Player, choice: CaseEndingId, now: number): GameEvent[] {
  const block = endingBlock(p);
  if (block) throw new GameError(block);
  if (!CASE_ENDINGS.includes(choice)) throw new GameError("That isn't one of the choices.");
  p.caseEnding = { choice, at: now };
  const chapter = `ending_${choice}`;
  if (!p.flags.includes(`story:${chapter}`)) p.flags.push(`story:${chapter}`);
  const events: GameEvent[] = [];
  const read = { label: "Read", target: `story:${chapter}` };
  switch (choice) {
    case "court":
      p.heat = 0;
      p.reputation += ENDING.court.reputation;
      p.stats.integrity += ENDING.court.integrity;
      events.push({ tone: "story", text: "The retrial clears your name. Crane goes to prison. Your record is clean.", action: read });
      break;
    case "press":
      p.reputation += ENDING.press.reputation;
      p.stats.integrity += ENDING.press.integrity;
      // The server puts the headline on the city's front page (see /api/game).
      p.pressStory = `THE LEDGER: ${p.name} exposes Judge Aldous Crane, who resigns "for his health"`;
      events.push({ tone: "story", text: "It's on the front page. Crane resigns by noon, and the whole city knows your name.", action: read });
      break;
    case "kozak":
      p.dirty = (p.dirty ?? 0) + ENDING.kozak.dirty;
      p.stats.integrity += ENDING.kozak.integrity;
      events.push({ tone: "story", text: `Kozak pays $${ENDING.kozak.dirty.toLocaleString()} in dirty money, and Crane owes you one favour: once, a jail sentence goes away.`, action: read });
      break;
    case "keep":
      p.stats.integrity += ENDING.keep.integrity;
      p.caseEnding.cuts = 0;
      p.caseEnding.lastCutAt = now;
      events.push({ tone: "story", text: `You keep it. From next week, Crane pays $${ENDING.keep.weekly.toLocaleString()} a week to keep it quiet.`, action: read });
      break;
  }
  return events;
}

/** Kozak's ending: the judge makes one sentence go away. Not while a trial is still running. */
export function craneFavorBlock(p: Player, now: number): string | null {
  if (p.caseEnding?.choice !== "kozak") return "Nobody owes you that kind of favour.";
  if (p.caseEnding.favorUsed) return "Crane's favour is spent.";
  if (!p.jailUntil || p.jailUntil <= now) return "You're not in a cell.";
  if (p.custodyCase) return "Your trial isn't over yet. The favour works on a sentence, not a trial.";
  return null;
}

export function useCraneFavor(p: Player, now: number): GameEvent[] {
  const block = craneFavorBlock(p, now);
  if (block) throw new GameError(block);
  p.jailUntil = 0;
  p.jailReason = null;
  p.caseEnding!.favorUsed = true;
  return [{ tone: "good", text: "A clerk loses some paperwork. The guard opens your cell without a word. Crane's debt is paid." }];
}

/** The blackmail envelope, once a week, while it lasts. Called from tick. */
export function endingTick(p: Player, now: number) {
  const e = p.caseEnding;
  if (e?.choice !== "keep") return;
  const cuts = e.cuts ?? 0;
  if (cuts >= ENDING.keep.weeks) return;
  let last = e.lastCutAt ?? e.at;
  let paid = 0;
  let n = cuts;
  while (n < ENDING.keep.weeks && now - last >= ENDING.keep.everyMs) {
    last += ENDING.keep.everyMs;
    n += 1;
    paid += ENDING.keep.weekly;
  }
  if (!paid) return;
  p.cash += paid;
  e.cuts = n;
  e.lastCutAt = last;
  notice(p, n >= ENDING.keep.weeks
    ? `The last envelope: $${ENDING.keep.weekly.toLocaleString()}. Crane's heart gave out this week. The payments stop.`
    : `An envelope, no note: $${paid.toLocaleString()}. Crane is still paying.`, now);
}

/** What the screen shows about the ending. */
export function endingView(p: Player, now: number) {
  const e = p.caseEnding;
  return {
    complete: caseComplete(p),
    choice: e?.choice ?? null,
    title: e ? ENDING[e.choice].title : null,
    favor: e?.choice === "kozak" && !e.favorUsed,
    favorBlock: e?.choice === "kozak" ? craneFavorBlock(p, now) : null,
    paymentsLeft: e?.choice === "keep" ? ENDING.keep.weeks - (e.cuts ?? 0) : null,
  };
}
