// Guard dogs: one per home. A dog makes a break-in harder, barks when someone tries the door,
// and makes a crew job likelier to be interrupted. It has to be fed: a hungry dog guards half as
// well, and one left unfed for a week finds a new home.

import { COUNTRY_BY_ID } from "./content/world";
import { countryOf } from "./engine";
import { GameError, type CountryId, type Dog, type DogBreed, type GameEvent, type Player } from "./types";

export const DOGS = {
  breeds: {
    mutt: { name: "Pound mutt", price: 300, food: 15, guard: 0.15, blurb: "All bark. Loud bark, though." },
    shepherd: { name: "Shepherd", price: 2_500, food: 35, guard: 0.25, blurb: "Smart, loyal, and very sure about strangers." },
    mastiff: { name: "Mastiff", price: 8_000, food: 70, guard: 0.35, blurb: "Weighs more than most burglars. Knows it." },
  } satisfies Record<DogBreed, { name: string; price: number; food: number; guard: number; blurb: string }>,
  /** A meal lasts this long. */
  fedMs: 3 * 24 * 60 * 60_000,
  /** Unfed this long past the last meal, the dog leaves. */
  leaveMs: 7 * 24 * 60 * 60_000,
};

export const DOG_BREEDS = Object.keys(DOGS.breeds) as DogBreed[];
export const isBreed = (v: unknown): v is DogBreed => typeof v === "string" && v in DOGS.breeds;

const priced = (base: number, country: CountryId) => Math.round(base * COUNTRY_BY_ID[country].priceMult);

export function dogState(d: Dog | null | undefined, now: number): "fed" | "hungry" | "gone" | null {
  if (!d) return null;
  const since = now - d.fedAt;
  return since < DOGS.fedMs ? "fed" : since < DOGS.leaveMs ? "hungry" : "gone";
}

/** The dog at someone's place in a city, if it's still there. */
export function dogAt(p: Player, country: CountryId, now: number): Dog | null {
  const d = p.dogs?.[country];
  return d && dogState(d, now) !== "gone" ? d : null;
}

/** How much a dog cuts a burglar's odds (0 with no dog; halved when it's hungry). */
export function dogGuard(p: Player, country: CountryId, now: number): number {
  const d = dogAt(p, country, now);
  if (!d) return 0;
  const g = DOGS.breeds[d.breed].guard;
  return dogState(d, now) === "hungry" ? g / 2 : g;
}

function cleanName(raw: string): string {
  const name = raw.replace(/[^\p{L}\p{N} '-]/gu, "").trim().slice(0, 16);
  if (!name) throw new GameError("Give your dog a name.");
  return name;
}

export function buyDog(p: Player, breed: DogBreed, rawName: string, now: number): GameEvent[] {
  const country = countryOf(p);
  if (!isBreed(breed)) throw new GameError("No such dog.");
  if (p.housing < 1) throw new GameError("A dog needs somewhere to live. So do you.");
  if (dogAt(p, country, now)) throw new GameError("You already have a dog here.");
  const name = cleanName(rawName);
  const price = priced(DOGS.breeds[breed].price, country);
  if (p.cash < price) throw new GameError(`That's $${price.toLocaleString()}, cash.`);
  p.cash -= price;
  p.dogs = { ...(p.dogs ?? {}), [country]: { breed, name, fedAt: now, since: now } };
  return [{ tone: "good", text: `${name} the ${DOGS.breeds[breed].name.toLowerCase()} sniffs every corner of your place, then lies down across the doorway. Fed for three days.` }];
}

export function feedDog(p: Player, now: number): GameEvent[] {
  const country = countryOf(p);
  const d = p.dogs?.[country];
  if (!d) throw new GameError("You don't have a dog here.");
  if (dogState(d, now) === "gone") {
    const dogs = { ...(p.dogs ?? {}) };
    delete dogs[country];
    p.dogs = dogs;
    throw new GameError(`${d.name} got tired of waiting and found a family that remembers dinner.`);
  }
  if (now - d.fedAt < DOGS.fedMs / 3) throw new GameError(`${d.name} is still full.`);
  const cost = priced(DOGS.breeds[d.breed].food, country);
  if (p.cash < cost) throw new GameError(`Dog food is $${cost}, cash.`);
  p.cash -= cost;
  d.fedAt = now;
  return [{ tone: "good", text: `${d.name} eats like it's the last meal on earth. Good for three days. -$${cost}` }];
}

export function giveAwayDog(p: Player): GameEvent[] {
  const country = countryOf(p);
  const d = p.dogs?.[country];
  if (!d) throw new GameError("You don't have a dog here.");
  const dogs = { ...(p.dogs ?? {}) };
  delete dogs[country];
  p.dogs = dogs;
  return [{ tone: "info", text: `A kid from the next block takes ${d.name}. They both look happy about it.` }];
}

export function dogView(p: Player, now: number) {
  const country = countryOf(p);
  const d = p.dogs?.[country] ?? null;
  const state = dogState(d, now);
  return {
    dog: d
      ? {
          name: d.name,
          breed: DOGS.breeds[d.breed].name,
          state,
          fedUntil: d.fedAt + DOGS.fedMs,
          leavesAt: d.fedAt + DOGS.leaveMs,
          foodCost: priced(DOGS.breeds[d.breed].food, country),
          canFeed: state !== "gone" && now - d.fedAt >= DOGS.fedMs / 3,
        }
      : null,
    breeds: DOG_BREEDS.map((b) => ({ id: b, name: DOGS.breeds[b].name, blurb: DOGS.breeds[b].blurb, price: priced(DOGS.breeds[b].price, country), food: priced(DOGS.breeds[b].food, country) })),
  };
}
