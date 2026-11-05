"use client";

import { play } from "./sfx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FightSummary, GameEvent } from "@/game/types";
import type { PublicView } from "@/game/view";

export type Leader = { name: string; reputation: number; title: string };
export type Toast = GameEvent & { id: number };
export type Floater = { id: number; text: string; tone: "good" | "bad"; x: number; y: number };

async function notify(title: string, body: string, url: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted" || !document.hidden) return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icon.svg", data: { url }, tag: title });
    else new Notification(title, { body, icon: "/icon.svg" });
  } catch {
    /* best effort */
  }
}

function vibrate(ms: number | number[]) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* unsupported */
  }
}

/** One sound per action, picked by what happened. */
function soundFor(body: Record<string, unknown>, events: GameEvent[], cashDelta: number) {
  const text = events.map((e) => e.text).join(" ");
  const bad = events.some((e) => e.tone === "bad");
  if (events.some((e) => e.fight)) return play("fight");
  if (bad && /\b(cell|jail|locked up|behind bars|arrested|custody)\b/i.test(text)) return play("jail");
  if (bad && /\b(busted|police|cops?|caught)\b/i.test(text)) return play("busted");
  // Street crime: footsteps as you make your move, then the take (or the thud).
  if (body.op === "crime") {
    play("run");
    return play(bad ? "bad" : "coin", 0.9);
  }
  if (events.some((e) => e.tone === "story" && /^(You are now|Graduation|Promoted)/.test(e.text))) return play("promo");
  if (events.some((e) => e.tone === "story")) return play("story");
  if (body.type === "claim_daily" || body.type === "collect_property" || cashDelta >= 200) return play("cash");
  if (cashDelta > 0) return play("coin");
  if (bad) return play("bad");
  play("tap");
}

export const LAST_JOB = "cns_last_job";
export const LAST_GYM = "cns_last_gym";

/** Remembers the last job and gym exercise so the quick bar can repeat them. */
function rememberAction(body: Record<string, unknown>) {
  try {
    if (body.type === "job" && typeof body.jobId === "string") localStorage.setItem(LAST_JOB, body.jobId);
    if (body.type === "train" && typeof body.stat === "string") localStorage.setItem(LAST_GYM, body.stat);
  } catch {
    // ignore
  }
}

export function useGame() {
  const [view, setView] = useState<PublicView | null>(null);
  const [account, setAccount] = useState<{ username: string } | null>(null);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [fight, setFight] = useState<FightSummary | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState(0);
  const [clock, setClock] = useState(0);
  const seq = useRef(0);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onDown = (e: PointerEvent) => (lastPointer.current = { x: e.clientX, y: e.clientY });
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const pushToasts = useCallback(
    (events: GameEvent[]) => {
      const fresh = events.filter((e) => !e.fight).map((e) => ({ ...e, id: ++seq.current }));
      if (!fresh.length) return;
      // At most 3 on screen; routine results fade quickly, calls to action stay until tapped.
      setToasts((t) => [...t, ...fresh].slice(-3));
      for (const f of fresh) if (!f.action) setTimeout(() => dismiss(f.id), f.tone === "story" ? 6000 : 3500);
    },
    [dismiss],
  );

  const floatText = useCallback((text: string, tone: "good" | "bad") => {
    const f = { id: ++seq.current, text, tone, ...lastPointer.current };
    setFloaters((x) => [...x, f]);
    setTimeout(() => setFloaters((x) => x.filter((y) => y.id !== f.id)), 1200);
  }, []);

  const accept = useCallback((v: PublicView | null) => {
    setView(v);
    setReceivedAt(Date.now());
    setClock(Date.now());
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/game", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The city is unreachable right now.");
      setFatal(null);
      accept(data.view ?? null);
      setAccount(data.account ?? null);
      setLeaders(data.leaderboard ?? []);
      return (data.view ?? null) as PublicView | null;
    } catch (e) {
      setFatal(e instanceof Error ? e.message : "The city is unreachable right now.");
      return null;
    } finally {
      setLoaded(true);
    }
  }, [accept]);

  const act = useCallback(
    async (body: Record<string, unknown>) => {
      if (busy) return null;
      setBusy(true);
      const cashBefore = view?.cash ?? 0;
      try {
        const res = await fetch("/api/game", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToasts([{ tone: "bad", text: data.error ?? "Something went wrong." }]);
          vibrate(60);
          return null;
        }
        const v = data.view as PublicView;
        accept(v);
        rememberAction(body);
        const events = (data.events ?? []) as GameEvent[];
        const fightEvent = events.find((e) => e.fight);
        if (fightEvent?.fight) {
          setFight(fightEvent.fight);
          // Hold the other results until the fight scene has played.
          setTimeout(() => pushToasts(events), 2600);
        } else {
          pushToasts(events);
        }
        const delta = v.cash - cashBefore;
        if (body.type === "job" && !fightEvent) {
          if (delta > 0) floatText(`+$${delta}`, "good");
          else if (events.some((e) => e.tone === "bad")) floatText("Busted!", "bad");
        }
        vibrate(delta > 0 ? 15 : 40);
        soundFor(body, events, delta);
        return v;
      } catch {
        pushToasts([{ tone: "bad", text: "Connection lost. Try again." }]);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, view?.cash, accept, pushToasts, floatText],
  );

  /** Actions that involve other players (attacks, chat, crews). */
  const social = useCallback(
    async (body: Record<string, unknown>, endpoint = "/api/community") => {
      if (busy) return null;
      setBusy(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          pushToasts([{ tone: "bad", text: data.error ?? "Something went wrong." }]);
          vibrate(60);
          return null;
        }
        accept(data.view);
        const events = (data.events ?? []) as GameEvent[];
        const fightEvent = events.find((e) => e.fight);
        if (fightEvent?.fight) {
          setFight(fightEvent.fight);
          setTimeout(() => pushToasts(events), 2600);
        } else pushToasts(events);
        soundFor(body, events, 0);
        return data.view as PublicView;
      } catch {
        pushToasts([{ tone: "bad", text: "Connection lost. Try again." }]);
        return null;
      } finally {
        setBusy(false);
      }
    },
    [busy, accept, pushToasts],
  );

  const auth = useCallback(
    async (op: "login" | "register" | "logout" | "recover" | "new_recovery", username?: string, password?: string, code?: string) => {
      setBusy(true);
      try {
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ op, username, password, code }),
        });
        const data = await res.json();
        if (!res.ok) return { error: (data.error as string) ?? "Something went wrong." };
        if (data.recoveryCode) setRecoveryCode(data.recoveryCode as string);
        await refresh();
        return { ok: true as const, claimed: !!data.claimed };
      } catch {
        return { error: "Connection lost. Try again." };
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  useEffect(() => {
    refresh();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, [refresh]);

  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Heartbeat: keeps you on the "online now" list and picks up what other players did
  // (inbox, witness pop-ups, arrests) while the game is open.
  useEffect(() => {
    const beat = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 120_000);
    return () => clearInterval(beat);
  }, [refresh]);

  const elapsed = Math.max(0, clock - receivedAt);

  const live = useMemo(() => {
    if (!view) return null;
    let energy = view.energy;
    if (view.nextEnergyMs > 0 && elapsed >= view.nextEnergyMs) {
      energy += 1 + Math.floor((elapsed - view.nextEnergyMs) / view.energyRegenMs);
    }
    energy = Math.min(view.maxEnergy, energy);
    const sinceTick = elapsed - view.nextEnergyMs;
    const nextIn =
      energy >= view.maxEnergy
        ? 0
        : sinceTick < 0
          ? view.nextEnergyMs - elapsed
          : view.energyRegenMs - (sinceTick % view.energyRegenMs);
    return {
      energy,
      nextIn,
      fullIn: Math.max(0, view.energyFullMs - elapsed),
      hospital: Math.max(0, view.hospitalMs - elapsed),
      full: Math.max(0, view.fullMs - elapsed),
      application: view.application?.status === "pending" ? Math.max(0, view.application.msLeft - elapsed) : 0,
      travel: view.travel ? Math.max(0, view.travel.msLeft - elapsed) : 0,
    };
  }, [view, elapsed]);

  // Timer pop-ups with a one-tap next step.
  const fired = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!view || !live) return;
    const once = (key: string, run: () => void) => {
      if (fired.current[key] === receivedAt) return;
      fired.current[key] = receivedAt;
      run();
    };
    if (view.energyFullMs > 0 && live.fullIn === 0) {
      once("energy", async () => {
        const v = await refresh();
        const job = v?.jobs.find((j) => j.id === v.recommendedJobId);
        const times = job && v ? Math.floor(v.energy / job.energy) : 0;
        const text = job ? `Energy full. Best job now: ${job.name} (${times}× in a row).` : "Energy full.";
        pushToasts([{ tone: "good", text, action: job ? { label: "Go", target: `job:${job.id}` } : undefined }]);
        notify("Energy full", text, job ? `/?go=job:${job.id}` : "/");
      });
    }
    if (view.application?.status === "pending" && live.application === 0) {
      once("application", async () => {
        await refresh();
        const text = `${view.application!.dean} has made a decision about your application.`;
        pushToasts([{ tone: "story", text, action: { label: "Open letter", target: "tab:profile" } }]);
        notify("A letter from the dean", text, "/?go=tab:profile");
      });
    }
    if (view.travel && live.travel === 0) {
      once("travel", async () => {
        await refresh();
        notify(`Arrived in ${view.travel!.city}`, "Your trip is over. See what happened on the way.", "/");
      });
    }
    if (view.hospitalMs > 0 && live.hospital === 0) {
      once("hospital", async () => {
        await refresh();
        const text = "You're out of the clinic. Back to the streets.";
        pushToasts([{ tone: "good", text, action: { label: "Find work", target: "tab:jobs" } }]);
        notify("Discharged", text, "/?go=tab:jobs");
      });
    }
  }, [view, live, receivedAt, refresh, pushToasts]);

  return {
    view,
    account,
    leaders,
    loaded,
    fatal,
    busy,
    toasts,
    fight,
    floaters,
    live,
    refresh,
    act,
    auth,
    social,
    recoveryCode,
    clearRecoveryCode: () => setRecoveryCode(null),
    dismiss,
    closeFight: () => setFight(null),
    pushToasts,
  };
}

export type GameApi = ReturnType<typeof useGame>;

export function fmt(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h ? `${h}h ${m}m` : `${m}:${String(sec).padStart(2, "0")}`;
}
