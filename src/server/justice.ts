import "server-only";
import { tick } from "@/game/engine";
import { decideTrial, trialPartyIds } from "@/game/justice";
import { GameError, type GameEvent, type Player, type Verdict } from "@/game/types";
import type { PlayerStore } from "./store";

/**
 * Closes a trial inside one transaction, locking everyone it touches.
 * Without a judge it only acts once the deadline has passed (the court clerk decides).
 */
export async function settleTrial(
  store: PlayerStore,
  caseId: string,
  now: number,
  ruling?: { judgeId: string; verdict?: Verdict; takeBribe?: boolean },
): Promise<GameEvent[]> {
  return store.transaction(async (tx) => {
    const c = await tx.getCase(caseId);
    if (!c?.trial) throw new GameError("That case doesn't exist.");
    if (c.trial.verdict) {
      if (ruling) throw new GameError("The court already ruled.");
      return [];
    }
    if (!ruling && now < c.trial.deadline) return [];
    const ids = [...new Set([...trialPartyIds(c), ...(ruling ? [ruling.judgeId] : [])])];
    const rows = await tx.getPlayers(ids);
    const byId = new Map<string, Player>();
    rows.forEach((p) => {
      if (p) {
        tick(p, now);
        byId.set(p.id, p);
      }
    });
    const get = (id?: string) => (id ? byId.get(id) ?? null : null);
    const t = c.trial;
    const events = decideTrial(
      c,
      {
        suspect: get(t.suspectId),
        victim: get(c.victimId),
        officer: get(t.officerId),
        prosecutor: get(t.prosecutor?.id),
        defender: get(t.defender?.id),
        culprit: get(c.culpritId),
      },
      { judge: ruling ? get(ruling.judgeId) : null, verdict: ruling?.verdict, takeBribe: ruling?.takeBribe },
      now,
      Math.random,
    );
    for (const p of byId.values()) await tx.putPlayer(p);
    await tx.putCase(c);
    return events;
  });
}
