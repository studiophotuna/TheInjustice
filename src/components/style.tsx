"use client";

// Style: spend Favors on looks. Frames around your face, the colour of your name, the banner
// behind your profile. Each one previews on your own face before you buy it.

import { useState } from "react";
import { COSMETICS, FAVORS, type CosmeticKind } from "@/game/favors";
import { PlayerAvatar } from "./art/Portraits";
import type { GameApi } from "./useGame";

/** Whether Favors can be bought yet (set once a payment provider is connected). */
const STORE_OPEN = process.env.NEXT_PUBLIC_FAVORS_STORE === "open";

const KINDS: { id: CosmeticKind; label: string }[] = [
  { id: "frame", label: "Frames" },
  { id: "color", label: "Name colours" },
  { id: "banner", label: "Banners" },
];

const short = (id: string | null) => (id ? id.split(":")[1] : null);

export function StyleShop({ game }: { game: GameApi }) {
  const view = game.view!;
  const f = view.favors;
  const [kind, setKind] = useState<CosmeticKind>("frame");
  const [notice, setNotice] = useState(false);
  const photo = view.profile.photo;
  const list = COSMETICS.filter((c) => c.kind === kind);
  return (
    <div className="stack style-shop">
      <section className="favors-head">
        <div>
          <span className="kicker">Your Favors</span>
          <b className="favors-balance">{f.balance.toLocaleString()}</b>
        </div>
        <p className="fine muted">Favors buy looks, never power.</p>
      </section>

      <section className="favor-packs" aria-label="Get Favors">
        {FAVORS.packs.map((p) => (
          <button key={p.id} className="favor-pack" onClick={() => setNotice(true)} disabled={!STORE_OPEN && notice}>
            <b>{p.favors.toLocaleString()}</b>
            <span>Favors</span>
            {"bonus" in p && p.bonus && <i>{p.bonus}</i>}
            <em>{p.price}</em>
          </button>
        ))}
      </section>
      {notice && !STORE_OPEN && <p className="favors-soon">The Favors store opens soon. Everything here can already be previewed.</p>}

      <div className="segmented style-kinds" role="tablist">
        {KINDS.map((k) => (
          <button key={k.id} role="tab" aria-selected={kind === k.id} className={kind === k.id ? "on" : ""} onClick={() => setKind(k.id)}>{k.label}</button>
        ))}
      </div>

      <div className={`style-grid kind-${kind}`}>
        {list.map((c) => {
          const owned = f.owned.includes(c.id);
          const on = f.equipped[c.kind] === c.id;
          const name = short(c.id);
          return (
            <article key={c.id} className={`style-item ${on ? "on" : ""}`}>
              <div className="style-preview">
                {c.kind === "banner" ? (
                  <img className="style-banner" src={`/scenes/${name}.jpg`} alt="" loading="lazy" />
                ) : c.kind === "frame" ? (
                  <PlayerAvatar name={view.name} path={view.path?.id} photo={photo} look={{ frame: name, color: null, banner: null }} className="style-face" />
                ) : (
                  <b className={`style-name name-${name}`}>{view.name}</b>
                )}
              </div>
              <div className="style-meta">
                <b>{c.name}</b>
                {on ? (
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "equip_cosmetic", kind: c.kind, id: null })}>Take off</button>
                ) : owned ? (
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "equip_cosmetic", kind: c.kind, id: c.id })}>Wear</button>
                ) : (
                  <button className="btn btn-red btn-xs" disabled={game.busy || f.balance < c.price} onClick={() => game.act({ type: "buy_cosmetic", id: c.id })}>{c.price} Favors</button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {f.log.length > 0 && (
        <section className="card">
          <h3 className="card-title">Favors history</h3>
          <ul className="stmt">
            {f.log.map((l, i) => (
              <li key={i}>
                <div className="stmt-what"><b>{l.what}</b><time>{new Date(l.at).toLocaleDateString()}</time></div>
                <div className="stmt-amts"><span className={l.delta > 0 ? "up" : "down"}>{l.delta > 0 ? "+" : ""}{l.delta}</span></div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
