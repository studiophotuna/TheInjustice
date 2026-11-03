"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, KeyRound, LogIn, Skull, UserPlus, Wallet } from "lucide-react";
import { useState } from "react";
import { CHAPTER_BY_ID, PROLOGUE } from "@/game/content/story";
import { COUNTRIES } from "@/game/content/world";
import type { CountryId } from "@/game/types";
import type { PublicView } from "@/game/view";
import { Skyline } from "./art/Skyline";
import { Scene } from "./art/Scenes";
import { ComicPanel, LightsOut } from "./Comic";
import type { GameApi } from "./useGame";

const ease = [0.22, 1, 0.36, 1] as const;

export function Logo({ small = false }: { small?: boolean }) {
  return (
    <div className={`logo ${small ? "logo-sm" : ""}`}>
      <span className="logo-word">INJUSTICE</span>
      {!small && <span className="logo-sub">Grayhaven · From the gutter to the top</span>}
    </div>
  );
}

/** Username/password form used on the landing page and in the "save your character" sheet. */
export function AuthForm({
  game,
  initial = "register",
  onDone,
}: {
  game: GameApi;
  initial?: "login" | "register";
  onDone?: (claimed: boolean) => void;
}) {
  const [mode, setMode] = useState<"login" | "register" | "recover">(initial);
  const [code, setCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        const r = await game.auth(mode, username, password, code);
        if ("error" in r) setError(r.error ?? "Something went wrong.");
        else onDone?.(r.claimed);
      }}
    >
      <div className="segmented" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "on" : ""} onClick={() => setMode("register")}>
          <UserPlus size={16} /> Sign up
        </button>
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>
          <LogIn size={16} /> Log in
        </button>
      </div>
      <label className="field">
        <span>Username</span>
        <input autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="3–20 letters, numbers or _" />
      </label>
      {mode === "recover" && (
        <label className="field">
          <span>Recovery code</span>
          <input autoComplete="off" value={code} onChange={(e) => setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" />
        </label>
      )}
      <label className="field">
        <span>{mode === "recover" ? "New password" : "Password"}</span>
        <input
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      <button className="btn btn-primary btn-lg" disabled={game.busy || username.length < 3 || password.length < 8}>
        <KeyRound size={18} /> {mode === "register" ? "Create account" : mode === "recover" ? "Reset password" : "Log in"}
      </button>
      {mode === "login" && (
        <button type="button" className="skip" onClick={() => setMode("recover")}>Forgot password?</button>
      )}
      {mode === "recover" && <p className="fine">Use the recovery code you saved when you signed up.</p>}
      {mode === "register" && <p className="fine">Your character is saved to your account, so you can play on any device.</p>}
    </form>
  );
}

function NameForm({ game, label = "Start" }: { game: GameApi; label?: string }) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState<CountryId>("varrow");
  const chosen = COUNTRIES.find((c) => c.id === country)!;
  return (
    <form
      className="name-form"
      onSubmit={(e) => {
        e.preventDefault();
        game.act({ type: "create", name, country });
      }}
    >
      <label className="field">
        <span>Your name on the street</span>
        <input autoFocus maxLength={20} placeholder="e.g. Rook" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="field">
        <span>Where will you live?</span>
        <div className="country-pick">
          {COUNTRIES.map((c) => (
            <button
              type="button"
              key={c.id}
              className={c.id === country ? "on" : ""}
              style={{ ["--path" as string]: c.color }}
              onClick={() => setCountry(c.id)}
            >
              <b>{c.capital}</b>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
        <p className="fine country-story">{chosen.startStory} <em>{chosen.laws}</em></p>
      </div>
      <button className="btn btn-primary btn-lg" disabled={game.busy || name.trim().length < 2}>
        {label} <ArrowRight size={18} />
      </button>
    </form>
  );
}

export function Landing({ game }: { game: GameApi }) {
  const [tab, setTab] = useState<"play" | "account">("play");
  return (
    <div className="landing">
      <Scene
        kind="street"
        className="landing-scene"
        characters={[
          { kind: "thug", x: 70, scale: 0.9 },
          { kind: "detective", x: 86, scale: 1 },
          { kind: "bum", x: 12, scale: 0.75 },
        ]}
      />
      <motion.div className="landing-card glass" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
        <Logo />
        <p className="landing-pitch">
          Framed. Jailed. Released with <b>nothing</b>. Work the streets, grow strengths you can&apos;t see, and choose
          your side of the law.
        </p>
        {game.account ? (
          <>
            <p className="fine">Logged in as <b>{game.account.username}</b>. Create your character:</p>
            <NameForm game={game} />
          </>
        ) : (
          <>
            <div className="segmented">
              <button className={tab === "play" ? "on" : ""} onClick={() => setTab("play")}>New character</button>
              <button className={tab === "account" ? "on" : ""} onClick={() => setTab("account")}>I have an account</button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={tab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
                {tab === "play" ? (
                  <>
                    <NameForm game={game} />
                    <p className="fine">Play right away. You can save your character to an account any time.</p>
                  </>
                ) : (
                  <AuthForm game={game} initial="login" />
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
}

export function Prologue({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === PROLOGUE.panels.length - 1;
  return (
    <div className="cinematic">
      <p className="eyebrow">{PROLOGUE.title}</p>
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.96, rotate: -0.6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.45, ease }}
        >
          <ComicPanel panel={PROLOGUE.panels[i]} />
        </motion.div>
      </AnimatePresence>
      <div className="row center">
        {i > 0 && (
          <button className="btn btn-ghost" onClick={() => setI(i - 1)}>
            Back
          </button>
        )}
        <button className="btn btn-primary btn-lg" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? "Hit the streets" : "Next"} <ArrowRight size={18} />
        </button>
      </div>
      <div className="dots">
        {PROLOGUE.panels.map((_, k) => (
          <span key={k} className={k === i ? "on" : ""} />
        ))}
      </div>
      <button className="skip" onClick={onDone}>Skip intro</button>
    </div>
  );
}

/** Full-screen comic reader for a story chapter. */
export function ChapterViewer({ id, onDone }: { id: string; onDone: () => void }) {
  const chapter = CHAPTER_BY_ID[id];
  const [i, setI] = useState(0);
  if (!chapter) return null;
  const last = i === chapter.panels.length - 1;
  return (
    <motion.div className="chapter-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="cinematic">
        <p className="eyebrow">{chapter.title}</p>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 40, rotate: 0.8 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.4, ease }}
          >
            <ComicPanel panel={chapter.panels[i]} />
          </motion.div>
        </AnimatePresence>
        <div className="row center">
          {i > 0 && (
            <button className="btn btn-ghost" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button className="btn btn-primary btn-lg" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? "Close" : "Next"} <ArrowRight size={18} />
          </button>
        </div>
        <div className="dots">
          {chapter.panels.map((_, k) => (
            <span key={k} className={k === i ? "on" : ""} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function DeathScreen({ game, view }: { game: GameApi; view: PublicView }) {
  const [choice, setChoice] = useState<"keep" | "new">("keep");
  const [name, setName] = useState("");
  return (
    <div className="cinematic death">
      <motion.div initial={{ opacity: 0, scale: 1.1 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease }}>
        <figure className="comic-panel">
          <div className="comic-art">
            <LightsOut />
          </div>
          <figcaption>
            The {view.dead?.cause} put {view.name} in the ground. Grayhaven doesn&apos;t mourn. It just moves on.
          </figcaption>
        </figure>
      </motion.div>

      <motion.div className="glass death-card" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6, ease }}>
        <h2><Skull size={22} /> A new life</h2>
        <ul className="death-terms">
          <li className="bad">Your body forgets half of what it learned.</li>
          <li className="bad">Cash, gear, housing and your career are gone.</li>
          <li className="good"><Wallet size={14} /> Bank savings survive: ${view.bank.toLocaleString()}</li>
        </ul>
        <div className="choice">
          <label className={`choice-opt ${choice === "keep" ? "on" : ""}`}>
            <input type="radio" name="n" checked={choice === "keep"} onChange={() => setChoice("keep")} />
            Keep the name <b>{view.name}</b>
          </label>
          <label className={`choice-opt ${choice === "new" ? "on" : ""}`}>
            <input type="radio" name="n" checked={choice === "new"} onChange={() => setChoice("new")} />
            Start over under a new name
          </label>
          {choice === "new" && (
            <input className="choice-input" autoFocus maxLength={20} placeholder="New street name" value={name} onChange={(e) => setName(e.target.value)} />
          )}
        </div>
        <button
          className="btn btn-danger btn-lg"
          disabled={game.busy || (choice === "new" && name.trim().length < 2)}
          onClick={() => game.act(choice === "new" ? { type: "rebirth", name } : { type: "rebirth" })}
        >
          Continue <ArrowRight size={18} />
        </button>
      </motion.div>
    </div>
  );
}
