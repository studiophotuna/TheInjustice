"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

/** A question the game asks before something it can't take back. Replaces the browser's confirm() and prompt(). */
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
  /** Ask for an amount instead of a yes or no. */
  input?: { value: number; min?: number; max?: number; unit?: "$" | "%"; label?: string };
};

type Pending = Ask & { resolve: (answer: number | boolean | null) => void };

const EVENT = "injustice:ask";

function send(a: Ask): Promise<number | boolean | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => window.dispatchEvent(new CustomEvent<Pending>(EVENT, { detail: { ...a, resolve } })));
}

/** Ask the player; resolves true when they say yes. */
export async function ask(q: Ask | string): Promise<boolean> {
  const a: Ask = typeof q === "string" ? { title: q } : q;
  return (await send({ ...a, input: undefined })) === true;
}

/** Ask, then run `then` only on yes. For onClick handlers. */
export function askThen(q: Ask | string, then: () => unknown) {
  void ask(q).then((ok) => {
    if (ok) then();
  });
}

/** Ask for an amount; resolves the number, or null if they back off. */
export async function askNumber(q: Ask & { input: NonNullable<Ask["input"]> }): Promise<number | null> {
  const r = await send(q);
  return typeof r === "number" ? r : null;
}

/** Ask for an amount, then run `then` with it. For onClick handlers. */
export function askNumberThen(q: Ask & { input: NonNullable<Ask["input"]> }, then: (n: number) => unknown) {
  void askNumber(q).then((n) => {
    if (n !== null) then(n);
  });
}

/** Mount once, near the root. */
export function AskHost() {
  const [q, setQ] = useState<Pending | null>(null);
  const [text, setText] = useState("");
  const yesRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const on = (e: Event) => {
      const next = (e as CustomEvent<Pending>).detail;
      setText(next.input ? String(next.input.value) : "");
      setQ((old) => {
        old?.resolve(null);
        return next;
      });
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  const n = Number(text);
  const range = q?.input;
  const bad = !!range && (text.trim() === "" || !Number.isFinite(n) || (range.min !== undefined && n < range.min) || (range.max !== undefined && n > range.max));
  const close = (ok: boolean) => {
    if (!q) return;
    if (ok && q.input) {
      if (bad) return;
      q.resolve(n);
    } else q.resolve(ok && !q.input ? true : null);
    setQ(null);
  };
  useEffect(() => {
    if (!q) return;
    if (q.input) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else yesRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        q.resolve(null);
        setQ(null);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [q]);
  const hint = range
    ? range.min !== undefined && range.max !== undefined
      ? `${range.unit === "$" ? "$" : ""}${range.min.toLocaleString()}${range.unit === "%" ? "%" : ""} to ${range.unit === "$" ? "$" : ""}${range.max.toLocaleString()}${range.unit === "%" ? "%" : ""}`
      : range.min !== undefined
        ? `${range.unit === "$" ? "$" : ""}${range.min.toLocaleString()}${range.unit === "%" ? "%" : ""} or more`
        : null
    : null;
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
            {range && (
              <form
                className="ask-amount"
                onSubmit={(e) => {
                  e.preventDefault();
                  close(true);
                }}
              >
                <label>
                  <span className="ask-unit" aria-hidden>{range.unit === "%" ? "%" : "$"}</span>
                  <input
                    ref={inputRef}
                    inputMode="numeric"
                    value={text}
                    onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ""))}
                    aria-label={range.label ?? "Amount"}
                    aria-invalid={bad}
                  />
                </label>
                {hint && <span className={`ask-hint ${bad && text ? "bad" : ""}`}>{hint}</span>}
              </form>
            )}
            <div className="ask-acts">
              <button className="btn btn-ghost" onClick={() => close(false)}>{q.no ?? "Not now"}</button>
              <button ref={yesRef} className={`btn ${q.tone === "danger" ? "btn-red" : "btn-primary"}`} disabled={!!range && bad} onClick={() => close(true)}>{q.yes ?? (range ? "Done" : "Yes")}</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
