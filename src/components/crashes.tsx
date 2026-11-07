"use client";
// Sends uncaught browser errors to the server so they show up on /admin. A few per page load at
// most, each distinct message once.
import { useEffect } from "react";

const MAX = 5;

export function CrashReporter({ version }: { version: string }) {
  useEffect(() => {
    const seen = new Set<string>();
    const send = (message: string, stack?: string) => {
      if (!message || seen.has(message) || seen.size >= MAX) return;
      // Noise from browser extensions and cancelled loads isn't ours to fix.
      if (/ResizeObserver loop|Script error\.?$|chrome-extension:|moz-extension:|AbortError|Load failed|Failed to fetch/i.test(`${message} ${stack ?? ""}`)) return;
      seen.add(message);
      const body = JSON.stringify({ message, stack: stack ?? "", place: location.pathname, version });
      try {
        fetch("/api/log", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
      } catch {}
    };
    const onError = (e: ErrorEvent) => send(e.message, e.error?.stack);
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | string;
      send(typeof r === "string" ? r : r?.message ?? "Unhandled rejection", typeof r === "string" ? undefined : r?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [version]);
  return null;
}
