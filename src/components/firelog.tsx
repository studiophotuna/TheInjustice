"use client";

import { useCallback, useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { fmt, type GameApi } from "./useGame";

type Fire = { id: string; what: string; victim: string; at: number; solved: string | null; solvedBy: string | null; block: string | null };

/** The Police Station: the city's recent arsons. Firefighters (Engineer and up) investigate here. */
export function FireLog({ game }: { game: GameApi }) {
  const [data, setData] = useState<{ fires: Fire[]; fireWatch: number | null } | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/city", { cache: "no-store" });
      if (res.ok) {
        const j = await res.json();
        setData({ fires: j.fires ?? [], fireWatch: j.fireWatch ?? null });
      }
    } catch {
      /* keep what we had */
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("conspira:changed", load);
    return () => window.removeEventListener("conspira:changed", load);
  }, [load]);
  if (!data || (!data.fires.length && !data.fireWatch)) return null;
  const firefighter = game.view!.path?.id === "fire";
  return (
    <section className="card fire-log">
      <h3 className="card-title"><Flame size={16} /> Fire log</h3>
      {data.fireWatch && <p className="fine">🚒 Fire watch until {new Date(data.fireWatch).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}: nothing burns in this city tonight.</p>}
      <p className="muted fine">
        {firefighter
          ? "Walk a scene once. Read it right and you name the arsonist in public: they take the heat, and city hall pays you."
          : "Arsons in the last two days. The Fire Department investigates."}
      </p>
      <ul className="officials">
        {data.fires.map((f) => (
          <li key={f.id} className={f.solved ? "solved" : ""}>
            <span>
              <b>{f.what}</b> <span className="muted fine">· {f.victim} · {fmt(Date.now() - f.at)} ago</span>
              {f.solved && <span className="fine"> · named: <b>{f.solved}</b> (by {f.solvedBy})</span>}
            </span>
            {firefighter && !f.solved && (
              <button className="btn btn-ghost btn-xs" disabled={game.busy || !!f.block} title={f.block ?? ""} onClick={() => game.social({ op: "fire_investigate", fireId: f.id }, "/api/city")}>
                Investigate
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
