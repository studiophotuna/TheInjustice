// Records crashes so moderators see them on /admin, not only when players complain.
import { after } from "next/server";
import pkg from "../../package.json";
import { getStore } from "./store";

export const VERSION: string = pkg.version;

const clip = (s: unknown, n: number) => (typeof s === "string" ? s : String(s ?? "")).replace(/[\u0000-\u001f\u007f]+/g, " ").slice(0, n);

/** Logs a server error to the console (Vercel logs) and to the errors table, after the response. */
export function reportError(place: string, e: unknown): void {
  console.error(e);
  const err = e as { message?: unknown; stack?: unknown };
  const entry = {
    source: "server" as const,
    message: clip(err?.message ?? e, 300),
    place: clip(place, 120),
    stack: clip(err?.stack, 2000),
    version: VERSION,
  };
  try {
    after(() => getStore().logError(entry).catch(() => undefined));
  } catch {
    // Outside a request (tests): nothing to defer to.
  }
}

/** Cleans a crash report sent by a browser. */
export function clientError(b: Record<string, unknown>) {
  const message = clip(b.message, 300).trim();
  if (!message) return null;
  return { source: "client" as const, message, place: clip(b.place, 120), stack: clip(b.stack, 2000), version: clip(b.version, 20) || VERSION };
}
