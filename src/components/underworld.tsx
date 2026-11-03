"use client";

import { FlaskConical, Pill, ShieldAlert, WashingMachine } from "lucide-react";
import { useEffect, useState } from "react";
import type { GameApi } from "./useGame";

/** Dirty money and the ways to clean it. */
export function LaunderCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const [amount, setAmount] = useState("100");
  const [bankers, setBankers] = useState<{ id: string; name: string; fee: number }[]>([]);
  const [mine, setMine] = useState<{ fee: number } | null>(null);
  const [staff, setStaff] = useState(false);
  const [myFee, setMyFee] = useState("15");
  const load = () =>
    fetch("/api/community?bankers=1", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setBankers(d.bankers ?? []);
        setMine(d.mine ?? null);
        setStaff(!!d.staff);
      })
      .catch(() => undefined);
  useEffect(() => {
    load();
  }, [view.location.country]);
  const service = staff ? (
    <section className="card launder">
      <h3 className="card-title"><WashingMachine size={16} /> Your laundering service</h3>
      <p className="muted fine">Clients bring dirty money; you hand back clean cash and keep your fee. Internal affairs keeps an eye on bankers&apos; books.</p>
      <div className="row wrap">
        <input type="number" min={5} max={50} value={myFee} onChange={(e) => setMyFee(e.target.value)} aria-label="Fee percent" />%
        <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={async () => { await game.social({ op: "launder_service", open: true, fee: Number(myFee) / 100 }); load(); }}>
          {mine ? "Change fee" : "Open for clients"}
        </button>
        {mine && <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={async () => { await game.social({ op: "launder_service", open: false }); load(); }}>Close</button>}
      </div>
      {mine && <p className="fine">Open at {Math.round(mine.fee * 100)}%.</p>}
    </section>
  ) : null;
  if (!view.dirty) return service;
  return (
    <>
    {service}
    <section className="card launder">
      <h3 className="card-title"><WashingMachine size={16} /> Dirty money: ${view.dirty.toLocaleString()}</h3>
      <p className="muted">
        Money from crime is dirty. Dealers, bent cops and back-alley doctors take it; the bank and the shops don&apos;t. Clean it first.
      </p>
      <div className="row wrap">
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to launder" />
        <button className="btn btn-ghost btn-xs" onClick={() => setAmount(String(view.dirty))}>All</button>
      </div>
      <ul className="officials">
        {view.launder.map((o) => (
          <li key={o.id}>
            <span>
              <b>{o.name}</b> <span className="muted">· {Math.round(o.fee * 100)}% fee{o.left !== null ? ` · $${o.left} left today` : ""}</span>
            </span>
            <button
              className="btn btn-primary btn-xs"
              disabled={game.busy || !!o.block}
              title={o.block ?? ""}
              onClick={() => game.act({ type: "launder", method: o.id, amount: Number(amount) })}
            >
              Clean it
            </button>
          </li>
        ))}
        {bankers.map((bk) => (
          <li key={bk.id}>
            <span><b>{bk.name}&apos;s bank</b> <span className="muted">· {Math.round(bk.fee * 100)}% fee</span></span>
            <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={async () => { await game.social({ op: "launder_with", bankerId: bk.id, amount: Number(amount) }); }}>
              Clean it
            </button>
          </li>
        ))}
      </ul>
      <p className="fine muted">Big amounts ($500+) get noticed: detectives may follow the money.</p>
    </section>
    </>
  );
}

/** The street market and, for people who know chemistry, the lab. */
export function StreetMarket({ game }: { game: GameApi }) {
  const view = game.view!;
  const m = view.market;
  const [qty, setQty] = useState<Record<string, string>>({});
  const q = (id: string) => Number(qty[id] ?? "1");
  const knowsAny = m.drugs.some((d) => d.knowHow);
  return (
    <section className="card market">
      <h3 className="card-title"><Pill size={16} /> The street · {view.location.city}</h3>
      <p className="muted fine">
        Prices change every hour and from city to city. Dealers take dirty money or cash, and pay you in dirty money. Carrying drugs on a trip
        risks a search. You&apos;re carrying {m.carried}/{m.maxCarry}.
      </p>
      <table className="market-table">
        <thead>
          <tr><th></th><th>Buy</th><th>Sell</th><th>Have</th><th></th></tr>
        </thead>
        <tbody>
          {m.drugs.map((d) => (
            <tr key={d.id}>
              <td><b>{d.name}</b></td>
              <td>${d.buy}</td>
              <td>${d.sell}</td>
              <td>{d.have}</td>
              <td>
                <span className="row">
                  <input type="number" min={1} value={qty[d.id] ?? "1"} onChange={(e) => setQty({ ...qty, [d.id]: e.target.value })} aria-label={`${d.name} quantity`} />
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "drug_buy", drug: d.id, qty: q(d.id) })}>Buy</button>
                  <button className="btn btn-ghost btn-xs" disabled={game.busy || d.have < 1} onClick={() => game.act({ type: "drug_sell", drug: d.id, qty: Math.min(q(d.id), d.have) })}>Sell</button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="crime-label lab-title"><FlaskConical size={13} /> The lab</h4>
      {knowsAny ? (
        <>
          <p className="muted fine">You have {m.supplies} box{m.supplies === 1 ? "" : "es"} of lab supplies (${m.supplyPrice} each, clean cash).</p>
          <div className="row wrap">
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "buy_supplies", qty: 1 })}>Buy 1 box</button>
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "buy_supplies", qty: 5 })}>Buy 5</button>
          </div>
          <div className="row wrap">
            {m.drugs.filter((d) => d.knowHow).map((d) => (
              <button key={d.id} className="btn btn-primary btn-sm" disabled={game.busy || !!d.canCook} title={d.canCook ?? ""} onClick={() => game.act({ type: "cook", drug: d.id })}>
                Cook {d.name} ({d.supplies} box{d.supplies > 1 ? "es" : ""})
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="muted fine">You don&apos;t know enough chemistry to cook anything. Doctors do. So do very sharp minds.</p>
      )}
    </section>
  );
}

/** Your first day: a checklist with small rewards. */
export function TutorialCard({ game, go }: { game: GameApi; go: (t: string) => void }) {
  const steps = game.view!.tutorial;
  if (!steps) return null;
  const done = steps.filter((s) => s.claimed).length;
  return (
    <section className="card tutorial">
      <div className="row between">
        <h3 className="card-title"><ShieldAlert size={16} /> Your first day · {done}/{steps.length}</h3>
        <button className="btn btn-ghost btn-xs" onClick={() => game.act({ type: "flag", flag: "tut:hidden" })}>Hide</button>
      </div>
      <div className="tut-bar"><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ul className="tut-steps">
        {steps.map((s) => (
          <li key={s.id} className={s.claimed ? "claimed" : s.done ? "ready" : ""}>
            <span className="tut-check">{s.claimed ? "✓" : s.done ? "!" : "·"}</span>
            <span className="tut-text">
              <b>{s.title}</b>
              {!s.claimed && <span className="muted fine"> {s.hint}</span>}
            </span>
            {s.done && !s.claimed ? (
              <button className="btn btn-primary btn-xs" disabled={game.busy} onClick={() => game.act({ type: "tutorial", step: s.id })}>Claim $15</button>
            ) : !s.claimed ? (
              <button className="btn btn-ghost btn-xs" onClick={() => go(s.go)}>Show me</button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
