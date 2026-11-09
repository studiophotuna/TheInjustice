// The regulars do their careers' city work, not only their career jobs: police regulars work
// crime scenes and make arrests, attorneys take up prosecutions, doctors treat the ward and
// examine victims, bankers review flagged deposits, firefighters walk burn scenes, mechanics fix
// the wrecks at the garage, hackers clean records, soldiers stand guard at the banks.
//
// They follow the same rules as players (the same checks, the same outcomes). Fresh cases and
// fires are left to players for a while first; a regular only steps in after that.

import { examineBlock } from "./casework";
import { reviewBlock } from "./casework";
import { caseCold, investigateBlock, suspectsFor } from "./crime";
import { investigateBlock as fireBlock } from "./firehack";
import { npcScrubBlock, repairWalkInBlock, treatBlock } from "./incidents";
import { arrestBlock, joinBlock } from "./justice";
import { guardBlock } from "./military";
import type { CaseFile, City, Player } from "./types";

export const CASEWORK = {
  /** Players get first go at a fresh case or fire for this long. */
  playersFirstMs: 20 * 60_000,
};

export type Task =
  | { kind: "arrest"; caseId: string; suspectId: string }
  | { kind: "investigate"; caseId: string }
  | { kind: "prosecute"; caseId: string }
  | { kind: "treat"; patientId: string }
  | { kind: "examine"; caseId: string }
  | { kind: "review"; caseId: string }
  | { kind: "fire"; fireId: string }
  | { kind: "repair"; id: string }
  | { kind: "scrub"; clientId: string }
  | { kind: "guard" };

export interface CityWork {
  city: City | null;
  cases: CaseFile[];
  /** Everyone in the city, players and regulars. */
  people: Player[];
  /** Crew tags by player id, for matching clues. */
  tags: Map<string, string | null>;
}

const aged = (at: number, now: number) => now - at >= CASEWORK.playersFirstMs;

/** The one piece of city work this regular would do now, or null (they'll do a job instead). */
export function pickTask(p: Player, w: CityWork, now: number): Task | null {
  const { city, cases, people } = w;
  const open = cases.filter((c) => !caseCold(c, now) && aged(c.at, now));
  switch (p.path) {
    case "police": {
      // An arrest when the clues point clearly at one person; otherwise work a scene.
      const pool = people.filter((x) => x.id !== p.id).map((player) => ({ player, crewTag: w.tags.get(player.id) ?? null }));
      for (const c of open) {
        if (c.trial || c.tips.length < 3) continue;
        const fits = suspectsFor(c, pool);
        const top = fits[0];
        if (!top || top.matches < c.tips.length || (fits[1] && fits[1].matches === top.matches)) continue;
        const suspect = people.find((x) => x.id === top.id) ?? null;
        if (!arrestBlock(p, c, suspect, fits, now)) return { kind: "arrest", caseId: c.id, suspectId: top.id };
      }
      const scene = open.find((c) => !investigateBlock(p, c, now));
      return scene ? { kind: "investigate", caseId: scene.id } : null;
    }
    case "courts": {
      const t = cases.find((c) => c.trial && aged(c.at, now) && !c.trial.verdict && !c.trial.prosecutor && !joinBlock(p, c, "prosecutor"));
      return t ? { kind: "prosecute", caseId: t.id } : null;
    }
    case "medicine": {
      const patient = people.find((x) => !treatBlock(p, x, now));
      if (patient) return { kind: "treat", patientId: patient.id };
      const victim = open.find((c) => !examineBlock(p, c, now));
      return victim ? { kind: "examine", caseId: victim.id } : null;
    }
    case "banking": {
      const flagged = cases.find((c) => c.deposit && aged(c.deposit.at, now) && !reviewBlock(p, c, now));
      return flagged ? { kind: "review", caseId: flagged.id } : null;
    }
    case "fire": {
      const fire = (city?.fires ?? []).find((f) => aged(f.at, now) && !fireBlock(p, f, now));
      return fire ? { kind: "fire", fireId: fire.id } : null;
    }
    case "mechanic": {
      const job = city && (city.walkIns ?? []).find((x) => aged(x.at, now) && !repairWalkInBlock(p, city, x.id, now));
      return job ? { kind: "repair", id: job.id } : null;
    }
    case "hacker": {
      const client = people.find((x) => x.regular && x.id !== p.id && !npcScrubBlock(p, x, now));
      return client ? { kind: "scrub", clientId: client.id } : null;
    }
    case "military":
      // One regular on guard at a time at most, so the banks never fill up with them.
      return city && !(city.guards ?? []).some((g) => g.until > now) && !guardBlock(city, p, now) ? { kind: "guard" } : null;
    default:
      return null;
  }
}
