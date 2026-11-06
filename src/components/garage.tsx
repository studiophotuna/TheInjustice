"use client";

import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { useDirectory } from "./directory";
import type { GameApi } from "./useGame";

const money = (n: number) => `$${n.toLocaleString()}`;

/** Mechanics: open your garage to customers and set your rate. */
export function MyGarage({ game }: { game: GameApi }) {
  const g = game.view!.garage;
  const [rate, setRate] = useState(g?.rate ?? 1);
  useEffect(() => setRate(g?.rate ?? 1), [g?.rate]);
  if (!g) return null;
  const p = Math.round((rate - 1) * 100);
  return (
    <section className="card my-garage">
      <h3 className="card-title"><Wrench size={16} /> Your garage</h3>
      <p className="muted fine">
        Open the doors and other players can hire you: you keep the whole fee, and every job counts toward your next promotion. You can do{" "}
        {g.services.map((s) => s.toLowerCase()).join(", ")}
        {g.next ? `. ${g.next.name} unlocks at ${g.next.rank}.` : "."}
      </p>
      <label className="markup-row">
        <span className="crime-label">Your rate</span>
        <input type="range" min={50} max={150} step={5} value={Math.round(rate * 100)} onChange={(e) => setRate(Number(e.target.value) / 100)} aria-label="Your rate" />
        <span className="markup-read"><span className={`price-tag ${p < 0 ? "down" : p > 0 ? "up" : "even"}`}>{p === 0 ? "dealer price" : `${p > 0 ? "+" : ""}${p}%`}</span></span>
      </label>
      <div className="row wrap">
        <button className="btn btn-primary btn-sm" disabled={game.busy} onClick={() => game.act({ type: "garage_set", open: true, rate })}>
          {g.open ? (rate !== g.rate ? "Update rate" : "Open for business") : "Open the garage"}
        </button>
        {g.open && (
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "garage_set", open: false, rate })}>Close for now</button>
        )}
      </div>
      <p className="fine">{g.open ? "Open." : "Closed."} {g.jobs} jobs done · {money(g.earned)} earned from customers.</p>
    </section>
  );
}

/** Docks: hire a player mechanic instead of the dealer. */
export function HireMechanic({ game }: { game: GameApi }) {
  const d = useDirectory();
  const view = game.view!;
  const mechanics = (d?.mechanics ?? []).filter((m) => !m.block);
  if (!mechanics.length) return null;
  const cars = view.docks.garage.filter((c) => c.here);
  const burned = view.properties.filter((pr) => pr.owned && pr.closedUntil && pr.city === view.location.city);
  const hire = (mechanicId: string, service: string, target?: string) => game.social({ op: "mech_hire", mechanicId, service, target });
  return (
    <section className="card hire-mech">
      <h3 className="card-title"><Wrench size={16} /> Mechanics in town</h3>
      <p className="muted fine">Players who run a garage here. They set their own rates against the dealer, and the money goes to them.</p>
      {mechanics.map((m) => {
        const q = (dealer: number) => Math.max(1, Math.round(dealer * m.rate));
        const jobs: { key: string; label: string; price: number; run: () => unknown }[] = [];
        if (m.services.includes("repair"))
          for (const c of cars) if (c.condition < 100) jobs.push({ key: `r-${c.id}`, label: `Repair ${c.name.toLowerCase()}`, price: q(c.dealerRepair), run: () => hire(m.id, "repair", c.id) });
        if (m.services.includes("floor"))
          for (const c of cars) if (!c.compartment) jobs.push({ key: `f-${c.id}`, label: `False floor, ${c.name.toLowerCase()}`, price: q(view.docks.compartmentCost), run: () => hire(m.id, "floor", c.id) });
        if (m.services.includes("alarm") && view.stash.spot && !view.stash.alarm)
          jobs.push({ key: "alarm", label: "Alarm at your place", price: q(view.stash.alarmCost), run: () => hire(m.id, "alarm") });
        if (m.services.includes("rebuild"))
          for (const pr of burned) jobs.push({ key: `b-${pr.id}`, label: `Rebuild ${pr.name.toLowerCase()}`, price: q(Math.round(pr.price * 0.2)), run: () => hire(m.id, "rebuild", pr.id) });
        const pct = Math.round((m.rate - 1) * 100);
        return (
          <article key={m.id} className="mech-row">
            <header>
              <b>{m.name}</b>
              <span className="fine muted">{m.title} · {pct === 0 ? "dealer prices" : `${Math.abs(pct)}% ${pct < 0 ? "under" : "over"} the dealer`}</span>
            </header>
            {jobs.length ? (
              <div className="row wrap">
                {jobs.map((j) => (
                  <button key={j.key} className="btn btn-ghost btn-xs" disabled={game.busy || view.cash + (view.hasBankAccount ? view.bank : 0) < j.price} onClick={j.run}>
                    {j.label} · {money(j.price)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="fine muted">Nothing of yours here needs their work right now.</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
