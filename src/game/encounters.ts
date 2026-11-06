// Street encounters: now and then, while you work, one of the city's regulars stops you with a
// choice. Every option has an agenda behind it: money against heat, conscience against
// reputation, a favour now against a debt later. Nothing is labelled "good" or "evil"; you only see
// what it costs up front, and find out the rest.

import { BALANCE } from "./balance";
import { DISTRICTS } from "./content/districts";
import { earnDirty, dirtyOf } from "./money";
import { addJournal, friendsIn, tieOf, tieShift, tieView } from "./journal";
import { regularPhoto, ROSTER, type RegularDef } from "./regulars";
import { GameError, type CountryId, type GameEvent, type PathId, type Player, type Rng, type StatKey } from "./types";

export const ENCOUNTERS = {
  chance: 0.12,
  cooldownMs: 30 * 60_000,
  ttlMs: 20 * 60_000,
  /** New players get a few jobs in before the street starts talking to them. */
  minJobs: 5,
};

type Ctx = { p: Player; rng: Rng; name: string; district: string; now: number };
interface Option {
  label: string;
  /** What you can see it costs before you choose. */
  hint: string;
  cash?: number;
  energy?: number;
  needs?: (p: Player) => string | null;
  /** How the regular feels about it, and what they'll remember. */
  tie?: number;
  memo?: string;
  apply: (c: Ctx) => GameEvent[];
}
interface Def {
  id: string;
  /** Which regulars might bring this to you (careers; null = no career). */
  who: (PathId | null)[];
  when?: (p: Player) => boolean;
  text: (c: Ctx) => string;
  options: Option[];
}

const integrity = (p: Player, d: number) => {
  p.stats.integrity = Math.max(-100, Math.min(100, p.stats.integrity + d));
};
const xp = (p: Player, k: StatKey, n: number) => {
  p.stats[k] += n;
};
const walk: Option = { label: "Walk on", hint: "Nothing gained, nothing lost", apply: (c) => [{ tone: "info", text: `You keep walking. ${c.name.split(" ")[0]} shrugs.` }] };

const DEFS: Def[] = [
  {
    id: "hot_watch",
    who: ["enforcer", null],
    text: (c) => `${c.name} opens their coat in ${c.district}: a gold watch, still warm. "Forty bucks. It's worth three hundred to the right fence."`,
    options: [
      {
        label: "Buy it ($40)", tie: 1, memo: "bought the watch off them", hint: "Could double your money. Could be traced.", cash: 40,
        apply: ({ p, rng }) => {
          p.cash -= 40;
          if (rng() < 0.65) {
            earnDirty(p, 110);
            integrity(p, -2);
            return [{ tone: "good", text: "The fence on Ninth gives you $110 for it, no questions. Dirty money, but money." }];
          }
          p.heat += 12;
          integrity(p, -2);
          return [{ tone: "bad", text: "The watch is engraved. The owner's brother is a cop. You dump it in the river, $40 down and noticed." }];
        },
      },
      {
        label: "Tell a cop", tie: -3, memo: "told the police about them", hint: "Your conscience likes it. The street won't.",
        apply: ({ p, name }) => {
          integrity(p, 3);
          p.reputation = Math.max(0, p.reputation - 1);
          return [{ tone: "info", text: `You mention ${name} to the beat cop. Word gets around that you talk.` }];
        },
      },
      walk,
    ],
  },
  {
    id: "off_book_pills",
    who: ["medicine"],
    when: (p) => p.hp < BALANCE.hp.max,
    text: (c) => `${c.name} catches your arm. "You're limping. Painkillers, off the books. Twenty-five, and we never met."`,
    options: [
      {
        label: "Take them ($25)", tie: 1, memo: "took the pills, no questions", hint: "Heals you now. Not exactly legal.", cash: 25,
        apply: ({ p }) => {
          p.cash -= 25;
          p.hp = Math.min(BALANCE.hp.max, p.hp + 30);
          integrity(p, -1);
          return [{ tone: "good", text: "The ache fades in minutes. +30 health." }];
        },
      },
      walk,
    ],
  },
  {
    id: "cop_name",
    who: ["police"],
    when: (p) => p.heat > 5,
    text: (c) => `${c.name} leans on a lamppost in ${c.district}. "You've been busy. Give me a name from the Gutter and I lose your file for a while."`,
    options: [
      {
        label: "Give a name", tie: 1, memo: "gave them a name", hint: "Less heat. Snitches get remembered.",
        apply: ({ p }) => {
          p.heat = Math.max(0, p.heat - 15);
          integrity(p, -3);
          p.reputation = Math.max(0, p.reputation - 2);
          return [{ tone: "info", text: "You give up a small-time dealer. Your file gets thinner. Somewhere, someone gets a visit." }];
        },
      },
      {
        label: "Lie to them", tie: -1, memo: "lied to them", hint: "Might work. Might make it worse.",
        apply: ({ p, rng }) => {
          if (rng() < 0.5 + (p.stats.charisma > 300 ? 0.15 : 0)) {
            p.heat = Math.max(0, p.heat - 6);
            return [{ tone: "good", text: "You send them chasing a name that doesn't exist. They buy it. For now." }];
          }
          p.heat += 8;
          return [{ tone: "bad", text: "They know it's a lie. Now they're more interested in you than before." }];
        },
      },
      {
        label: "Say nothing", tie: -1, memo: "wouldn't talk", hint: "The street respects silence.",
        apply: ({ p }) => {
          p.reputation += 2;
          return [{ tone: "good", text: "You look at them until they leave. People saw. +2 reputation." }];
        },
      },
    ],
  },
  {
    id: "card_game",
    who: [null, "enforcer"],
    text: (c) => `${c.name} waves you into a back room off ${c.district}. "Game's short a player. Thirty to sit down."`,
    options: [
      {
        label: "Sit in ($30)", tie: 1, memo: "sat in on the card game", hint: "Sharp eyes win. Everyone else pays.", cash: 30,
        apply: ({ p, rng }) => {
          p.cash -= 30;
          xp(p, "perception", 6);
          const edge = Math.min(0.25, p.stats.perception / 4000);
          if (rng() < 0.42 + edge) {
            earnDirty(p, 85);
            return [{ tone: "good", text: "You read the table and walk out $85 up. Not the kind of money you can explain." }];
          }
          return [{ tone: "bad", text: "The dealer's faster than you. You leave lighter and wiser." }];
        },
      },
      {
        label: "Just watch", tie: 0, memo: "watched the game", hint: "No money. You learn how cheats work.",
        apply: ({ p }) => {
          xp(p, "perception", 10);
          xp(p, "wits", 4);
          return [{ tone: "info", text: "You watch three hands and spot the marked deck. You'll remember that." }];
        },
      },
      walk,
    ],
  },
  {
    id: "lost_wallet",
    who: [null, "police", "medicine", "courts", "banking", "vigilante", "enforcer", "military"],
    text: (c) => `A wallet on the pavement in ${c.district}: $60 and somebody's ID. ${c.name} saw you pick it up.`,
    options: [
      {
        label: "Keep the cash", tie: -1, memo: "kept a wallet that wasn't yours", hint: "+$60. Somebody saw.",
        apply: ({ p, rng }) => {
          p.cash += 60;
          integrity(p, -3);
          if (rng() < 0.3) {
            p.heat += 5;
            return [{ tone: "bad", text: "+$60. Later, a cop asks around about a wallet. Your name comes up." }];
          }
          return [{ tone: "info", text: "+$60. Nobody comes asking. Yet." }];
        },
      },
      {
        label: "Hand it in", tie: 1, memo: "handed in a wallet", hint: "Good for your name. Maybe a reward.",
        apply: ({ p, rng }) => {
          integrity(p, 3);
          p.reputation += 2;
          if (rng() < 0.35) {
            p.cash += 25;
            return [{ tone: "good", text: "The owner tracks you down with $25 and a handshake. +2 reputation." }];
          }
          return [{ tone: "good", text: "You hand it to the desk sergeant. People notice that sort of thing. +2 reputation." }];
        },
      },
    ],
  },
  {
    id: "missing_page",
    who: ["courts"],
    text: (c) => `${c.name} falls into step beside you. "Your old case file has a page missing. Fifty dollars and I'll tell you what it said."`,
    options: [
      {
        label: "Pay ($50)", tie: 1, memo: "paid for the missing page", hint: "Something about who framed you.", cash: 50,
        apply: ({ p }) => {
          p.cash -= 50;
          xp(p, "wits", 8);
          if (!p.flags.includes("clue:missing_page")) p.flags.push("clue:missing_page");
          return [{ tone: "story", text: "\"Page nine: the witness list. One name was crossed out and initialled A.C.\" Aldous Crane. Of course." }];
        },
      },
      walk,
    ],
  },
  {
    id: "quick_clean",
    who: ["banking"],
    when: (p) => dirtyOf(p) >= 50,
    text: (c) => `${c.name} glances at your pockets. "That money smells. I can clean up to $300 of it before lunch. Ten percent."`,
    options: [
      {
        label: "Clean it (10%)", tie: 1, memo: "let them clean your money", hint: "Dirty to clean, fast. Small chance it's flagged.",
        apply: ({ p, rng }) => {
          const amount = Math.min(300, dirtyOf(p));
          p.dirty = dirtyOf(p) - amount;
          p.cash += Math.floor(amount * 0.9);
          if (rng() < 0.15) {
            p.heat += 10;
            return [{ tone: "bad", text: `$${Math.floor(amount * 0.9)} comes back clean, but the transfer was flagged. More heat.` }];
          }
          return [{ tone: "good", text: `$${Math.floor(amount * 0.9)} comes back clean.` }];
        },
      },
      walk,
    ],
  },
  {
    id: "scare_dealer",
    who: ["vigilante"],
    text: (c) => `${c.name} grabs your sleeve. "A dealer's selling to kids behind the school in ${c.district}. Help me run him off."`,
    options: [
      {
        label: "Help (8 energy)", tie: 2, memo: "helped run off a dealer", hint: "It might get rough. You'd feel better.", energy: 8,
        apply: ({ p, rng }) => {
          p.energy -= 8;
          integrity(p, 4);
          p.reputation += 3;
          xp(p, "nerve", 8);
          if (rng() < 0.35) {
            p.hp = Math.max(5, p.hp - 12);
            return [{ tone: "info", text: "He swings before he runs. You take a hit, but he's gone. +3 reputation." }];
          }
          return [{ tone: "good", text: "He takes one look at the two of you and leaves town. +3 reputation." }];
        },
      },
      {
        label: "Not my business", tie: -1, memo: "wouldn't help", hint: "Costs nothing. Today.",
        apply: ({ p }) => {
          integrity(p, -1);
          return [{ tone: "info", text: "You keep your head down. It's not your fight." }];
        },
      },
    ],
  },
  {
    id: "extra_hands",
    who: ["enforcer"],
    text: (c) => `${c.name} nods at a shop on ${c.district}. "Owner's late with his payment. I need someone standing behind me. Fifty for ten minutes."`,
    options: [
      {
        label: "Stand behind them (10 energy)", tie: 2, memo: "stood behind them on a collection", hint: "+$50 dirty. Heat. Conscience.", energy: 10,
        apply: ({ p }) => {
          p.energy -= 10;
          earnDirty(p, 50);
          p.heat += 6;
          integrity(p, -3);
          xp(p, "nerve", 6);
          return [{ tone: "info", text: "The owner pays without a word. You get $50, dirty, and his face stays with you." }];
        },
      },
      walk,
    ],
  },
  {
    id: "sparring",
    who: ["military"],
    text: (c) => `${c.name} is bored on leave and looking for someone to spar with. "Five rounds. No hard feelings."`,
    options: [
      {
        label: "Spar (6 energy)", tie: 1, memo: "sparred five rounds with them", hint: "You'll get hit. You'll get better.", energy: 6,
        apply: ({ p }) => {
          p.energy -= 6;
          p.hp = Math.max(5, p.hp - 8);
          xp(p, "strength", 10);
          xp(p, "toughness", 10);
          return [{ tone: "good", text: "Five rounds with a trained soldier. Your ribs hurt. You'll be harder to put down." }];
        },
      },
      walk,
    ],
  },
];

DEFS.push({
  id: "friend_tip",
  who: [null, "police", "medicine", "courts", "banking", "vigilante", "enforcer", "military"],
  when: (p) => p.heat >= 10,
  text: (c) => `${c.name} pulls you into a doorway. "Heads up. A detective was asking about you in ${c.district}. Showed your picture around."`,
  options: [
    {
      label: "Lay low for a while (5 energy)", hint: "Less heat. Costs you time.", energy: 5, tie: 1, memo: "listened when they warned you about a detective",
      apply: ({ p }) => {
        p.energy -= 5;
        p.heat = Math.max(0, p.heat - 12);
        return [{ tone: "good", text: "You stay off the main streets for an hour. By the time the detective comes back, you're nobody." }];
      },
    },
    {
      label: "Thank them, keep going", hint: "A little less heat. Friends remember thanks.", tie: 1, memo: "listened when they warned you about a detective",
      apply: ({ p, name }) => {
        p.heat = Math.max(0, p.heat - 4);
        return [{ tone: "good", text: `You buy ${name.split(" ")[0]} a coffee and change your route home.` }];
      },
    },
  ],
});

const DEF_BY_ID = Object.fromEntries(DEFS.map((d) => [d.id, d])) as Record<string, Def>;

function pick<T>(list: T[], rng: Rng): T {
  return list[Math.floor(rng() * list.length)];
}

/** Maybe stops you in the street after a job. Called from doJob. */
export function maybeEncounter(p: Player, country: CountryId, now: number, rng: Rng, jobsDone: number): GameEvent[] {
  if (p.encounter && p.encounter.expiresAt > now) return [];
  if (jobsDone < ENCOUNTERS.minJobs) return [];
  if (now - (p.encounterAt ?? 0) < ENCOUNTERS.cooldownMs) return [];
  if (rng() >= ENCOUNTERS.chance) return [];
  const roster = ROSTER[country] ?? [];
  const defs = DEFS.filter((d) => (!d.when || d.when(p)) && roster.some((r) => d.who.includes(r.path)));
  if (!defs.length) return [];
  // Friends look out for you: if you have one in town and you're hot, they come first.
  const friends = friendsIn(p, country);
  const tipper = p.heat >= 10 && friends.length && rng() < 0.6 ? roster.find((r) => r.key === pick(friends, rng)) : undefined;
  const def = tipper ? DEF_BY_ID.friend_tip : pick(defs.filter((d) => d.id !== "friend_tip"), rng);
  // Regulars who can't stand you don't come over to chat.
  const willing = roster.filter((r) => def.who.includes(r.path) && (tieOf(p, country, r.key)?.t ?? 0) > -3);
  if (!def || (!tipper && !willing.length)) return [];
  const who: RegularDef = tipper ?? pick(willing, rng);
  const districts = DISTRICTS.filter((d) => d.country === country);
  const district = districts.length ? pick(districts, rng).name : "the street";
  p.encounterAt = now;
  p.encounter = { id: def.id, key: who.key, country, name: who.name, district, at: now, expiresAt: now + ENCOUNTERS.ttlMs };
  return [{ tone: "story", text: `${who.name} wants a word.`, action: { label: "Listen", target: "encounter:open" } }];
}

export function encounterView(p: Player, now: number) {
  const e = p.encounter;
  if (!e || e.expiresAt <= now) return null;
  const def = DEF_BY_ID[e.id];
  const who = ROSTER[e.country]?.find((r) => r.key === e.key);
  if (!def || !who) return null;
  const c: Ctx = { p, rng: () => 0.5, name: e.name, district: e.district, now };
  return {
    name: e.name,
    photo: regularPhoto(e.country, e.key),
    path: who.path,
    expiresAt: e.expiresAt,
    tie: tieView(p, e.country, e.key),
    text: def.text(c),
    options: def.options.map((o) => ({ label: o.label, hint: o.hint, block: optionBlock(p, o) })),
  };
}

function optionBlock(p: Player, o: Option): string | null {
  if (o.cash && p.cash < o.cash) return `You need $${o.cash} cash.`;
  if (o.energy && p.energy < o.energy) return "You're too tired.";
  return o.needs?.(p) ?? null;
}

export function chooseEncounter(p: Player, choice: number, now: number, rng: Rng): GameEvent[] {
  const e = p.encounter;
  if (!e || e.expiresAt <= now) {
    p.encounter = null;
    throw new GameError("They've moved on.");
  }
  const def = DEF_BY_ID[e.id];
  const o = def?.options[choice];
  if (!o) throw new GameError("Bad request.");
  const block = optionBlock(p, o);
  if (block) throw new GameError(block);
  p.encounter = null;
  const out = o.apply({ p, rng, name: e.name, district: e.district, now });
  if (o.memo) {
    tieShift(p, e.country, e.key, o.tie ?? 0, `You ${o.memo}.`, now);
    addJournal(p, now, "street", `${e.name}: you ${o.memo}.`);
  }
  return out;
}
