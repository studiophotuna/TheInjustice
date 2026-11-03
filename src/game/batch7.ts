// Season trophies, crew alliances and the newspaper editor.
//
// Trophies: when a month ends, the top three in each season stat can claim a trophy and a
// prize. Boards stay anonymous, so trophies are private unless the winner chooses to show them.
//
// Alliances: two crews agree to stand together. Allies can fight in each other's turf wars
// and don't pay each other protection money.
//
// The editor: the mayor appoints someone to run the city paper. The editor can pull stories,
// write a column, and sets a price for quietly burying a story for anyone who pays.

import { COUNTRY_BY_ID } from "./content/world";
import { countryOf } from "./engine";
import { payIllegal, canPayIllegal, earnDirty } from "./money";
import { seasonId, seasonName } from "./season";
import { notify } from "./social";
import { GameError, type City, type Crew, type CrewRef, type GameEvent, type Player, type Trophy } from "./types";

// ── Season trophies ────────────────────────────────────────────────────────

export const TROPHY_STATS: { id: Trophy["stat"]; label: string }[] = [
  { id: "earned", label: "Money made" },
  { id: "wins", label: "Fights won" },
  { id: "arrests", label: "Arrests made" },
];
/** Prize per place (clean money, straight to the bank). */
export const TROPHY_PRIZES = [1000, 500, 250];

/** A player's numbers for a past season, if we still have them. */
function pastScore(p: Player, season: number, stat: Trophy["stat"]): number {
  if (p.season?.id === season) return p.season[stat];
  if (p.lastSeason?.id === season) return p.lastSeason[stat];
  return 0;
}

/** Places (1-3) the player finished in last season, computed from everyone's frozen numbers. */
export function lastSeasonFinish(me: Player, everyone: Player[], now: number): Trophy[] {
  const season = seasonId(now) - 1;
  const out: Trophy[] = [];
  for (const { id, label } of TROPHY_STATS) {
    const mine = pastScore(me, season, id);
    if (mine <= 0) continue;
    // Ties go to whoever has the lower id, so the order is stable for everyone.
    const ahead = everyone.filter((o) => o.id !== me.id && !o.dead).filter((o) => {
      const v = pastScore(o, season, id);
      return v > mine || (v === mine && o.id < me.id);
    }).length;
    if (ahead < 3) out.push({ season, seasonName: seasonName(season), stat: id, label, place: ahead + 1 });
  }
  return out;
}

export function trophyBlock(me: Player, now: number): string | null {
  const season = seasonId(now) - 1;
  if ((me.trophySeason ?? -1) >= season) return "You've already claimed last season's trophies.";
  return null;
}

/** Claims last season's trophies (if any) and pays the prizes into the bank. */
export function claimTrophies(me: Player, everyone: Player[], now: number): GameEvent[] {
  const block = trophyBlock(me, now);
  if (block) throw new GameError(block);
  const won = lastSeasonFinish(me, everyone, now);
  me.trophySeason = seasonId(now) - 1;
  if (!won.length) return [{ tone: "info", text: "You didn't finish in the top three last season. There's always this month." }];
  const prize = won.reduce((s, t) => s + TROPHY_PRIZES[t.place - 1], 0);
  me.trophies = [...won, ...(me.trophies ?? [])].slice(0, 30);
  if (me.hasBankAccount) me.bank += prize;
  else me.cash += prize;
  me.reputation += won.length * 2;
  return [
    {
      tone: "story",
      text: `${won.map((t) => `#${t.place} in ${t.label.toLowerCase()}`).join(", ")} for ${won[0].seasonName}. Prize: $${prize}${me.hasBankAccount ? ", paid into your bank" : ""}.`,
    },
  ];
}

export function setTrophiesPublic(me: Player, on: boolean): GameEvent[] {
  if (!me.trophies?.length) throw new GameError("You have no trophies to show.");
  me.trophiesPublic = on;
  return [{ tone: "info", text: on ? "Your trophies are on display. Everyone can see them now." : "Your trophies are back in the drawer." }];
}

// ── Crew alliances ─────────────────────────────────────────────────────────

export const MAX_ALLIES = 2;
const ref = (c: Crew): CrewRef => ({ id: c.id, name: c.name, tag: c.tag });
const leads = (c: Crew, p: Player) => c.leaderId === p.id;

export function allyIds(c: Crew | null): string[] {
  return (c?.allies ?? []).map((a) => a.id);
}

export function areAllies(a: Crew | null, bId: string | null | undefined): boolean {
  return !!a && !!bId && allyIds(a).includes(bId);
}

export function proposeAlliance(mine: Crew, theirs: Crew, leader: Player, theirLeader: Player | null, now: number): GameEvent[] {
  if (!leads(mine, leader)) throw new GameError("Only the crew leader can make alliances.");
  if (mine.id === theirs.id) throw new GameError("That's your own crew.");
  if (areAllies(mine, theirs.id)) throw new GameError("You're already allies.");
  if ((mine.allies?.length ?? 0) >= MAX_ALLIES) throw new GameError(`A crew can have at most ${MAX_ALLIES} allies.`);
  if ((theirs.allies?.length ?? 0) >= MAX_ALLIES) throw new GameError("They already have all the allies they can handle.");
  // They already asked us: accept on the spot.
  if (mine.allyOffers?.some((o) => o.id === theirs.id)) return acceptAlliance(mine, theirs, leader, theirLeader, now);
  if (theirs.allyOffers?.some((o) => o.id === mine.id)) throw new GameError("You've already proposed. Wait for their answer.");
  theirs.allyOffers = [...(theirs.allyOffers ?? []), { ...ref(mine), at: now }].slice(-10);
  if (theirLeader) notify(theirLeader, `${mine.name} [${mine.tag}] proposes an alliance with your crew. Answer from the Crew tab.`, "story", leader, now);
  return [{ tone: "good", text: `Alliance proposed to ${theirs.name} [${theirs.tag}].` }];
}

export function acceptAlliance(mine: Crew, theirs: Crew, leader: Player, theirLeader: Player | null, now: number): GameEvent[] {
  if (!leads(mine, leader)) throw new GameError("Only the crew leader can make alliances.");
  if (!mine.allyOffers?.some((o) => o.id === theirs.id)) throw new GameError("They haven't proposed an alliance.");
  mine.allyOffers = mine.allyOffers.filter((o) => o.id !== theirs.id);
  if ((mine.allies?.length ?? 0) >= MAX_ALLIES || (theirs.allies?.length ?? 0) >= MAX_ALLIES) throw new GameError(`A crew can have at most ${MAX_ALLIES} allies.`);
  mine.allies = [...(mine.allies ?? []), ref(theirs)];
  theirs.allies = [...(theirs.allies ?? []), ref(mine)];
  theirs.allyOffers = (theirs.allyOffers ?? []).filter((o) => o.id !== mine.id);
  const line = `${mine.name} [${mine.tag}] and ${theirs.name} [${theirs.tag}] are now allies.`;
  mine.log = [{ at: now, text: line }, ...mine.log].slice(0, 30);
  theirs.log = [{ at: now, text: line }, ...theirs.log].slice(0, 30);
  if (theirLeader) notify(theirLeader, `${mine.name} [${mine.tag}] accepted your alliance.`, "good", leader, now);
  return [{ tone: "good", text: line }];
}

export function declineAlliance(mine: Crew, leader: Player, theirId: string): GameEvent[] {
  if (!leads(mine, leader)) throw new GameError("Only the crew leader can do that.");
  mine.allyOffers = (mine.allyOffers ?? []).filter((o) => o.id !== theirId);
  return [{ tone: "info", text: "Alliance turned down." }];
}

export function breakAlliance(mine: Crew, theirs: Crew | null, leader: Player, theirId: string, theirLeader: Player | null, now: number): GameEvent[] {
  if (!leads(mine, leader)) throw new GameError("Only the crew leader can do that.");
  if (!areAllies(mine, theirId)) throw new GameError("You're not allies.");
  const name = mine.allies!.find((a) => a.id === theirId)!.name;
  mine.allies = mine.allies!.filter((a) => a.id !== theirId);
  if (theirs) {
    theirs.allies = (theirs.allies ?? []).filter((a) => a.id !== mine.id);
    theirs.log = [{ at: now, text: `${mine.name} [${mine.tag}] broke off the alliance.` }, ...theirs.log].slice(0, 30);
  }
  mine.log = [{ at: now, text: `The alliance with ${name} is over.` }, ...mine.log].slice(0, 30);
  if (theirLeader) notify(theirLeader, `${mine.name} [${mine.tag}] broke off your alliance.`, "bad", leader, now);
  return [{ tone: "info", text: `The alliance with ${name} is over.` }];
}

// ── The newspaper editor ───────────────────────────────────────────────────

export const EDITOR = {
  minReputation: 15,
  salary: 60,
  salaryEveryMs: 24 * 60 * 60_000,
  minPrice: 50,
  maxPrice: 5000,
  defaultPrice: 300,
  maxEditorial: 140,
};

export const isEditor = (c: City, p: Player) => c.editor?.id === p.id;

function announce(c: City, text: string, now: number) {
  c.log = [{ at: now, text }, ...c.log].slice(0, 20);
}

export function appointEditor(c: City, mayor: Player, who: Player, now: number): GameEvent[] {
  if (c.mayor?.id !== mayor.id) throw new GameError("Only the mayor can do that.");
  if (countryOf(mayor) !== c.country) throw new GameError("You have to be in your city.");
  if (who.id === mayor.id) throw new GameError("The mayor can't run the paper too. People would talk.");
  if (who.dead) throw new GameError("They're dead.");
  if (countryOf(who) !== c.country) throw new GameError("They live in another city.");
  if (who.reputation < EDITOR.minReputation) throw new GameError(`An editor needs some standing (reputation ${EDITOR.minReputation}+).`);
  if (c.editor?.id === who.id) throw new GameError("They already run the paper.");
  c.editor = { id: who.id, name: who.name, since: now, price: EDITOR.defaultPrice };
  c.editorPaidAt = 0;
  notify(who, `Mayor ${mayor.name} made you editor of ${COUNTRY_BY_ID[c.country].capital}'s paper. You decide what runs. Open City Hall.`, "story", mayor, now);
  announce(c, `Mayor ${mayor.name} names ${who.name} editor of the city paper.`, now);
  return [{ tone: "good", text: `${who.name} runs the paper now.` }];
}

export function dismissEditor(c: City, mayor: Player, now: number): GameEvent[] {
  if (c.mayor?.id !== mayor.id) throw new GameError("Only the mayor can do that.");
  if (!c.editor) throw new GameError("There's no editor to fire.");
  announce(c, `Mayor ${mayor.name} fires ${c.editor.name} from the paper.`, now);
  c.editor = null;
  c.editorial = null;
  return [{ tone: "info", text: "The editor's desk is empty." }];
}

export function editorSalary(c: City, p: Player, now: number): GameEvent[] {
  if (!isEditor(c, p)) throw new GameError("Only the editor can do that.");
  if (now - (c.editorPaidAt ?? 0) < EDITOR.salaryEveryMs) throw new GameError("Payday is once a day.");
  const pay = Math.min(EDITOR.salary, c.treasury);
  if (pay <= 0) throw new GameError("The treasury is empty.");
  c.treasury -= pay;
  c.editorPaidAt = now;
  p.cash += pay;
  return [{ tone: "good", text: `Editor's salary: +$${pay}.` }];
}

export function setBuryPrice(c: City, p: Player, price: number): GameEvent[] {
  if (!isEditor(c, p)) throw new GameError("Only the editor can do that.");
  if (!Number.isFinite(price) || price < EDITOR.minPrice || price > EDITOR.maxPrice) throw new GameError(`Pick a price between $${EDITOR.minPrice} and $${EDITOR.maxPrice}.`);
  c.editor!.price = Math.floor(price);
  return [{ tone: "info", text: `Burying a story now costs $${c.editor!.price}.` }];
}

export function writeEditorial(c: City, p: Player, text: unknown, now: number): GameEvent[] {
  if (!isEditor(c, p)) throw new GameError("Only the editor can do that.");
  const t = typeof text === "string" ? text.replace(/\s+/g, " ").trim().slice(0, EDITOR.maxEditorial) : "";
  c.editorial = t ? { text: t, at: now } : null;
  return [{ tone: "good", text: t ? "Your column runs in the next edition." : "Column pulled." }];
}

/** The editor pulls (or restores) a story for free. */
export function toggleStory(c: City, p: Player, storyId: string): GameEvent[] {
  if (!isEditor(c, p)) throw new GameError("Only the editor can do that.");
  if (!storyId) throw new GameError("Which story?");
  const buried = c.buried ?? [];
  const on = buried.includes(storyId);
  c.buried = on ? buried.filter((s) => s !== storyId) : [...buried, storyId].slice(-100);
  return [{ tone: "info", text: on ? "The story runs again." : "Story pulled from the front page." }];
}

export function buryBlock(c: City, payer: Player, storyId: string, storyIds: string[]): string | null {
  if (!c.editor) return "The paper has no editor to lean on.";
  if (isEditor(c, payer)) return "You're the editor. Just pull it.";
  if (!storyIds.includes(storyId)) return "That story isn't on the front page.";
  if (c.buried?.includes(storyId)) return "It's already buried.";
  if (!canPayIllegal(payer, c.editor.price)) return `The editor wants $${c.editor.price}.`;
  return null;
}

/** Anyone can pay the editor's price to make a story disappear. The money is dirty for the editor. */
export function buryStory(c: City, payer: Player, editor: Player, storyId: string, storyIds: string[], now: number): GameEvent[] {
  const block = buryBlock(c, payer, storyId, storyIds);
  if (block) throw new GameError(block);
  if (editor.id !== c.editor!.id) throw new GameError("The editor has changed.");
  const price = c.editor!.price;
  payIllegal(payer, price);
  earnDirty(editor, price);
  c.buried = [...(c.buried ?? []), storyId].slice(-100);
  c.buryPays = [...(c.buryPays ?? []), { storyId, payerId: payer.id, amount: price, at: now }].slice(-50);
  notify(editor, `An envelope with $${price} in it. A story quietly left the front page.`, "story", undefined, now);
  return [{ tone: "good", text: `$${price} changes hands. The story is gone by the next edition.` }];
}
