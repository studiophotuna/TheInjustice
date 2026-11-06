"use client";

import { useCallback, useEffect, useState } from "react";
import { Siren } from "lucide-react";
import { fmt, type GameApi } from "./useGame";

type Wanted = { id: string; name: string; photo: string | null; until: number; block: string | null };

/** The Police Station: escaped prisoners in this city, for detectives to hunt. */
export function FugitivesCard({ game }: { game: GameApi }) {
  const [data, setData] = useState<{ wanted: Wanted[]; detective: boolean } | null>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community?fugitives=1", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* keep what we had */
    }
  }, []);
  useEffect(() => {
    load();
    window.addEventListener("conspira:changed", load);
    return () => window.removeEventListener("conspira:changed", load);
  }, [load]);
  if (!data || !data.wanted.length) return null;
  return (
    <section className="card wanted-card">
      <h3 className="card-title"><Siren size={16} /> Escaped and at large</h3>
      <p className="muted fine">
        {data.detective
          ? "Find them before the trail goes cold. City hall pays a reward for every one brought back."
          : "Seen one? Only detectives can bring them in."}
      </p>
      <ul className="officials">
        {data.wanted.map((w) => (
          <li key={w.id}>
            <span>
              <b>{w.name}</b> <span className="muted fine">· trail goes cold in {fmt(w.until - Date.now())}</span>
            </span>
            {data.detective && (
              <button className="btn btn-danger btn-xs" disabled={game.busy || !!w.block} title={w.block ?? ""} onClick={() => game.social({ op: "hunt_fugitive", targetId: w.id })}>
                Hunt them
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Home: you're on the run. */
export function OnTheRun({ game }: { game: GameApi }) {
  const f = game.view!.fugitive;
  if (!f) return null;
  return (
    <section className="card on-the-run">
      <p className="eyebrow">On the run</p>
      {f.hidden ? (
        <p className="fine">
          You&apos;ve gone to ground. Nobody can hunt you, and the trail goes cold in <b>{fmt(f.until - Date.now())}</b>. Stay put: no work until you come out.
        </p>
      ) : (
        <>
          <p className="fine">
            The trail goes cold in <b>{fmt(f.until - Date.now())}</b>. Until then detectives are hunting you, customs officers know your face, airports check
            papers, and your bank accounts are frozen. Keep moving, or keep very still.
          </p>
          <button className="btn btn-primary btn-sm" disabled={game.busy || game.view!.cash < 300} title={game.view!.cash < 300 ? "A hideout costs $300, cash." : ""} onClick={() => game.act({ type: "lie_low" })}>
            Go to ground · $300
          </button>
          <p className="fine muted">A hideout takes you off the wanted board and halves the time left, but you can&apos;t work while you&apos;re in it.</p>
        </>
      )}
    </section>
  );
}
