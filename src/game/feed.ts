// Who sees what in the city's feeds (the live street feed, the city hall log, the paper).
//
// The street sees news: a mugging, a fire, a crash, an arrest, an election. Officials (police,
// courts and fire, plus the mayor) also see the working side: case numbers, who an investigation
// named, crime-scene work, tips about dirty money. Covert and corrupt work is never posted.

import type { City, CountryId, FeedLine, Player } from "./types";

const OFFICIAL_PATHS = new Set(["police", "courts", "fire"]);

/** Police, courts and fire service in this city, and its mayor. */
export function seesOfficialFeed(p: Player, city: Pick<City, "country" | "mayor"> | null | undefined, country: CountryId): boolean {
  if (!city) return false;
  if (city.mayor?.id === p.id) return true;
  return !!p.path && OFFICIAL_PATHS.has(p.path) && country === city.country;
}

// Lines written before 7.9 carried official details in their text. Keep them out of public view.
const LEGACY_CASE = /\s*\(?(?:The police opened )?case #[0-9A-F]{6}\)?\.?/;
const LEGACY_OFFICIAL = /^Fire investigator .+ names .+ as the arsonist|examined .+ injuries for case #|worked the scene in .+ \(case #|flagged a suspicious deposit/;

/** The text of a line as this viewer may read it, or null if it isn't for them. */
export function lineFor(l: FeedLine, official: boolean): string | null {
  const legacyOfficial = !l.to && LEGACY_OFFICIAL.test(l.text);
  if ((l.to === "officials" || legacyOfficial) && !official) return null;
  if (official) return l.detail ? `${l.text} ${l.detail}` : l.text;
  return l.text.replace(LEGACY_CASE, ".").replace(/\.\.$/, ".").replace(/ \.$/, ".");
}

/** A feed filtered for one viewer. */
export function visibleFeed<T extends FeedLine>(lines: T[], official: boolean): (Omit<T, "text" | "detail" | "to"> & { text: string })[] {
  const out: (Omit<T, "text" | "detail" | "to"> & { text: string })[] = [];
  for (const l of lines) {
    const text = lineFor(l, official);
    if (text === null) continue;
    const { detail: _d, to: _t, text: _x, ...rest } = l;
    void _d;
    void _t;
    void _x;
    out.push({ ...rest, text });
  }
  return out;
}

/** Work that is never announced: crime, corruption, leaning on people. */
const SECRET_TAGS = /Crime|Corrupt|Pressure|Shady/;
/** Work only officials hear about: surveillance and investigation. */
const OFFICIAL_TAGS = /Watch|Investigation/;

/** How a job shows up in the street feed: openly, to officials only, or not at all. */
export function jobAudience(tag: string): "public" | "officials" | "secret" {
  if (SECRET_TAGS.test(tag)) return "secret";
  if (OFFICIAL_TAGS.test(tag)) return "officials";
  return "public";
}
