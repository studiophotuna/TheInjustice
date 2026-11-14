"use client";

// Crimes and heists played as cards (see game/caper.ts): each step of the job is dealt, flipped and
// stamped with how it went, then joins the trail at the top. The server decided everything; this
// only plays it back.

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Binoculars, BellRing, Car, Cpu, DoorOpen, Dog, Eye, Hand, HandGrab, House, KeyRound, Lock, ShieldAlert, Users, Vault, Zap } from "lucide-react";
import type { Caper, CaperCard } from "@/game/caper";

/** Cards with a painted image (public/caper/<card>.jpg). The rest show a drawn mark until theirs arrives. */
export const CAPER_ART = new Set<CaperCard>([]);

const CARD: Record<CaperCard, { label: string; Icon: typeof Eye; ok: string; fail: string }> = {
  case: { label: "Case it", Icon: Eye, ok: "Ready", fail: "Spotted" },
  lift: { label: "The lift", Icon: Hand, ok: "Got it", fail: "Caught" },
  snatch: { label: "The grab", Icon: HandGrab, ok: "Got it", fail: "Caught" },
  lock: { label: "The lock", Icon: Lock, ok: "Open", fail: "Jammed" },
  inside: { label: "Inside", Icon: DoorOpen, ok: "Found", fail: "Nothing" },
  vault: { label: "The safe", Icon: Vault, ok: "Open", fail: "Shut" },
  guards: { label: "Muscle", Icon: ShieldAlert, ok: "Handled", fail: "Trouble" },
  lookout: { label: "Lookout", Icon: Binoculars, ok: "Clear", fail: "Blind" },
  getaway: { label: "Getaway", Icon: Car, ok: "Away", fail: "No car" },
  alarm: { label: "Alarm", Icon: BellRing, ok: "Quiet", fail: "Alarm" },
  dog: { label: "Guard dog", Icon: Dog, ok: "Quiet", fail: "Barking" },
  owner: { label: "Someone's home", Icon: House, ok: "Handled", fail: "Seen" },
  witness: { label: "Witnesses", Icon: Users, ok: "Nobody", fail: "Seen" },
  hotwire: { label: "Hotwire", Icon: Zap, ok: "Started", fail: "Dead" },
  hacker: { label: "The alarm", Icon: Cpu, ok: "Off", fail: "Still on" },
};

export function CaperScene({ caper, title, scene, speed, skip, onDone }: { caper: Caper; title: string; scene: string; speed: number; skip: boolean; onDone: () => void }) {
  const steps = caper.steps;
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<0 | 1 | 2>(0); // dealt, flipped, stamped
  const ctl = useRef({ speed, skip });
  ctl.current = { speed, skip };
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (i >= steps.length) { const t = setTimeout(() => done.current(), skip ? 0 : 250); return () => clearTimeout(t); }
    if (skip) { setI(steps.length); return; }
    const s = ctl.current.speed;
    const ts = [
      setTimeout(() => setPhase(1), 260 / s),
      setTimeout(() => { setPhase(2); if (!steps[i].ok && navigator.vibrate) try { navigator.vibrate(30); } catch { /* not allowed */ } }, 620 / s),
      setTimeout(() => { setPhase(0); setI(i + 1); }, 1250 / s),
    ];
    return () => ts.forEach(clearTimeout);
  }, [i, skip, steps]);

  const cur = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length;

  return (
    <div className="cp-stage">
      <div className="cp-bg" style={{ backgroundImage: `url("${scene}")` }} />
      <div className="cp-rain" />
      <div className="cp-grade" />
      <div className="cp-head">
        <b>{title}</b>
        <small>{Math.min(i + 1, steps.length)} / {steps.length}</small>
      </div>
      <div className="cp-trail">
        {steps.slice(0, i).map((s, n) => {
          const c = CARD[s.card];
          return (
            <motion.div key={n} className={`cp-mini ${s.ok ? "ok" : "bad"}`} initial={{ scale: 0.4, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }}>
              {CAPER_ART.has(s.card) ? <img src={`/caper/${s.card}.jpg`} alt="" /> : <c.Icon size={20} />}
              <span>{s.ok ? c.ok : c.fail}</span>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence mode="wait">
        {!last && (
          <motion.div
            key={i}
            className={`cp-card${phase ? " open" : ""}${phase === 2 ? " stamped" : ""}`}
            initial={{ y: 90, scale: 0.55, rotate: -14, opacity: 0 }}
            animate={{ y: 0, scale: 1, rotate: -3, opacity: 1 }}
            exit={{ y: -160, scale: 0.3, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="cp-flip">
              <div className="cp-face cp-back"><img src="/brand/mark.webp" alt="" /></div>
              <div className={`cp-face cp-front ${cur.ok ? "ok" : "bad"}`}>
                {CAPER_ART.has(cur.card) ? <img className="cp-art" src={`/caper/${cur.card}.jpg`} alt="" /> : <div className="cp-mark">{(() => { const C = CARD[cur.card].Icon; return <C size={64} strokeWidth={1.6} />; })()}</div>}
                <div className="cp-tag">{CARD[cur.card].label}{cur.who && <small>{cur.who}</small>}</div>
              </div>
            </div>
            <AnimatePresence>
              {phase === 2 && (
                <motion.div className={`cp-stamp ${cur.ok ? "ok" : "bad"}`} initial={{ scale: 2.6, opacity: 0, rotate: -18 }} animate={{ scale: 1, opacity: 1, rotate: -10 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>
                  {cur.ok ? CARD[cur.card].ok : CARD[cur.card].fail}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {!last && phase > 0 && (
          <motion.p key={i} className="cp-line" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {cur.line}
          </motion.p>
        )}
      </AnimatePresence>
      {phase === 2 && !last && !cur.ok && <div className="cp-flash" key={`f${i}`} />}
    </div>
  );
}
