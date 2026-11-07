// What players type for other players to read: chat, names, bios, crew and forum names.
//
// Swearing is fine (it's a crime game). Slurs, telling people to kill themselves and links
// are not. Text is normalised first so "n1gg@" or "f a g g o t" are caught the same as the
// plain spelling. Moderators still handle everything a word list can't.
import { GameError } from "./types";

/** Hate slurs that never occur inside ordinary words. Matched inside any word, with any letter
 *  allowed to repeat ("niiigger"). */
const SLUR_STEMS = [
  "nigger", "nigga", "niggr", "wetback", "kike", "raghead", "towelhead", "beaner", "zipperhead",
  "jigaboo", "porchmonkey", "faggot", "fagot", "faggit", "tranny", "trannies", "shemale",
];
/** Slurs that are also parts of ordinary words (raccoon, spice, Montenegro, fire retardant):
 *  only matched as whole words. */
const SLUR_WORDS = [
  "fag", "fags", "nig", "nigs", "coon", "coons", "spic", "spics", "spick", "chink", "chinks", "gook", "gooks",
  "paki", "pakis", "negro", "negroes", "dyke", "dykes", "retard", "retards", "retarded", "kyke",
];
const STEM_RES = SLUR_STEMS.map((s) => new RegExp(s.replace(/(.)(?!\1)/g, "$1+").replace(/\+\+/g, "+")));
/** Telling someone to harm themselves. */
const HARM = [/\bkys\b/, /kill\s*your\s*self/, /killyourself/, /go\s*die\s*in\s*a\s*fire/, /neck\s*your\s*self/, /hang\s*your\s*self/];
/** Links and handles that pull players off the game. */
const LINK = /(https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(com|net|org|io|gg|xyz|ru|cn|me|co|app|link|ly|tk|top|site|online|shop|live|tv)\b|discord\.gg|t\.me\/)/i;

const LEET: Record<string, string> = { "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "8": "b", "9": "g", "+": "t" };

/** Lower case, accents off, look-alike characters swapped back to letters. */
export function normalise(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[0-9!|@$+]/g, (c) => LEET[c] ?? c);
}

function hasSlur(text: string): boolean {
  const words = normalise(text).split(/[^a-z]+/).filter(Boolean);
  // Spaced-out letters ("f a g g o t") count as one word.
  const runs: string[] = [];
  let run = "";
  for (const w of words) {
    if (w.length <= 2) run += w;
    else {
      if (run.length > 2) runs.push(run);
      run = "";
    }
  }
  if (run.length > 2) runs.push(run);
  return [...words, ...runs].some(
    (w) => SLUR_WORDS.includes(w) || SLUR_WORDS.includes(w.replace(/(.)\1+/g, "$1")) || STEM_RES.some((r) => r.test(w)),
  );
}

export type TextKind = "chat" | "name" | "bio";

/** Why this text can't be posted, or null if it's fine. */
export function textProblem(text: string, kind: TextKind): string | null {
  if (hasSlur(text)) return kind === "name" ? "That name isn't allowed." : "That word isn't allowed here.";
  const n = normalise(text);
  if (HARM.some((r) => r.test(n))) return "Telling people to hurt themselves isn't allowed.";
  if (LINK.test(text)) return kind === "name" ? "Names can't be links." : "No links. Keep it in the game.";
  if (kind === "chat" && text.length >= 12 && /^(.)\1+$/.test(text.replace(/\s/g, ""))) return "Say something.";
  return null;
}

/** Throws a player-facing error if the text breaks the rules; returns it unchanged otherwise. */
export function checkText(text: string, kind: TextKind): string {
  const problem = textProblem(text, kind);
  if (problem) throw new GameError(problem);
  return text;
}
