// The city's newspaper: a front page written from what actually happened this week. Verdicts,
// scandals, wars and city hall news become headlines; crime numbers fill the sidebar.
// It only ever prints what's already public (verdicts, the city log), never who did a crime.

import { CRIMES } from "./crime";
import { COUNTRY_BY_ID } from "./content/world";
import { cityEvent } from "./events";
import type { CaseFile, City, CountryId } from "./types";
import { visibleFeed } from "./feed";

const WEEK = 7 * 24 * 60 * 60_000;
const PAPER_NAMES: Record<CountryId, string> = {
  varrow: "The Grayhaven Ledger",
  solmarra: "The Port Solace Tide",
  kestrova: "The Ironmoor Bulletin",
  meridian: "The Halcyon Standard",
};

/** Every story this week, with a stable id (so the editor can pull it). */
export function weekStories(country: CountryId, city: City | null, cases: CaseFile[], now: number) {
  const recent = cases.filter((c) => now - c.at < WEEK);
  const verdicts = cases.filter((c) => c.trial?.verdict && now - (c.trial.decidedAt ?? 0) < WEEK);
  const scandals = cases.flatMap((c) => (c.exposed ?? []).filter((e) => now - e.at < WEEK).map((e) => ({ ...e, caseId: c.id })));
  const stories: { id: string; at: number; headline: string; kind: string }[] = [];

  for (const s of scandals) stories.push({ id: `scandal:${s.caseId}:${s.at}`, at: s.at, kind: "scandal", headline: `SCANDAL: ${s.name}, the ${s.role}, caught by internal affairs` });
  for (const c of verdicts) {
    const t = c.trial!;
    stories.push({
      id: `court:${c.id}`,
      at: t.decidedAt ?? c.at,
      kind: "court",
      headline:
        t.verdict === "guilty"
          ? `${t.suspectName} found guilty of ${CRIMES[c.kind].name.toLowerCase()} in ${c.district}`
          : `${t.suspectName} walks free: not guilty in the ${c.district} ${CRIMES[c.kind].name.toLowerCase()}`,
    });
  }
  // The paper prints what the street may know: no case numbers, nothing meant for officials.
  for (const l of visibleFeed(city?.log ?? [], false)) if (now - l.at < WEEK) stories.push({ id: `city:${l.at}`, at: l.at, kind: "city", headline: l.text });
  stories.sort((a, b) => b.at - a.at);
  return { stories, recent, verdicts };
}

/**
 * The front page. Buried stories are left out; the editor (only) still sees them, marked, so
 * they can put them back.
 */
export function frontPage(country: CountryId, city: City | null, cases: CaseFile[], now: number, opts: { editor?: boolean } = {}) {
  const { stories: all, recent, verdicts } = weekStories(country, city, cases, now);
  const buried = new Set(city?.buried ?? []);
  const stories = all.filter((s) => !buried.has(s.id));

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
    leadId: lead?.id ?? null,
    stories: stories.filter((s) => s !== lead).slice(0, 8).map((s) => ({ id: s.id, headline: s.headline, kind: s.kind, at: s.at })),
    buried: opts.editor ? all.filter((s) => buried.has(s.id)).map((s) => ({ id: s.id, headline: s.headline, kind: s.kind, at: s.at })) : [],
    editor: city?.editor ? { name: city.editor.name, price: city.editor.price } : null,
    editorial: city?.editorial ?? null,
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
