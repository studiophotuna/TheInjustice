// Two kinds of memory.
//
// The journal: your character's life, written as it happens ("Released with nothing", "Joined
// the Mafia", "Locked up", "Uncovered: Case 4471"). It's recorded centrally by comparing what
// changed since the last update, so every feature that moves your life forward lands here
// without having to remember to write to it.
//
// Ties: each street regular's opinion of you, from -5 (hostile) to +5 (a friend), and the last
// thing they remember you doing. Friends keep quiet when they see you do something; people you've
// crossed go to the police.

import { CHAPTER_BY_ID } from "./content/story";
import { PATHS } from "./content/paths";
import { COUNTRY_BY_ID } from "./content/world";
import type { CountryId, Player } from "./types";

export const JOURNAL = { max: 80, money: [1_000, 10_000, 100_000, 1_000_000] };

export type JournalKind = "start" | "career" | "rank" | "crew" | "jail" | "clinic" | "story" | "money" | "move" | "death" | "street";

export function addJournal(p: Player, at: number, kind: JournalKind, text: string) {
  p.journal = [...(p.journal ?? []), { at, kind, text }].slice(-JOURNAL.max);
}

const story = (p: Player) => p.flags.filter((f) => f.startsWith("story:")).map((f) => f.slice(6));

/** Compares the player with the last snapshot and writes down what changed. Called from tick(). */
export function journalTick(p: Player, now: number) {
  if (p.regular) return;
  const prev = p.jsnap;
  const snap = {
    path: p.path,
    rank: p.rank,
    crew: p.crewId ?? null,
    jailed: !!p.jailUntil && p.jailUntil > now,
    clinic: !!p.hospitalUntil && p.hospitalUntil > now,
    clinics: prev?.clinics ?? 0,
    story: story(p).length,
    money: prev?.money ?? 0,
    country: p.country ?? "varrow",
    deaths: p.deaths ?? 0,
  };
  if (!prev) {
    if (!p.journal?.length) addJournal(p, p.createdAt, "start", "Released from Grayhaven Penitentiary with nothing. Somebody arranged that.");
  } else {
    if (snap.path !== prev.path) {
      if (prev.path) addJournal(p, now, "career", `Walked away from the ${PATHS[prev.path].name}.`);
      if (snap.path) addJournal(p, now, "career", `Started over as ${PATHS[snap.path].ranks[Math.max(0, p.rank - 1)]} in the ${PATHS[snap.path].name}.`);
    } else if (snap.path && snap.rank > prev.rank) {
      addJournal(p, now, "rank", `Promoted to ${PATHS[snap.path].ranks[snap.rank - 1]}.`);
    }
    if (snap.crew !== prev.crew) addJournal(p, now, "crew", snap.crew ? "Joined a crew." : "Left the crew.");
    if (snap.jailed && !prev.jailed) addJournal(p, now, "jail", `Locked up${p.jailReason ? `: ${p.jailReason.replace(/\.$/, "")}` : ""}.`);
    if (snap.clinic && !prev.clinic) {
      snap.clinics += 1;
      // The first time is a story; after that, only every fifth.
      if (snap.clinics === 1) addJournal(p, now, "clinic", "Woke up in the free clinic for the first time.");
      else if (snap.clinics % 5 === 0) addJournal(p, now, "clinic", `Woke up in the clinic again. That's ${snap.clinics} times now.`);
    }
    if (snap.story > prev.story) {
      for (const id of story(p).slice(prev.story)) {
        const c = CHAPTER_BY_ID[id];
        if (c) addJournal(p, now, "story", `Uncovered: ${c.title.replace(/^Chapter \d+ · /, "")}.`);
      }
    }
    if (snap.country !== prev.country) addJournal(p, now, "move", `Moved to ${COUNTRY_BY_ID[snap.country as CountryId]?.capital ?? "a new city"}.`);
    if (snap.deaths > prev.deaths) addJournal(p, now, "death", `Died${p.dead ? `: ${p.dead.cause}` : ""}.`);
  }
  const worth = p.cash + p.bank;
  const milestone = JOURNAL.money.filter((m) => worth >= m).pop() ?? 0;
  if (milestone > snap.money) {
    if (prev) addJournal(p, now, "money", `First $${milestone.toLocaleString("en")} to your name.`);
    snap.money = milestone;
  }
  p.jsnap = snap;
}

// ── Ties with the street regulars ──────────────────────────────────────────

export const tieKey = (country: string, key: string) => `${country}-${key}`;

export function tieOf(p: Player, country: string, key: string) {
  return p.ties?.[tieKey(country, key)] ?? null;
}

export function tieShift(p: Player, country: string, key: string, delta: number, memo: string, now: number) {
  const k = tieKey(country, key);
  const cur = p.ties?.[k];
  const t = Math.max(-5, Math.min(5, (cur?.t ?? 0) + delta));
  p.ties = { ...(p.ties ?? {}), [k]: { t, memo, at: now } };
}

export function tieLabel(t: number): { label: string; tone: "friend" | "known" | "wary" | "hostile" } | null {
  if (t >= 3) return { label: "Friend", tone: "friend" };
  if (t >= 1) return { label: "Knows you", tone: "known" };
  if (t <= -3) return { label: "Hostile", tone: "hostile" };
  if (t <= -1) return { label: "Wary of you", tone: "wary" };
  return null;
}

/** What the people out on the street think of you, for a regular's card. */
export function tieView(p: Player, country: string, key: string) {
  const t = tieOf(p, country, key);
  if (!t) return null;
  const l = tieLabel(t.t);
  return { score: t.t, label: l?.label ?? "Knows your face", tone: l?.tone ?? "known", memo: t.memo };
}

/** Friends in this city (for tips). */
export function friendsIn(p: Player, country: string): string[] {
  return Object.entries(p.ties ?? {})
    .filter(([k, v]) => k.startsWith(`${country}-`) && v.t >= 3)
    .map(([k]) => k.slice(country.length + 1));
}
