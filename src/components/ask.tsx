"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** A question the game asks before something it can't take back. Replaces the browser's confirm(). */
export type Ask = {
  title: string;
  body?: string;
  yes?: string;
  no?: string;
  /** "danger" paints the yes button red. */
  tone?: "danger" | "plain";
  /** A face to show (the person you're about to deal with). */
  photo?: string | null;
  /** A short line under the title, in words (never odds). */
  note?: string;
};

type Pending = Ask & { resolve: (ok: boolean) => void };

const EVENT = "injustice:ask";

/** Ask the player; resolves true when they say yes. */
export function ask(q: Ask | string): Promise<boolean> {
  const a: Ask = typeof q === "string" ? { title: q } : q;
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent<Pending>(EVENT, { detail: { ...a, resolve } })));
}

/** Ask, then run `then` only on yes. For onClick handlers. */
export function askThen(q: Ask | string, then: () => unknown) {
  void ask(q).then((ok) => {
    if (ok) then();
  });
}

/** Mount once, near the root. */
export function AskHost() {
  const [q, setQ] = useState<Pending | null>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const next = (e as CustomEvent<Pending>).detail;
      setQ((old) => {
        old?.resolve(false);
        return next;
      });
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const close = (ok: boolean) => {
    q?.resolve(ok);
    setQ(null);
  };
  useEffect(() => {
    if (!q) return;
    yesRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        q.resolve(false);
        setQ(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [q]);
  return (
    <AnimatePresence>
      {q && (
        <motion.div className="ask-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => close(false)}>
          <motion.div
            className={`ask ${q.tone === "danger" ? "danger" : ""}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ask-title"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {q.photo && <img className="ask-face" src={q.photo} alt="" />}
            <h2 id="ask-title">{q.title}</h2>
            {q.note && <span className="ask-note">{q.note}</span>}
            {q.body && <p>{q.body}</p>}
            <div className="ask-acts">
              <button className="btn btn-ghost" onClick={() => close(false)}>{q.no ?? "Not now"}</button>
              <button ref={yesRef} className={`btn ${q.tone === "danger" ? "btn-red" : "btn-primary"}`} onClick={() => close(true)}>{q.yes ?? "Yes"}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
