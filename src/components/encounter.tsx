"use client";

import { ChevronDown, MessageCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { PATH_LOOKS, PlayerAvatar } from "./art/Portraits";
import { useScrollLock } from "./scrollLock";
import { fmt, type GameApi } from "./useGame";

export const openEncounter = () => window.dispatchEvent(new Event("conspira:encounter"));

/**
 * A regular stops you in the street. It waits above the quick bar on any screen: a face and a
 * line. Open it to hear them out and choose; it's gone in twenty minutes if you don't.
 */
export function EncounterDock({ game }: { game: GameApi }) {
  const e = game.view?.encounter ?? null;
  const [open, setOpen] = useState(false);
  useScrollLock(open && !!e);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener("conspira:encounter", on);
    return () => window.removeEventListener("conspira:encounter", on);
  }, []);
  useEffect(() => {
    if (!e) setOpen(false);
  }, [e]);
  if (!e) return null;
  const rim = e.path ? PATH_LOOKS[e.path]?.rim : "#a78bfa";
  const left = Math.max(0, e.expiresAt - Date.now());

  return (
    <AnimatePresence>
      <motion.div
        key={e.expiresAt}
        className={`encounter${open ? " open" : ""}`}
        style={{ ["--rim" as string]: rim }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 24 }}
      >
        {!open ? (
          <button className="enc-peek" onClick={() => setOpen(true)}>
            <PlayerAvatar name={e.name} path={e.path} photo={e.photo} className="enc-face" />
            <span className="enc-peek-text">
              <b>{e.name}</b>
              <small><span className="enc-wants">wants a word · </span>{fmt(left)}</small>
            </span>
            <MessageCircle size={18} className="enc-bubble" />
          </button>
        ) : (
          <div className="enc-sheet">
            <div className="enc-head">
              <PlayerAvatar name={e.name} path={e.path} photo={e.photo} className="enc-face lg" />
              <div>
                <b className="enc-name">{e.name}</b>
                <span className="row">
                  <span className="chip chip-regular">Regular</span>
                  {e.tie && <span className={`tie-badge tie-${e.tie.tone}`} title={e.tie.memo}>{e.tie.label}</span>}
                </span>
              </div>
              <button className="enc-close" aria-label="Later" onClick={() => setOpen(false)}><ChevronDown size={18} /></button>
            </div>
            <p className="enc-text">{e.text}</p>
            <div className="enc-options">
              {e.options.map((o, i) => (
                <button
                  key={o.label}
                  className="enc-option"
                  disabled={game.busy || !!o.block}
                  onClick={() => game.act({ type: "encounter", choice: i })}
                >
                  <b>{o.label}</b>
                  <small>{o.block ?? o.hint}</small>
                </button>
              ))}
            </div>
            <p className="fine muted enc-timer">They'll move on in {fmt(left)}.</p>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
