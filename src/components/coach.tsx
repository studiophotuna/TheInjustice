"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const KEY = "cns_coach";

type Mark = {
  /** First visible match wins (phone and desktop show different chrome); a target can rename the mark. */
  targets: (string | { sel: string; title: string; text?: string })[];
  title: string;
  text: string;
};

const selOf = (t: Mark["targets"][number]) => (typeof t === "string" ? t : t.sel);

/** A first look around, one thing at a time. Each says what it is, once. */
const MARKS: Mark[] = [
  { targets: [".hud-vitals"], title: "Health, energy, cash", text: "Energy fills up by itself. Work, fights and the gym spend it." },
  { targets: [".case-hero"], title: "Your case", text: "Someone framed you. Here is who, what you can prove, and your next lead." },
  { targets: [".dayone"], title: "Your first day", text: "Ten small things that teach you the city. Each one pays." },
  {
    targets: [".bottomnav [data-tab=jobs]", { sel: ".sidenav [data-tab=jobs]", title: "Jobs", text: "Jobs pay, and they make you stronger without telling you how much. Fights and the gym are just below." }],
    title: "Work",
    text: "Jobs pay, and they make you stronger without telling you how much. Fights and the gym are here too.",
  },
  { targets: [".quickbar"], title: "One tap, any screen", text: "Your last job, the gym, food and medical. The small arrow above each one changes it." },
];

function visible(sel: string): HTMLElement | null {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0" ? el : null;
}

/** The first of a mark's targets that's on screen, with the words for it. */
function found(i: number): { el: HTMLElement; title?: string; text?: string } | null {
  const m = MARKS[i];
  if (!m) return null;
  for (const t of m.targets) {
    const el = visible(selOf(t));
    if (el) return typeof t === "string" ? { el } : { el, title: t.title, text: t.text };
  }
  return null;
}

function seen(): boolean {
  try {
    return localStorage.getItem(KEY) === "done";
  } catch {
    return true;
  }
}

/**
 * Coach marks for a new player: a spotlight on one thing and a line about it, five in all.
 * Shows once per browser, only while nothing else is on top, and can be skipped.
 */
export function CoachMarks({ ready }: { ready: boolean }) {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Start once nothing else is on screen (a recap, a letter, a fight, a question).
  useEffect(() => {
    if (!ready || step !== null || seen()) return;
    const t = setInterval(() => {
      if (document.querySelector(".modal, .modal-backdrop, .fight-scene, .ask-veil, .palette")) return;
      clearInterval(t);
      setStep(0);
    }, 900);
    return () => clearInterval(t);
  }, [ready, step]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(KEY, "done");
    } catch {
      /* storage blocked */
    }
    setStep(-1);
  }, []);

  // Find the next mark that's actually on screen; skip the ones that aren't.
  const target = useCallback((i: number): HTMLElement | null => found(i)?.el ?? null, []);

  useLayoutEffect(() => {
    if (step === null || step < 0) return;
    if (step >= MARKS.length) return finish();
    const el = target(step);
    if (!el) {
      setStep(step + 1);
      return;
    }
    const fixed = getComputedStyle(el).position === "fixed" || !!el.closest(".hud, .quickbar, .bottomnav, .sidenav");
    if (!fixed) el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step, target, finish]);

  useEffect(() => {
    if (step === null || step < 0) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "Enter" || e.key === "ArrowRight") setStep((s) => (s ?? 0) + 1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [step, finish]);

  const on = step !== null && step >= 0 && step < MARKS.length && rect;
  if (!on) return null;
  const hit = found(step);
  const title = hit?.title ?? MARKS[step].title;
  const text = hit?.text ?? MARKS[step].text;
  const pad = 6;
  // A narrow thing on the left (the desktop menu): the card sits beside it.
  const beside = rect.width < 300 && rect.right + 360 < window.innerWidth && rect.left < window.innerWidth / 3;
  const below = rect.top + rect.height / 2 < window.innerHeight / 2;
  const left = Math.max(16, Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 336));
  const place = beside
    ? { top: Math.max(16, Math.min(rect.top - 8, window.innerHeight - 220)), left: rect.right + pad + 14 }
    : below
      ? { top: rect.bottom + pad + 12, left }
      : { bottom: window.innerHeight - rect.top + pad + 12, left };
  const last = !MARKS.slice(step + 1).some((_, i) => found(step + 1 + i));

  return (
    <AnimatePresence>
      <div className="coach" role="dialog" aria-modal="true" aria-labelledby="coach-title">
        <motion.div
          className="coach-hole"
          initial={false}
          animate={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
          transition={{ type: "spring", stiffness: 300, damping: 32 }}
        />
        <motion.div
          key={step}
          className="coach-card"
          style={place}
          initial={{ opacity: 0, y: beside ? 0 : below ? -8 : 8, x: beside ? -8 : 0 }}
          animate={{ opacity: 1, y: 0, x: 0 }}
        >
          <span className="coach-step">{step + 1} of {MARKS.length}</span>
          <h2 id="coach-title">{title}</h2>
          <p>{text}</p>
          <div className="coach-acts">
            <button className="btn btn-ghost btn-sm" onClick={finish}>Skip</button>
            <button className="btn btn-primary btn-sm" autoFocus onClick={() => (last ? finish() : setStep(step + 1))}>{last ? "Got it" : "Next"}</button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
