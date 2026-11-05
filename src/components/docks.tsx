"use client";

import { useEffect, useState } from "react";
import { Car as CarIcon, PackageOpen, Store, TrendingUp } from "lucide-react";
import { Vehicle } from "./art/Vehicles";
import type { GameApi } from "./useGame";

const money = (n: number) => `$${n.toLocaleString()}`;

/** The Docks: your garage, the lot, and the fences who move cargo between cities. */
export function Docks({ game, go }: { game: GameApi; go?: (to: string) => void }) {
  const view = game.view!;
  const d = view.docks;
  const parked = d.garage.filter((c) => c.here);
  const [carId, setCarId] = useState<string | null>(parked[0]?.id ?? null);
  useEffect(() => {
    if (!parked.some((c) => c.id === carId)) setCarId(parked[0]?.id ?? null);
  }, [parked, carId]);
  const car = parked.find((c) => c.id === carId) ?? null;
  const [qty, setQty] = useState<Record<string, string>>({});
  const q = (id: string) => Math.max(1, Number(qty[id] || "1"));
  const room = car ? car.trunk - car.used : 0;

  return (
    <div className="stack docks">
      <section className="card">
        <h3 className="card-title"><CarIcon size={16} /> Your garage</h3>
        {d.garage.length === 0 ? (
          <p className="muted">
            No wheels yet. A car takes you between cities on your own schedule, and the trunk carries what the bus can&apos;t. Pick one up at the lot below.
          </p>
        ) : (
          <div className="garage">
            {d.garage.map((c) => (
              <article key={c.id} className={`garage-car ${c.here ? "" : "away"} ${car?.id === c.id ? "on" : ""}`} onClick={() => c.here && setCarId(c.id)}>
                <Vehicle mode="car" color={c.color} className="garage-art" />
                <div className="garage-body">
                  <b>{c.name}</b>
                  <span className="fine muted">{c.here ? "Parked here" : `Parked in ${c.city}`} · {c.looks}</span>
                  <div className="wear-bar" title={`${c.condition}% condition`}><span style={{ width: `${c.condition}%` }} className={c.condition < 35 ? "low" : ""} /></div>
                  <span className="fine">
                    {c.condition}% condition{!c.canDrive ? " · needs a mechanic" : ""} · trunk {c.used}/{c.trunk}
                  </span>
                  {c.cargo.length > 0 && <span className="fine cargo-line"><PackageOpen size={12} /> {c.cargo.map((g) => `${g.qty} × ${g.name.toLowerCase()}`).join(", ")}</span>}
                </div>
                {c.here && (
                  <div className="garage-actions" onClick={(e) => e.stopPropagation()}>
                    {c.condition < 100 && (
                      <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "car_repair", carId: c.id })}>
                        Repair {money(c.repairCost)}
                      </button>
                    )}
                    {!c.compartment && (
                      <button className="btn btn-ghost btn-xs" disabled={game.busy} title="A false floor makes searches much harder, and takes a little trunk space." onClick={() => game.act({ type: "car_compartment", carId: c.id })}>
                        False floor {money(d.compartmentCost)}
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-xs"
                      disabled={game.busy || c.used > 0}
                      title={c.used ? "Empty the trunk first." : ""}
                      onClick={() => confirm(`Sell the ${c.name.toLowerCase()} for ${money(c.resale)}?`) && game.act({ type: "car_sell", carId: c.id })}
                    >
                      Sell {money(c.resale)}
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        {parked.length > 0 && (
          <button className="btn btn-primary btn-sm" onClick={() => go?.("place:station")}>Drive somewhere</button>
        )}
      </section>

      <section className="card smuggle">
        <h3 className="card-title"><TrendingUp size={16} /> The fences · {view.location.city}</h3>
        <p className="muted fine">
          Cargo that&apos;s cheap here is dear somewhere else, and prices move every hour. Load it into a trunk, drive it across, sell it to the fence
          there for dirty money. Highway checkpoints search cars. Anything you carry on you is searched too.
        </p>
        {!car ? (
          <p className="fine">You need a car parked in {view.location.city} to load cargo.</p>
        ) : (
          <p className="fine">
            Loading into your <b>{car.name.toLowerCase()}</b> · {room} of {car.trunk} free{parked.length > 1 ? " (tap a car above to switch)" : ""}.
          </p>
        )}
        <div className="goods">
          {d.goods.map((g) => {
            const have = car?.cargo.find((x) => x.id === g.id)?.qty ?? 0;
            const best = g.board.reduce((a, b) => (b.sell > a.sell ? b : a));
            return (
              <article key={g.id} className="good">
                <header>
                  <b>{g.name}</b>
                  <span className="fine muted">per {g.unit}</span>
                </header>
                <div className="good-prices">
                  <span>Buy <b>{money(g.buy)}</b></span>
                  <span>Sell <b>{money(g.sell)}</b></span>
                  <span>In trunk <b>{have}</b></span>
                </div>
                <div className="price-board" aria-label={`What fences pay for ${g.name.toLowerCase()} this hour`}>
                  {g.board.map((b) => (
                    <span key={b.country} className={`${b.here ? "here" : ""} ${b === best ? "best" : ""}`}>
                      <em>{b.city}</em>
                      <b>{money(b.sell)}</b>
                    </span>
                  ))}
                </div>
                {car && (
                  <div className="row good-row">
                    <input inputMode="numeric" value={qty[g.id] ?? "1"} onChange={(e) => setQty({ ...qty, [g.id]: e.target.value.replace(/\D/g, "") })} aria-label={`${g.name} quantity`} />
                    <button className="btn btn-ghost btn-xs" disabled={game.busy || room < 1} onClick={() => game.act({ type: "cargo_buy", carId: car.id, good: g.id, qty: Math.min(q(g.id), room) })}>
                      Load
                    </button>
                    <button className="btn btn-ghost btn-xs" disabled={game.busy || have < 1} onClick={() => game.act({ type: "cargo_sell", carId: car.id, good: g.id, qty: Math.min(q(g.id), have) })}>
                      Sell
                    </button>
                    {room > 0 && (
                      <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "cargo_buy", carId: car.id, good: g.id, qty: room })}>
                        Fill
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <p className="fine muted">The board shows what fences in each city pay this hour. By the time you get there, it may have moved.</p>
      </section>

      <section className="card">
        <h3 className="card-title"><Store size={16} /> The lot</h3>
        <p className="muted fine">Paid in clean money, cash first, then the bank. Your garage holds {d.maxCars}.</p>
        <div className="lot">
          {d.lot.map((m) => (
            <article key={m.id} className="lot-car">
              <Vehicle mode="car" color={m.color} className="garage-art" />
              <div>
                <b>{m.name}</b>
                <p className="fine muted">{m.blurb}</p>
                <p className="fine">
                  Trunk {m.trunk} · {m.speed >= 1.5 ? "very fast" : m.speed > 1 ? "quick" : m.speed < 1 ? "slow" : "steady"}
                  {m.armored ? " · armored" : ""}
                  {m.outrun ? " · outruns checkpoints" : ""}
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                disabled={game.busy || d.garage.length >= d.maxCars || view.cash + (view.hasBankAccount ? view.bank : 0) < m.price}
                onClick={() => game.act({ type: "car_buy", model: m.id })}
              >
                {money(m.price)}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
