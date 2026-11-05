"use client";

import { useState } from "react";
import { EyeOff, Home } from "lucide-react";
import type { GameApi } from "./useGame";

const money = (n: number) => `$${n.toLocaleString()}`;

/** Your place: what's hidden here, and what's still in your pockets. */
export function StashCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const s = view.stash;
  const [amount, setAmount] = useState("");
  const amt = amount ? Number(amount) : undefined;
  const act = (op: "put" | "take", what: string, a = amt) => game.act({ type: "stash", op, what: what as "cash", amount: a }).then(() => setAmount(""));
  const moneyUsed = s.cash + s.dirty;
  const onYou = view.dirty > 0 || s.drugs.some((d) => d.onYou > 0);

  if (!s.spot) {
    return (
      <section className="card stash">
        <h3 className="card-title"><Home size={16} /> {s.home}</h3>
        <p className="muted">
          A box hides nothing. Muggers, robbers and customs take whatever is in your pockets, and dirty money can&apos;t go in a bank.
          Get any kind of place (the Shop sells them) and you&apos;ll have somewhere to hide things.
        </p>
        <button className="btn btn-ghost btn-sm" onClick={() => window.dispatchEvent(new CustomEvent("injustice:go", { detail: "tab:shop" }))}>
          See places to live
        </button>
      </section>
    );
  }

  return (
    <section className="card stash">
      <h3 className="card-title"><EyeOff size={16} /> The stash · {s.home}</h3>
      <p className="muted fine">
        Hidden {s.spot}. Muggers, robbers and customs only get what&apos;s on you. A detective with a warrant and the right suspect will find dirty money and product here.
      </p>

      <div className="stash-meters">
        <div>
          <span className="crime-label">Money</span>
          <div className="wear-bar"><span style={{ width: `${Math.min(100, (moneyUsed / Math.max(1, s.caps.money)) * 100)}%` }} /></div>
          <span className="fine">{money(moneyUsed)} of {money(s.caps.money)}</span>
        </div>
        <div>
          <span className="crime-label">Product</span>
          <div className="wear-bar"><span style={{ width: `${Math.min(100, (s.units / Math.max(1, s.caps.units)) * 100)}%` }} /></div>
          <span className="fine">{s.units} of {s.caps.units} units</span>
        </div>
      </div>

      {onYou && (
        <button className="btn btn-primary btn-sm stash-all" disabled={game.busy} onClick={() => game.act({ type: "stash", op: "put_all" })}>
          Hide everything risky
        </button>
      )}

      <input className="stash-amount" inputMode="numeric" placeholder="Amount (empty = all)" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
      <ul className="officials stash-rows">
        <li>
          <span><b>Cash</b> <span className="muted">· {money(view.cash)} on you · {money(s.cash)} hidden</span></span>
          <span className="row">
            <button className="btn btn-ghost btn-xs" disabled={game.busy || view.cash < 1} onClick={() => act("put", "cash")}>Hide</button>
            <button className="btn btn-ghost btn-xs" disabled={game.busy || s.cash < 1} onClick={() => act("take", "cash")}>Take</button>
          </span>
        </li>
        <li>
          <span><b>Dirty money</b> <span className="muted">· {money(view.dirty)} on you · {money(s.dirty)} hidden</span></span>
          <span className="row">
            <button className="btn btn-ghost btn-xs" disabled={game.busy || view.dirty < 1} onClick={() => act("put", "dirty")}>Hide</button>
            <button className="btn btn-ghost btn-xs" disabled={game.busy || s.dirty < 1} onClick={() => act("take", "dirty")}>Take</button>
          </span>
        </li>
        {s.drugs.map((d) => (
          <li key={d.id}>
            <span><b>{d.name}</b> <span className="muted">· {d.onYou} on you · {d.stashed} hidden</span></span>
            <span className="row">
              <button className="btn btn-ghost btn-xs" disabled={game.busy || d.onYou < 1} onClick={() => act("put", d.id)}>Hide</button>
              <button className="btn btn-ghost btn-xs" disabled={game.busy || d.stashed < 1} onClick={() => act("take", d.id)}>Take</button>
            </span>
          </li>
        ))}
      </ul>
      {s.nextSpot && (
        <p className="fine muted">A {s.nextSpot.home.toLowerCase()} would hide {money(s.nextSpot.money)} and {s.nextSpot.units} units.</p>
      )}
      {s.elsewhere.length > 0 && (
        <p className="fine muted">
          Also hidden: {s.elsewhere.map((e) => `${e.city} (${money(e.money)}${e.units ? `, ${e.units} units` : ""})`).join(" · ")}. You have to be there to get it.
        </p>
      )}
    </section>
  );
}
