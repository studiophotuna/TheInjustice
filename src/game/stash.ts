// The home stash: somewhere to keep what you can't put in a bank. Muggers, robbers and customs
// only get what's in your pockets. A bigger place has better hiding spots. The one thing a stash
// doesn't beat is a detective with a warrant who has the right suspect.

import { COUNTRY_BY_ID } from "./content/world";
import { BALANCE } from "./balance";
import { DRUG_IDS, DRUGS, type DrugId } from "./drugs";
import { countryOf } from "./engine";
import { GameError, type CountryId, type GameEvent, type Player, type Stash } from "./types";

/** What each kind of home can hide, by housing tier (0 = nothing, a box hides nothing). */
export const STASH = {
  money: [0, 1_500, 10_000, 50_000, 250_000, 1_000_000],
  units: [0, 10, 25, 50, 100, 200],
  spots: ["", "in a sock inside the sleeping bag", "under a loose floorboard", "behind the bathroom tiles", "in a safe in the cellar wall", "in a panic room nobody knows about"],
} as const;

export type StashWhat = "cash" | "dirty" | DrugId;

const empty = (): Stash => ({ cash: 0, dirty: 0, drugs: {} });
const units = (s: Stash) => DRUG_IDS.reduce((n, d) => n + (s.drugs?.[d] ?? 0), 0);
const money = (s: Stash) => s.cash + s.dirty;
const isEmpty = (s: Stash | undefined) => !s || (money(s) === 0 && units(s) === 0);

export function stashOf(p: Player, country: CountryId): Stash {
  return p.stash?.[country] ?? empty();
}

function save(p: Player, country: CountryId, s: Stash) {
  const all = { ...(p.stash ?? {}) };
  if (isEmpty(s)) delete all[country];
  else all[country] = s;
  p.stash = all;
}

export const stashCaps = (housing: number) => ({ money: STASH.money[housing] ?? 0, units: STASH.units[housing] ?? 0 });

/** Puts something away at home, or takes it back out. `amount` omitted means "all of it". */
export function useStash(p: Player, op: "put" | "take", what: StashWhat, amount: number | undefined): GameEvent[] {
  const country = countryOf(p);
  const caps = stashCaps(p.housing);
  if (op === "put" && caps.money === 0) throw new GameError("You've nowhere to hide anything. Even a sleeping bag under the overpass beats a box.");
  const s = { ...stashOf(p, country), drugs: { ...stashOf(p, country).drugs } };
  const isDrug = (DRUG_IDS as string[]).includes(what);
  const have = op === "put"
    ? what === "cash" ? p.cash : what === "dirty" ? (p.dirty ?? 0) : (p.drugs?.[what as DrugId] ?? 0)
    : what === "cash" ? s.cash : what === "dirty" ? s.dirty : (s.drugs[what as DrugId] ?? 0);
  let n = amount === undefined ? have : Math.floor(amount);
  if (!Number.isFinite(n) || n < 0) throw new GameError("How much?");
  if (op === "put") n = Math.min(n, isDrug ? caps.units - units(s) : caps.money - money(s));
  n = Math.min(n, have);
  if (n <= 0) {
    if (op === "take") throw new GameError("There's none of that in your stash.");
    if (have <= 0) throw new GameError("You don't have any on you.");
    throw new GameError(`Your hiding spot is full. A bigger place hides more.`);
  }
  const sign = op === "put" ? 1 : -1;
  if (what === "cash") {
    p.cash -= sign * n;
    s.cash += sign * n;
  } else if (what === "dirty") {
    p.dirty = (p.dirty ?? 0) - sign * n;
    s.dirty += sign * n;
  } else {
    const d = what as DrugId;
    p.drugs = { ...(p.drugs ?? {}), [d]: (p.drugs?.[d] ?? 0) - sign * n };
    s.drugs[d] = (s.drugs[d] ?? 0) + sign * n;
  }
  save(p, country, s);
  const label = what === "cash" ? `$${n.toLocaleString()}` : what === "dirty" ? `$${n.toLocaleString()} dirty` : `${n} × ${DRUGS[what as DrugId].name}`;
  return [{ tone: "info", text: op === "put" ? `${label} hidden ${STASH.spots[p.housing]}.` : `${label} out of the stash.` }];
}

/** Everything that would get you in trouble, put away at once (as much as fits). */
export function stashAll(p: Player): GameEvent[] {
  const events: GameEvent[] = [];
  const tryPut = (what: StashWhat) => {
    try {
      events.push(...useStash(p, "put", what, undefined));
    } catch {
      /* nothing of that, or no room */
    }
  };
  if ((p.dirty ?? 0) > 0) tryPut("dirty");
  for (const d of DRUG_IDS) if ((p.drugs?.[d] ?? 0) > 0) tryPut(d);
  if (!events.length) throw new GameError(stashCaps(p.housing).money ? "Nothing to hide, or no room left." : "You've nowhere to hide anything.");
  // One line, not a toast per item.
  const what = events.map((e) => e.text.split(" hidden ")[0]).join(", ");
  const full = (p.dirty ?? 0) > 0 || DRUG_IDS.some((d) => (p.drugs?.[d] ?? 0) > 0);
  return [{ tone: "info", text: `${what} hidden ${STASH.spots[p.housing]}.${full ? " That's all that fits: the rest is still on you." : ""}` }];
}

/** A warrant with the right suspect turns up the stash in that city: dirty money and drugs are seized. */
export function seizeStash(p: Player, country: CountryId): { dirty: number; units: number } {
  const s = p.stash?.[country];
  if (!s) return { dirty: 0, units: 0 };
  const out = { dirty: s.dirty, units: units(s) };
  save(p, country, { cash: s.cash, dirty: 0, drugs: {} });
  return out;
}

export function stashView(p: Player) {
  const here = countryOf(p);
  const s = stashOf(p, here);
  const caps = stashCaps(p.housing);
  return {
    spot: STASH.spots[p.housing] || null,
    home: BALANCE.housing[p.housing].name,
    caps,
    cash: s.cash,
    dirty: s.dirty,
    units: units(s),
    drugs: DRUG_IDS.map((d) => ({ id: d, name: DRUGS[d].name, stashed: s.drugs?.[d] ?? 0, onYou: p.drugs?.[d] ?? 0 })).filter((d) => d.stashed || d.onYou),
    nextSpot: p.housing < STASH.money.length - 1 ? { home: BALANCE.housing[p.housing + 1].name, money: STASH.money[p.housing + 1], units: STASH.units[p.housing + 1] } : null,
    elsewhere: Object.entries(p.stash ?? {})
      .filter(([c, x]) => c !== here && x && !isEmpty(x))
      .map(([c, x]) => ({ city: COUNTRY_BY_ID[c as CountryId].capital, money: money(x!), units: units(x!) })),
  };
}
