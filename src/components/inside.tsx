"use client";

import { Pickaxe } from "lucide-react";
import type { GameApi } from "./useGame";

/** The prison: your standing in the yard, the tunnel, the shank, and the parole board. */
export function InsideCard({ game }: { game: GameApi }) {
  const v = game.view!.inside;
  if (!v) return null;
  return (
    <section className="card inside-card">
      <h3 className="card-title"><Pickaxe size={16} /> Life inside</h3>
      <p className="fine">
        Standing in the yard: <b>{v.standing}</b>
        {v.next ? <span className="muted"> · {v.next.need} more respect to {v.next.name}</span> : null}
      </p>
      <p className="fine muted">Respect comes from prison shifts, yard fights you win, and getting out the hard way. Higher standing means the guards look elsewhere.</p>

      {v.serving && (
        <div className="inside-block">
          <span className="crime-label">The tunnel</span>
          <div className="wear-bar"><span style={{ width: `${v.tunnel}%` }} /></div>
          <span className="fine muted">{v.tunnel ? `${v.tunnel}% of the way under the wall.` : "Behind the poster, a loose brick. It's a start."} If the guards find it, it's filled in and you get more time.</span>
          <button className="btn btn-ghost btn-sm" disabled={game.busy || !!v.canDig} title={v.canDig ?? ""} onClick={() => game.act({ type: "tunnel_dig" })}>
            Dig · ⚡{v.energy.dig}
          </button>
        </div>
      )}

      <div className="inside-block">
        <span className="crime-label">A shank</span>
        <span className="fine muted">{v.shank ? "Taped under your bunk. An edge in your next yard fight, if a shakedown doesn't find it." : "An edge in yard fights. Getting caught making one, or carrying one, adds time."}</span>
        {!v.shank && (
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "make_shank" })}>Make one · ⚡{v.energy.shank}</button>
        )}
      </div>

      {v.serving && (
        <div className="inside-block">
          <span className="crime-label">The parole board</span>
          <span className="fine muted">One hearing per sentence. They like to see shifts worked ({v.work} so far), no recent fights, and a good word from the yard.</span>
          <button className="btn btn-primary btn-sm" disabled={game.busy || !!v.parole} title={v.parole ?? ""} onClick={() => game.act({ type: "parole_hearing" })}>
            Ask for a hearing
          </button>
          {v.parole && <span className="fine muted">{v.parole}</span>}
        </div>
      )}
    </section>
  );
}
