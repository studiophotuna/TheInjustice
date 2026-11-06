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

type Look = { frame: string | null; color: string | null; banner: string | null };
/** A look being tried on: what it is, and what pressing the main button does. */
type TryOn = { kind: CosmeticKind; value: string; title: string; fx?: boolean; label: string; disabled?: string | null; confirm: () => Promise<unknown> };

const bannerSrc = (b: string | null) => (!b ? "/scenes/street.jpg" : b.startsWith("data:") ? b : b.startsWith("u-") ? `/api/upload/${b.slice(2)}` : `/scenes/${b}.jpg`);

/** "Try it on": the look on your profile header, in chat and on your face, before you pay. */
function TryOnSheet({ game, t, close }: { game: GameApi; t: TryOn; close: () => void }) {
  const view = game.view!;
  const [busy, setBusy] = useState(false);
  const look: Look = { ...(view.look ?? { frame: null, color: null, banner: null }), [t.kind]: t.value };
  const nameCls = look.color ? `name-${look.color}` : "";
  return (
    <div className="tryon-backdrop" onClick={close} role="dialog" aria-modal="true" aria-label={`Try on ${t.title}`}>
      <div className="tryon" onClick={(e) => e.stopPropagation()}>
        <header className="tryon-head">
          <span className="kicker">Try it on</span>
          <b>{t.title}{t.fx && <span className="fx-tag">Animated</span>}</b>
        </header>
        <div className="tryon-me">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="tryon-banner" src={bannerSrc(look.banner)} alt="" />
          <div className="tryon-me-row">
            <PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} look={look} className="tryon-face" />
            <div className="tryon-who">
              <b className={`tryon-name ${nameCls}`}>{view.name}</b>
              <span>{view.path ? `${view.path.rank} · ${view.path.name}` : view.location.city}</span>
            </div>
          </div>
        </div>
        <div className="tryon-chat">
          <PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} look={look} className="cchat-avatar" />
          <div>
            <p className={`cchat-who ${nameCls}`}>{view.name} <time>now</time></p>
            <p className="cchat-body">Anyone seen the Commodore tonight?</p>
          </div>
        </div>
        <p className="fine muted tryon-note">This is how others see you on People, the map and in city chat.</p>
        {t.disabled && <p className="favors-soon">{t.disabled}</p>}
        <div className="tryon-acts">
          <button className="btn btn-ghost" onClick={close}>Close</button>
          <button
            className="btn btn-red"
            disabled={busy || game.busy || !!t.disabled}
            onClick={async () => {
              setBusy(true);
              try {
                await t.confirm();
                close();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "One moment…" : t.label}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StyleShop({ game }: { game: GameApi }) {
  const view = game.view!;
  const f = view.favors;
  const [kind, setKind] = useState<CosmeticKind>("frame");
  const [notice, setNotice] = useState(false);
  const [tryOn, setTryOn] = useState<TryOn | null>(null);
  const photo = view.profile.photo;
  const need = (price: number) => (f.balance < price ? `You need ${(price - f.balance).toLocaleString()} more Favors.` : null);
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
        {kind !== "color" && <OwnLook game={game} kind={kind} tryOn={setTryOn} need={need} />}
        {list.map((c) => {
          const owned = f.owned.includes(c.id);
          const on = f.equipped[c.kind] === c.id;
          const name = short(c.id);
          const open = () =>
            setTryOn({
              kind: c.kind,
              value: name!,
              title: c.name,
              fx: c.fx,
              label: owned ? (on ? "Wearing it" : "Wear it") : `Buy · ${c.price} Favors`,
              disabled: owned ? (on ? "You're already wearing this." : null) : need(c.price),
              confirm: () => (owned ? game.act({ type: "equip_cosmetic", kind: c.kind, id: c.id }) : game.act({ type: "buy_cosmetic", id: c.id })),
            });
          return (
            <article key={c.id} className={`style-item ${on ? "on" : ""}`}>
              <button className="style-preview" onClick={open} aria-label={`Try on ${c.name}`}>
                {c.kind === "banner" ? (
                  <img className="style-banner" src={`/scenes/${name}.jpg`} alt="" loading="lazy" />
                ) : c.kind === "frame" ? (
                  <PlayerAvatar name={view.name} path={view.path?.id} photo={photo} look={{ frame: name, color: null, banner: null }} className="style-face" />
                ) : (
                  <b className={`style-name name-${name}`}>{view.name}</b>
                )}
                <span className="try-hint">Try it on</span>
              </button>
              <div className="style-meta">
                <b>{c.name}{c.fx && <span className="fx-tag">Animated</span>}</b>
                {on ? (
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "equip_cosmetic", kind: c.kind, id: null })}>Take off</button>
                ) : owned ? (
                  <button className="btn btn-ghost btn-xs" disabled={game.busy} onClick={() => game.act({ type: "equip_cosmetic", kind: c.kind, id: c.id })}>Wear</button>
                ) : (
                  <button className="btn btn-red btn-xs" disabled={game.busy} onClick={open}>{c.price} Favors</button>
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
      {tryOn && <TryOnSheet game={game} t={tryOn} close={() => setTryOn(null)} />}
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
function OwnLook({ game, kind, tryOn, need }: { game: GameApi; kind: CustomKind; tryOn: (t: TryOn) => void; need: (price: number) => string | null }) {
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
        // See it on yourself first; nothing is paid or sent until you say so.
        tryOn({
          kind,
          value: data,
          title: kind === "frame" ? "Your own frame" : "Your own banner",
          label: `Send for approval · ${price} Favors`,
          disabled: need(price),
          confirm: async () => {
            const res = await fetch("/api/upload", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, data }) });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) setError(body.error ?? "That didn't upload.");
            await game.refresh();
          },
        });
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
          kind === "frame" ? (
            <span className="own-slot frame"><PlayerAvatar name={view.name} path={view.path?.id} photo={view.profile.photo} className="style-face" /><i /></span>
          ) : (
            <span className="own-slot banner"><span>Wide photo, 3 : 1</span></span>
          )
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
          <button className="btn btn-red btn-xs" disabled={busy || game.busy} onClick={pick}>
            {busy ? "Reading…" : `${own ? "New one" : "Choose an image"}`}
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
