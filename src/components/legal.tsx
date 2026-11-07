"use client";
// Help, rules and the legal pages, plus deleting your account. All plain words.
import { useState } from "react";

/** Links to the guide, the rules and the legal pages. */
export function HelpLinks() {
  return (
    <section className="card">
      <h3 className="card-title">Help and rules</h3>
      <nav className="help-links">
        <a href="/guide">How to play</a>
        <a href="/rules">Player rules</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
      </nav>
    </section>
  );
}

/** Deletes the character and its login for good, after a confirmation. */
export function DeleteAccount({ hasAccount }: { hasAccount: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(hasAccount ? { op: "delete_account", password: value } : { op: "delete_account", confirm: value.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Something went wrong.");
      try {
        localStorage.clear();
      } catch {}
      window.location.href = "/";
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  if (!open) {
    return (
      <button className="btn btn-ghost btn-sm delete-open" onClick={() => setOpen(true)}>
        Delete my account
      </button>
    );
  }
  return (
    <div className="delete-box">
      <p className="fine">
        This deletes your character, {hasAccount ? "your login, " : ""}your chat messages and your uploads for good. It can&apos;t be undone, and
        Favors you bought are lost. If you&apos;re in a crew, leave it first.
      </p>
      <input
        className="input"
        type={hasAccount ? "password" : "text"}
        autoComplete={hasAccount ? "current-password" : "off"}
        placeholder={hasAccount ? "Your password" : "Type DELETE"}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {error && <p className="fine text-red">{error}</p>}
      <div className="row">
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setOpen(false)}>Keep my account</button>
        <button className="btn btn-red btn-sm" disabled={busy || !value} onClick={go}>Delete for good</button>
      </div>
    </div>
  );
}
