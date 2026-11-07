// Crash reports from players' browsers. Throttled like every other action.
import { NextResponse } from "next/server";
import { assertJson } from "@/server/auth";
import { clientError } from "@/server/errors";
import { getStore } from "@/server/store";

export async function POST(req: Request) {
  try {
    assertJson(req);
    const entry = clientError(((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>);
    if (entry) await getStore().logError(entry);
    return NextResponse.json({ ok: true });
  } catch {
    // Never let reporting a crash cause another one.
    return NextResponse.json({ ok: false });
  }
}
