import "server-only";
import { BALANCE } from "@/game/balance";
import { advanceCity, depositTax, newCity } from "@/game/city";
import { COUNTRIES } from "@/game/content/world";
import type { City, CountryId } from "@/game/types";
import type { PlayerStore, Tx } from "./store";

/** Runs `fn` with the city locked (created and brought up to date first), then saves it. */
export async function withCity<T>(store: PlayerStore, country: CountryId, now: number, fn: (c: City, tx: Tx) => Promise<T> | T): Promise<T> {
  return store.transaction(async (tx) => {
    const c = (await tx.getCity(country)) ?? newCity(country, now);
    advanceCity(c, now);
    const out = await fn(c, tx);
    await tx.putCity(c);
    return out;
  });
}

/** Reads a city; closes any finished election (and saves) on the way. */
export async function readCity(store: PlayerStore, country: CountryId, now: number): Promise<City> {
  const c = await store.getCity(country);
  if (c && !advanceCity(structuredClone(c), now)) return c;
  return withCity(store, country, now, (fresh) => fresh);
}

/** Current tax rate in every country (cities that never saved use the default). */
export async function taxRates(store: PlayerStore): Promise<Partial<Record<CountryId, number>>> {
  const cities = await store.listCities();
  const out: Partial<Record<CountryId, number>> = Object.fromEntries(COUNTRIES.map((c) => [c.id, BALANCE.city.defaultTax]));
  for (const c of cities) out[c.country] = c.taxRate;
  return out;
}

/** Which crew runs each district, across every city. */
export async function turfMap(store: PlayerStore): Promise<Partial<Record<import("@/game/types").DistrictId, string>>> {
  const cities = await store.listCities();
  const out: Partial<Record<import("@/game/types").DistrictId, string>> = {};
  for (const c of cities) for (const [d, h] of Object.entries(c.turf ?? {})) if (h) out[d as import("@/game/types").DistrictId] = h.crewId;
  return out;
}

/** Moves protection money into the vault of the crew that runs the district. */
export async function payTurf(store: PlayerStore, owed: { crewId: string; amount: number }) {
  if (owed.amount <= 0) return;
  await store.transaction(async (tx) => {
    const crew = await tx.getCrew(owed.crewId);
    if (!crew) return;
    crew.vault += owed.amount;
    await tx.putCrew(crew);
  });
}

/** Moves withheld tax into the city treasury. */
export async function payTax(store: PlayerStore, owed: { country: CountryId; amount: number }, now: number) {
  if (owed.amount <= 0) return;
  await withCity(store, owed.country, now, (c) => depositTax(c, owed));
}

/** A stolen car the police impounded goes back into its owner's garage. */
export async function returnImpounded(store: PlayerStore, thiefId: string, now: number) {
  await store.transaction(async (tx) => {
    const [thief] = await tx.getPlayers([thiefId]);
    const imp = thief?.impounded;
    if (!thief || !imp) return;
    thief.impounded = null;
    const [owner] = await tx.getPlayers([imp.ownerId]);
    if (owner && !owner.dead) {
      owner.garage = [...(owner.garage ?? []), imp.car];
      const { notify } = await import("@/game/social");
      const { CARS } = await import("@/game/vehicles");
      const city = COUNTRIES.find((c) => c.id === imp.car.country)?.capital ?? "the city";
      notify(owner, `Good news: police stopped your stolen ${CARS[imp.car.model].name.toLowerCase()} at a checkpoint. It's back in your garage, parked in ${city}.`, "good", undefined, now);
      await tx.putPlayer(owner);
    }
    await tx.putPlayer(thief);
  });
}
