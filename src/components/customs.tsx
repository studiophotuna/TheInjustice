"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { GameApi } from "./useGame";

type CustomsData = {
  onDuty: number;
  officers: string[];
  mine: number | null;
  eligible: boolean;
  block: string | null;
  seizures: number;
  shiftMinutes: number;
  energy: number;
  bountyPct: number;
};

/** Who's on customs duty in this city (from City Hall's data). */
export function useCustoms() {
  const [data, setData] = useState<CustomsData | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/city", { cache: "no-store" });
      if (res.ok) setData((await res.json()).customs ?? null);
    } catch {
      /* keep what we had */
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("conspira:changed", load);
    return () => window.removeEventListener("conspira:changed", load);
  }, [load]);
  return data;
}

const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** A one-line heads-up for anyone about to travel with something to hide. */
export function CustomsLine() {
  const d = useCustoms();
  if (!d) return null;
  return (
    <p className={`fine customs-line ${d.onDuty ? "manned" : ""}`}>
      <ShieldCheck size={13} />{" "}
      {d.onDuty
        ? `Customs is on duty: ${d.officers.join(", ")}. More stops, and real eyes doing the searching.`
        : "Nobody is on customs duty right now. Just the usual guards."}
    </p>
  );
}

/** The Station: officers take a customs shift here. Everyone sees whether it's manned. */
export function CustomsCard({ game }: { game: GameApi }) {
  const d = useCustoms();
  if (!d) return null;
  if (!d.eligible) return <CustomsLine />;
  return (
    <section className="card customs-card">
      <h3 className="card-title"><ShieldCheck size={16} /> Customs desk</h3>
      <p className="muted fine">
        Take a {d.shiftMinutes}-minute shift on the checkpoints out of the city. While you're on duty, more drivers get stopped, you do the searching
        (sharp eyes find more), and the station checks more bags. You keep a {d.bountyPct}% bounty on every seizure, and it counts toward your next
        promotion.
      </p>
      <p className="fine">
        {d.onDuty ? `On duty now: ${d.officers.join(", ")}.` : "Nobody is on duty right now."} {d.seizures ? `Your seizures so far: ${d.seizures}.` : ""}
      </p>
      {d.mine ? (
        <div className="row wrap">
          <span className="chip chip-green">On duty until {time(d.mine)}</span>
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.social({ op: "customs_off" }, "/api/city")}>End shift</button>
        </div>
      ) : (
        <button className="btn btn-primary btn-sm" disabled={game.busy || !!d.block} title={d.block ?? ""} onClick={() => game.social({ op: "customs_duty" }, "/api/city")}>
          Take a shift · ⚡{d.energy}
        </button>
      )}
    </section>
  );
}
