"use client";
// The Favors exchange: buy Favors from other players with bank money, or list your own.
import { useCallback, useEffect, useState } from "react";
import type { exchangeView } from "@/game/exchange";
import type { GameApi } from "./useGame";

type View = ReturnType<typeof exchangeView>;

const each = (price: number, favors: number) => `$${(price / favors).toLocaleString(undefined, { maximumFractionDigits: 2 })} each`;

export function Exchange({ game }: { game: GameApi }) {
  const [data, setData] = useState<View | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [favors, setFavors] = useState("100");
  const [price, setPrice] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/exchange", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setData(body);
    else setError(body.error ?? "Couldn't load the exchange.");
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const send = async (payload: object) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/exchange", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setData(body.exchange);
      if (body.events?.length) game.pushToasts(body.events);
      await game.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const f = Number(favors);
  const p = Number(price);
  const fee = Number.isFinite(p) && p > 0 ? Math.ceil(p * (data?.rules.fee ?? 0.1)) : 0;

  return (
    <section className="card exchange">
      <h3 className="card-title">Favors exchange</h3>
      <p className="fine muted">
        Players sell Favors to each other for cash from the bank. The exchange keeps 10% of each sale. Gifts, free rewards and Favors bought in the last week can be
        spent but not sold.
      </p>
      {!data && !error && <p className="muted">Loading…</p>}
      {data?.block && <p className="exchange-block">{data.block}</p>}
      {error && <p className="fine text-red">{error}</p>}
      {data && (
        <>
          <h4>For sale</h4>
          {data.orders.length === 0 && <p className="muted fine">Nobody is selling right now.</p>}
          <ul className="exchange-list">
            {data.orders.map((o) => (
              <li key={o.id}>
                <div>
                  <b>{o.favors.toLocaleString()} Favors</b>
                  <span className="fine muted">{o.seller} · {each(o.price, o.favors)}</span>
                </div>
                <button className="btn btn-red btn-xs" disabled={busy || !!data.block || data.bank < o.price || o.favors > data.boughtLeft} onClick={() => send({ op: "buy", orderId: o.id })}>
                  ${o.price.toLocaleString()}
                </button>
              </li>
            ))}
          </ul>

          {!data.block && (
            <>
              <h4>Sell yours</h4>
              <p className="fine muted">
                You can sell {data.sellable.toLocaleString()} Favors now · {data.soldLeft.toLocaleString()} left to sell this week.
              </p>
              <div className="exchange-form">
                <label>
                  <span className="fine muted">Favors</span>
                  <input inputMode="numeric" value={favors} onChange={(e) => setFavors(e.target.value.replace(/\D/g, ""))} />
                </label>
                <label>
                  <span className="fine muted">Asking (cash)</span>
                  <input inputMode="numeric" value={price} placeholder="$" onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))} />
                </label>
                <button className="btn btn-primary btn-sm" disabled={busy || !f || !p} onClick={() => send({ op: "sell", favors: f, price: p })}>List</button>
              </div>
              {f > 0 && p > 0 && <p className="fine muted">{each(p, f)} · you get ${(p - fee).toLocaleString()} after the fee.</p>}
            </>
          )}

          {data.mine.length > 0 && (
            <>
              <h4>Your orders</h4>
              <ul className="exchange-list">
                {data.mine.map((o) => (
                  <li key={o.id}>
                    <div>
                      <b>{o.selling ? "Selling" : "Bought"} {o.favors.toLocaleString()} Favors · ${o.price.toLocaleString()}</b>
                      <span className="fine muted">
                        {o.status === "open" ? "Waiting for a buyer" : o.status === "filled" ? (o.selling ? `Sold${o.other ? ` to ${o.other}` : ""}` : `From ${o.other}`) : "Cancelled"}
                      </span>
                    </div>
                    {o.status === "open" && o.selling && (
                      <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => send({ op: "cancel", orderId: o.id })}>Cancel</button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}
