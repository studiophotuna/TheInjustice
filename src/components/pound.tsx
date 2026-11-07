"use client";

import { useState } from "react";
import { useShops } from "./shops";
import type { GameApi } from "./useGame";

/** The city pound: run by city hall, stocked by luck, never for sale and never a target. */
export function Pound({ game }: { game: GameApi }) {
  const view = game.view!;
  const { data, load } = useShops();
  const { dog, breeds } = view.dog;
  const [name, setName] = useState("");
  const housed = !!view.stash.spot;
  const hasDog = !!dog && dog.state !== "gone";
  const blocked = !housed ? "You need a place to live before you can take a dog home." : hasDog ? `${dog!.name} is already guarding your place here.` : "";

  return (
    <section className="card dog-card">
      <h3 className="card-title">Dogs waiting for a home</h3>
      {blocked ? <p className="fine muted">{blocked}</p> : <input className="stash-amount" placeholder="Name your dog" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} />}
      <ul className="dog-list">
        {breeds.map((b) => {
          const left = data?.pound?.[b.id] ?? null;
          const out = left === 0;
          return (
            <li key={b.id}>
              <img className="dog-photo" src={`/dogs/${b.id}.jpg`} alt="" loading="lazy" />
              <span className="dog-info">
                <b>{b.name}</b>
                <span className="muted fine">{b.blurb} Food ${b.food} every three days.</span>
                {left !== null && <span className={`fine stock-note ${out ? "out" : ""}`}>In kennels: {left}{out ? " · more come in every few hours" : ""}</span>}
              </span>
              <button
                className="btn btn-ghost btn-xs"
                disabled={game.busy || !!blocked || out || !name.trim() || view.cash < b.price}
                title={blocked || (out ? "None left right now." : !name.trim() ? "Give your dog a name first." : view.cash < b.price ? "Cash only." : "")}
                onClick={async () => {
                  await game.act({ type: "dog_buy", breed: b.id as "mutt", name });
                  setName("");
                  load();
                }}
              >
                ${b.price.toLocaleString()}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
