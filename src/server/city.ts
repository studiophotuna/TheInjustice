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

/** Moves withheld tax into the city treasury. */
export async function payTax(store: PlayerStore, owed: { country: CountryId; amount: number }, now: number) {
  if (owed.amount <= 0) return;
  await withCity(store, owed.country, now, (c) => depositTax(c, owed));
}
