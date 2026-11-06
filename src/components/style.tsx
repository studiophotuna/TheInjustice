"use client";

// Style: spend Favors on looks. Frames around your face, the colour of your name, the banner
// behind your profile. Each one previews on your own face before you buy it.

import { useState } from "react";
import { COSMETICS, CUSTOM, FAVORS, type CosmeticKind, type CustomKind } from "@/game/favors";
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

      <UploadRules kind={kind} />
      <div className={`style-grid kind-${kind}`}>
        {kind !== "color" && <OwnLook game={game} kind={kind} />}
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

/** Shrinks a picked image in the browser: frames to a 256px square PNG (keeping the see-through
 * middle), banners to a 1200×400 JPEG. */
async function shrinkFor(kind: CustomKind, file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = bad;
      i.src = url;
    });
    const [w, h] = kind === "frame" ? [256, 256] : [1200, 400];
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    const s = Math.max(w / img.width, h / img.height);
    g.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
    if (kind === "banner") return c.toDataURL("image/jpeg", 0.82);
    const png = c.toDataURL("image/png");
    return png.length <= CUSTOM.frame.maxChars ? png : c.toDataURL("image/webp", 0.9);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Your own frame or banner: upload, wait for approval, then wear it. */
function OwnLook({ game, kind }: { game: GameApi; kind: CustomKind }) {
  const view = game.view!;
  const own = view.favors.custom[kind];
  const price = CUSTOM[kind].price;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wearing = own && view.favors.equipped[kind] === `upload:${own.id}`;
  const pick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "frame" ? "image/png,image/webp" : "image/jpeg,image/png,image/webp";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return;
      setBusy(true);
      setError(null);
      try {
        const data = await shrinkFor(kind, f);
        const res = await fetch("/api/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, data }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) setError(body.error ?? "That didn't upload.");
        await game.refresh();
      } catch {
        setError("That image couldn't be read.");
      } finally {
        setBusy(false);
      }
    };
    input.click();
  };
  return (
    <article className={`style-item own ${wearing ? "on" : ""}`}>
      <div className="style-preview">
        {own ? (
          kind === "banner" ? (
            <img className="style-banner" src={`/api/upload/${own.id}`} alt="" />
          ) : (
            <PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} look={{ frame: `u-${own.id}`, color: null, banner: null }} className="style-face" />
          )
        ) : (
          <span className="own-empty">{kind === "frame" ? "Your own frame" : "Your own banner"}</span>
        )}
      </div>
      <div className="style-meta">
        <b>{own?.status === "pending" ? "Waiting for approval" : own?.status === "rejected" ? "Not approved" : own ? "Yours" : "Upload your own"}</b>
        {own?.status === "rejected" && own.reason && <span className="fine muted">{own.reason}. Favors refunded.</span>}
        {own?.status === "approved" && (
          wearing ? (
            <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "equip_cosmetic", kind, id: null })}>Take off</button>
          ) : (
            <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "equip_cosmetic", kind, id: `upload:${own.id}` })}>Wear</button>
          )
        )}
        {own?.status !== "pending" && (
          <button className="btn btn-red btn-xs" disabled={busy || game.busy || view.favors.balance < price} onClick={pick}>
            {busy ? "Uploading…" : `${own ? "New one" : "Upload"} · ${price} Favors`}
          </button>
        )}
        {error && <span className="form-error fine">{error}</span>}
      </div>
    </article>
  );
}

/** What's allowed, shown under the uploads. */
export function UploadRules({ kind }: { kind: CosmeticKind }) {
  if (kind === "color") return null;
  return (
    <p className="fine muted upload-rules">
      {kind === "frame" ? "Frames: a PNG with a see-through middle, shown around your face." : "Banners: a wide photo, shown behind your profile."}{" "}
      A moderator checks every upload before anyone else sees it. No nudity, hate, real people without their consent, or art from other games. Not approved? Your Favors come back.
    </p>
  );
}
