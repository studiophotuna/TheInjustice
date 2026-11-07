"use client";

// Moderation page: open reports, recent decisions, possible alt accounts, and who is muted or
// suspended. Only accounts in ADMIN_USERNAMES can load it.

import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/screens";
import type { Report } from "@/game/types";

type Data = {
  open: Report[];
  closed: Report[];
  alts: { ids: string[]; names: string[]; device: boolean }[];
  restricted: { id: string; name: string; bannedUntil: number | null; mutedUntil: number | null; reason: string | null }[];
  people?: { id: string; name: string; favors: number }[];
  uploads?: { id: string; kind: "frame" | "banner"; playerId: string; playerName: string; at: number; cost: number }[];
  errors?: { id: number; at: number; source: "client" | "server"; message: string; place: string; stack: string; version: string }[];
};

/** Crashes, grouped by message so a flood shows as one line with a count. */
function Crashes({ data }: { data: Data }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = new Map<string, NonNullable<Data["errors"]>>();
  for (const e of data.errors ?? []) {
    const k = `${e.source}|${e.message}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  return (
    <section className="card">
      <h3 className="card-title">Crashes · last 30 days</h3>
      {groups.size === 0 && <p className="muted">No crashes reported.</p>}
      {[...groups.entries()].map(([k, list]) => {
        const e = list[0];
        return (
          <article key={k} className="admin-report">
            <button className="row between crash-row" onClick={() => setOpen(open === k ? null : k)}>
              <b>{e.message}</b>
              <span className="fine muted">{e.source} · {e.place} · v{e.version} · {when(e.at)}{list.length > 1 ? ` · ${list.length}×` : ""}</span>
            </button>
            {open === k && e.stack && <pre className="crash-stack">{e.stack}</pre>}
          </article>
        );
      })}
    </section>
  );
}

/** Uploaded frames and banners: nobody else sees one until it's approved here. */
function UploadQueue({ data, busy, act }: { data: Data; busy: boolean; act: (p: Record<string, unknown>) => Promise<void> }) {
  const list = data.uploads ?? [];
  return (
    <section className="card">
      <h3 className="card-title">Uploads to review · {list.length}</h3>
      {list.length === 0 && <p className="muted">Nothing waiting.</p>}
      <div className="admin-uploads">
        {list.map((u) => (
          <article key={u.id} className={`admin-upload kind-${u.kind}`}>
            <div className="admin-upload-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/upload/${u.id}`} alt="" />
            </div>
            <div>
              <b>{u.playerName}</b> <span className="fine muted">· {u.kind} · {when(u.at)} · paid {u.cost} Favors</span>
              <div className="row wrap">
                <button className="btn btn-primary btn-xs" disabled={busy} onClick={() => act({ action: "approve_upload", uploadId: u.id })}>Approve</button>
                <button
                  className="btn btn-danger btn-xs"
                  disabled={busy}
                  onClick={() => {
                    const reason = prompt("Why? The player sees this, and gets their Favors back.", "Breaks the image rules");
                    if (reason !== null) act({ action: "reject_upload", uploadId: u.id, reason });
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/** Grant Favors to a player by name: for testing the Style shop and for support cases. */
function GrantFavors({ data, busy, act }: { data: Data; busy: boolean; act: (p: Record<string, unknown>) => Promise<void> }) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("500");
  const [reason, setReason] = useState("");
  const who = data.people?.find((p) => p.name.toLowerCase() === name.trim().toLowerCase());
  return (
    <section className="card">
      <h3 className="card-title">Grant Favors</h3>
      <div className="row wrap">
        <input list="admin-people" placeholder="Player name" value={name} onChange={(e) => setName(e.target.value)} />
        <datalist id="admin-people">{data.people?.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        <input inputMode="numeric" style={{ width: 90 }} value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} />
        <input placeholder="Reason (shown in their history)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button className="btn btn-primary btn-sm" disabled={busy || !who || !Number(amount)} onClick={() => act({ action: "grant_favors", targetId: who!.id, amount: Number(amount), reason })}>Grant</button>
      </div>
      {who && <p className="fine muted">{who.name} has {who.favors.toLocaleString()} Favors.</p>}
    </section>
  );
}

const when = (t: number) => new Date(t).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function AdminPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error ?? "Couldn't load.");
    else {
      setError(null);
      setData(body);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await res.json().catch(() => ({}));
      setNote(res.ok ? `Done: ${body.line}.` : body.error ?? "Failed.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="admin">
      <header className="row between admin-head">
        <Logo small />
        <a className="btn btn-ghost btn-sm" href="/">Back to the game</a>
      </header>
      <h2>Moderation</h2>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="fine">{note}</p>}
      {!data && !error && <p className="muted">Loading…</p>}
      {data && (
        <>
          <UploadQueue data={data} busy={busy} act={act} />
          <GrantFavors data={data} busy={busy} act={act} />
          <Crashes data={data} />
          <section className="card">
            <h3 className="card-title">Open reports · {data.open.length}</h3>
            {data.open.length === 0 && <p className="muted">Nothing to review.</p>}
            {data.open.map((r) => (
              <article key={r.id} className="admin-report">
                <div className="row between">
                  <b>{r.targetName}</b>
                  <span className="fine muted">#{r.id} · {when(r.at)} · by {r.reporterName}</span>
                </div>
                <p><span className="chip chip-red">{r.reason}</span> {r.kind === "message" && <span className="chip">chat · {r.channel}</span>}</p>
                <div className="row admin-evidence">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.photo && <img src={r.photo} alt="" className="admin-photo" />}
                  {r.excerpt ? <blockquote>“{r.excerpt}”</blockquote> : <span className="muted fine">No text.</span>}
                </div>
                <div className="row wrap">
                  <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => act({ action: "dismiss", reportId: r.id })}>Dismiss</button>
                  {r.kind === "message" && r.messageId !== undefined && (
                    <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => act({ action: "delete_message", reportId: r.id, messageId: r.messageId })}>Delete message</button>
                  )}
                  <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => act({ action: "remove_photo", reportId: r.id, targetId: r.targetId })}>Remove photo</button>
                  <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => act({ action: "clear_bio", reportId: r.id, targetId: r.targetId })}>Clear intro</button>
                  <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => act({ action: "mute", reportId: r.id, targetId: r.targetId, hours: 24 })}>Mute 24h</button>
                  <button className="btn btn-danger btn-xs" disabled={busy} onClick={() => act({ action: "ban", reportId: r.id, targetId: r.targetId, hours: 24 * 7, reason: r.reason })}>Suspend 7 days</button>
                  <button
                    className="btn btn-danger btn-xs"
                    disabled={busy}
                    onClick={() => confirm(`Suspend ${r.targetName} permanently?`) && act({ action: "ban", reportId: r.id, targetId: r.targetId, hours: 0, reason: r.reason })}
                  >
                    Suspend for good
                  </button>
                </div>
              </article>
            ))}
          </section>

          <section className="card">
            <h3 className="card-title">Possible alt accounts · {data.alts.length}</h3>
            <p className="muted fine">
              <b>Same device</b> characters already can&apos;t trade, fight, lend, vouch, launder, sell guns to each other or vote twice.{" "}
              <b>Same network</b> only means a shared IP address (a household, a café): look before acting.
            </p>
            {data.alts.length === 0 && <p className="muted">None found.</p>}
            <ul className="officials">
              {data.alts.map((g) => (
                <li key={g.ids.join()}>
                  <span>{g.names.join(", ")}</span>
                  <span className={`chip ${g.device ? "chip-red" : ""}`}>{g.device ? "same device" : "same network"}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3 className="card-title">Muted and suspended · {data.restricted.length}</h3>
            {data.restricted.length === 0 && <p className="muted">Nobody.</p>}
            <ul className="officials">
              {data.restricted.map((p) => (
                <li key={p.id}>
                  <span>
                    <b>{p.name}</b>{" "}
                    <span className="muted fine">
                      {p.bannedUntil ? `suspended until ${when(p.bannedUntil)}` : `muted until ${when(p.mutedUntil!)}`}
                      {p.reason ? ` · ${p.reason}` : ""}
                    </span>
                  </span>
                  <button className="btn btn-ghost btn-xs" disabled={busy} onClick={() => act({ action: "unban", targetId: p.id })}>Lift</button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card">
            <h3 className="card-title">Recent decisions</h3>
            {data.closed.length === 0 && <p className="muted">None yet.</p>}
            <ul className="officials">
              {data.closed.map((r) => (
                <li key={r.id}>
                  <span>#{r.id} {r.targetName} · {r.reason}</span>
                  <span className="fine muted">{r.action} · {r.resolvedBy}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
