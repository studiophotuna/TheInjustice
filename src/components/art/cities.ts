import type { CountryId } from "@/game/types";

/**
 * The owner's painting of each city (public/cities/<city>.jpg, 16:9), where there is one. Shown
 * when a new player picks where to live and on the "Welcome to" card after a trip. Add a city
 * here when its image arrives; the others keep their drawn skyline.
 */
const CITY_FILE: Partial<Record<CountryId, string>> = {
  kestrova: "ironmoor",
};

export function cityArt(id: CountryId, small = false): string | null {
  const f = CITY_FILE[id];
  return f ? `/cities/${f}${small ? "-800" : ""}.jpg` : null;
}
