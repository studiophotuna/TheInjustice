// The city's newspaper: a front page written from what actually happened this week. Verdicts,
// scandals, wars and city hall news become headlines; crime numbers fill the sidebar.
// It only ever prints what's already public (verdicts, the city log), never who did a crime.

import { CRIMES } from "./crime";
import { COUNTRY_BY_ID } from "./content/world";
import { cityEvent } from "./events";
import type { CaseFile, City, CountryId } from "./types";

const WEEK = 7 * 24 * 60 * 60_000;
const PAPER_NAMES: Record<CountryId, string> = {
  varrow: "The Grayhaven Ledger",
  solmarra: "The Port Solace Tide",
  kestrova: "The Ironmoor Bulletin",
  meridian: "The Halcyon Standard",
};

export function frontPage(country: CountryId, city: City | null, cases: CaseFile[], now: number) {
  const recent = cases.filter((c) => now - c.at < WEEK);
  const verdicts = cases.filter((c) => c.trial?.verdict && now - (c.trial.decidedAt ?? 0) < WEEK);
  const scandals = cases.flatMap((c) => (c.exposed ?? []).filter((e) => now - e.at < WEEK).map((e) => ({ ...e, caseId: c.id })));
  const stories: { at: number; headline: string; kind: string }[] = [];

  for (const s of scandals) stories.push({ at: s.at, kind: "scandal", headline: `SCANDAL: ${s.name}, the ${s.role}, caught by internal affairs` });
  for (const c of verdicts) {
    const t = c.trial!;
    stories.push({
      at: t.decidedAt ?? c.at,
      kind: "court",
      headline:
        t.verdict === "guilty"
          ? `${t.suspectName} found guilty of ${CRIMES[c.kind].name.toLowerCase()} in ${c.district}`
          : `${t.suspectName} walks free: not guilty in the ${c.district} ${CRIMES[c.kind].name.toLowerCase()}`,
    });
  }
  for (const l of city?.log ?? []) if (now - l.at < WEEK) stories.push({ at: l.at, kind: "city", headline: l.text });
  stories.sort((a, b) => b.at - a.at);

  const event = cityEvent(country, now);
  const lead =
    stories.find((s) => s.kind === "scandal") ??
    stories.find((s) => /War!|took|held/.test(s.headline)) ??
    stories[0] ??
    null;

  return {
    name: PAPER_NAMES[country],
    city: COUNTRY_BY_ID[country].capital,
    lead: lead?.headline ?? `Quiet week in ${COUNTRY_BY_ID[country].capital}. Too quiet.`,
    stories: stories.filter((s) => s !== lead).slice(0, 8).map((s) => ({ headline: s.headline, kind: s.kind, at: s.at })),
    weather: event ? `${event.name}: ${event.text}` : null,
    stats: {
      crimes: recent.length,
      stolen: recent.reduce((s, c) => s + c.amount, 0),
      arrests: cases.filter((c) => c.trial && now - c.trial.at < WEEK).length,
      convictions: verdicts.filter((c) => c.trial!.verdict === "guilty").length,
      unsolved: recent.filter((c) => !c.trial && !c.hunt).length,
    },
  };
}
