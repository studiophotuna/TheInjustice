"use client";
// Phone alerts: sign this browser up so the server can buzz it while the game is closed, and pick
// which kinds of alert you want.
import { useEffect, useState } from "react";
import { PUSH_KINDS } from "@/game/push";
import type { GameApi } from "./useGame";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function post(body: object): Promise<{ ok?: boolean; off?: string[]; error?: string }> {
  const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json().catch(() => ({ error: "Something went wrong." }));
}

export function AlertsCard({ game }: { game: GameApi }) {
  const view = game.view!;
  const [state, setState] = useState<"checking" | "unsupported" | "blocked" | "off" | "on" | "notyet">("checking");
  const [off, setOff] = useState<string[]>(view.pushOff ?? []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!KEY) return setState("notyet");
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) return setState("unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub && Notification.permission === "granted" ? "on" : "off");
      // Keep the server's copy fresh (phones rotate these now and then).
      if (sub) post({ op: "subscribe", sub: sub.toJSON() }).catch(() => undefined);
    })().catch(() => setState("unsupported"));
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "blocked" : "off");
        return;
      }
      const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY) }));
      const r = await post({ op: "subscribe", sub: sub.toJSON() });
      if (r.error) throw new Error(r.error);
      setState("on");
    } catch (e) {
      setError((e as Error).message || "Couldn't turn alerts on here.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await post({ op: "unsubscribe", endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (id: string) => {
    const next = off.includes(id) ? off.filter((x) => x !== id) : [...off, id];
    setOff(next);
    const r = await post({ op: "prefs", off: next });
    if (r.off) setOff(r.off);
  };

  return (
    <section className="card">
      <h3 className="card-title">Alerts</h3>
      {state === "checking" && <p className="muted">Checking…</p>}
      {state === "notyet" && <p className="muted">Phone alerts are coming soon.</p>}
      {state === "unsupported" && <p className="muted">Not supported here. On iPhone, add the game to your Home Screen first, then open it from there.</p>}
      {state === "blocked" && <p className="muted">Alerts are blocked for this site. Allow notifications in your browser settings, then come back.</p>}
      {state === "off" && (
        <>
          <p className="muted">Get a buzz on your phone when your energy is full, you&apos;re out of the clinic or jail, or someone comes after you. Even with the game closed.</p>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={turnOn}>Turn on alerts</button>
        </>
      )}
      {state === "on" && (
        <>
          <ul className="alert-kinds">
            {PUSH_KINDS.map((k) => (
              <li key={k.id}>
                <label>
                  <input type="checkbox" checked={!off.includes(k.id)} onChange={() => toggle(k.id)} />
                  {k.label}
                </label>
              </li>
            ))}
          </ul>
          <button className="btn btn-ghost btn-sm" disabled={busy} onClick={turnOff}>Turn off on this device</button>
        </>
      )}
      {error && <p className="fine text-red">{error}</p>}
    </section>
  );
}
