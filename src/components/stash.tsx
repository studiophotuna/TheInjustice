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
        Hidden {s.spot}. Muggers, robbers and customs only get what&apos;s on you. Burglars and a detective with a warrant are another story.
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

      <input className="stash-amount" inputMode="numeric" placeholder="Amount" title="Leave it blank to move all of it" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
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
      <div className="alarm-row">
        {s.alarm ? (
          <p className="fine">Alarm wired, camera over the door. Break-ins here are harder, and if one happens the camera gives the police a good look.</p>
        ) : (
          <>
            <p className="fine muted">Other people can break in while you&apos;re out. An alarm makes it harder, and its camera helps the police.</p>
            <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => game.act({ type: "fit_alarm" })}>
              Fit an alarm · {money(s.alarmCost)}
            </button>
          </>
        )}
      </div>
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

/** Your Place: a guard dog. */
export function DogCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const { dog, breeds } = view.dog;
  const [name, setName] = useState("");
  if (!view.stash.spot) return null;
  if (dog && dog.state !== "gone") {
    const hungry = dog.state === "hungry";
    return (
      <section className="card dog-card">
        <div className="dog-head">
          <img className="dog-photo" src={`/dogs/${dog.breedId}.jpg`} alt="" />
          <h3 className="card-title">{dog.name} · {dog.breed}</h3>
        </div>
        <p className={`fine ${hungry ? "text-red" : "muted"}`}>
          {hungry
            ? `${dog.name} is hungry and guarding half as well. Feed them before ${new Date(dog.leavesAt).toLocaleDateString()} or they'll find a new home.`
            : `Fed until ${new Date(dog.fedUntil).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}. Burglars can hear ${dog.name} through the door, and ${dog.name} will let you know if anyone tries it.`}
        </p>
        <div className="row wrap">
          <button className={`btn btn-sm ${hungry ? "btn-primary" : "btn-ghost"}`} disabled={game.busy || !dog.canFeed} title={dog.canFeed ? "" : `${dog.name} is still full.`} onClick={() => game.act({ type: "dog_feed" })}>
            Feed {dog.name} · ${dog.foodCost}
          </button>
          <button className="btn btn-ghost btn-sm" disabled={game.busy} onClick={() => confirm(`Give ${dog.name} away to a good home?`) && game.act({ type: "dog_give_away" })}>
            Give away
          </button>
        </div>
      </section>
    );
  }
  return (
    <section className="card dog-card">
      <h3 className="card-title">A dog for the door</h3>
      <p className="muted fine">
        A dog makes break-ins harder, barks when someone tries the door, and lets you know about it. It needs feeding every three days: a hungry dog guards
        half as well, and one left alone for a week finds a new home.
      </p>
      <p className="fine">Get one at the pound. Every city's pound has different breeds.</p>
    </section>
  );
}
