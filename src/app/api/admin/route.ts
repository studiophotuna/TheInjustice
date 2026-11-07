import { NextResponse } from "next/server";
import { reportError } from "@/server/errors";
import { linkedGroups } from "@/game/anticheat";
import { COUNTRIES } from "@/game/content/world";
import { reviewUpload } from "@/game/favors";
import { applyModAction, assertModAction, isBanned, isMuted } from "@/game/moderation";
import { notify } from "@/game/social";
import { GameError, type Player } from "@/game/types";
import { assertJson } from "@/server/auth";
import { isAdmin, resolveIdentity } from "@/server/identity";
import { getStore, StoreConfigError } from "@/server/store";

export const dynamic = "force-dynamic";

function failure(e: unknown) {
  if (e instanceof GameError) return NextResponse.json({ error: e.message }, { status: 400 });
  if (e instanceof StoreConfigError) return NextResponse.json({ error: e.message }, { status: 503 });
  reportError("api/admin", e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

async function requireAdmin() {
  const id = await resolveIdentity(false);
  if (!isAdmin(id)) return null;
  return id;
}

async function everyone(store: ReturnType<typeof getStore>): Promise<Player[]> {
  return (await Promise.all(COUNTRIES.map((c) => store.listPlayers(c.id, 500)))).flat();
}

/** The moderation queue: open reports, recent decisions, possible alt accounts, and who is muted or suspended. */
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Moderators only." }, { status: 403 });
    if (new URL(req.url).searchParams.get("probe")) return NextResponse.json({ ok: true });
    const store = getStore();
    const now = Date.now();
    const [open, resolved, dismissed, players] = await Promise.all([
      store.listReports("open", 100),
      store.listReports("resolved", 20),
      store.listReports("dismissed", 20),
      everyone(store),
    ]);
    const restricted = players
      .filter((p) => isBanned(p, now) || isMuted(p, now))
      .map((p) => ({ id: p.id, name: p.name, bannedUntil: isBanned(p, now) ? p.bannedUntil : null, mutedUntil: isMuted(p, now) ? p.mutedUntil : null, reason: p.banReason ?? null }));
    return NextResponse.json({
      open,
      closed: [...resolved, ...dismissed].sort((a, b) => b.id - a.id).slice(0, 20),
      alts: linkedGroups(players),
      // Uploaded frames and banners waiting for a decision (previews load from /api/upload/<id>).
      uploads: (await store.listUploads("pending", 40)).map((u) => ({ id: u.id, kind: u.kind, playerId: u.playerId, playerName: u.playerName, at: u.at, cost: u.cost })),
      // For granting Favors by name (testing and support).
      people: players.filter((p) => !p.regular).map((p) => ({ id: p.id, name: p.name, favors: p.favors ?? 0 })).slice(0, 500),
      restricted,
      // Crashes from players' browsers and the server, newest first.
      errors: await store.listErrors(40),
    });
  } catch (e) {
    return failure(e);
  }
}

/** A moderator acts on a report (or directly on a player). */
export async function POST(req: Request) {
  try {
    assertJson(req);
    const admin = await requireAdmin();
    if (!admin) return NextResponse.json({ error: "Moderators only." }, { status: 403 });
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (b.action === "approve_upload" || b.action === "reject_upload") {
      const store = getStore();
      const approved = b.action === "approve_upload";
      const reason = typeof b.reason === "string" ? b.reason.slice(0, 120) : "";
      const u = typeof b.uploadId === "string" ? await store.getUpload(b.uploadId) : null;
      if (!u) throw new GameError("That upload is gone.");
      if (u.status !== "pending") throw new GameError("Someone already decided on that one.");
      await store.setUploadStatus(u.id, approved ? "approved" : "rejected", admin.account!.username, reason || undefined);
      await store.update(u.playerId, (p) => {
        if (!p) return { player: p, result: null };
        const now = Date.now();
        for (const ev of reviewUpload(p, u.kind, u.id, approved, reason, u.cost, now)) notify(p, ev.text, ev.tone, undefined, now);
        return { player: p, result: null };
      });
      return NextResponse.json({ ok: true, line: `${u.kind} from ${u.playerName} ${approved ? "approved" : "rejected"}` });
    }
    const action = assertModAction(b.action);
    const reportId = typeof b.reportId === "number" ? b.reportId : null;
    const targetId = typeof b.targetId === "string" ? b.targetId : null;
    const hours = Math.max(0, Math.min(24 * 365, Number(b.hours) || 0));
    const reason = typeof b.reason === "string" ? b.reason : "";
    const store = getStore();
    const now = Date.now();
    let line = "dismissed";
    if (action === "delete_message") {
      if (typeof b.messageId !== "number") throw new GameError("Which message?");
      await store.deleteMessage(b.messageId);
      line = "message deleted";
    } else if (action !== "dismiss") {
      if (!targetId) throw new GameError("Which player?");
      line = await store.update(targetId, (p) => {
        if (!p) throw new GameError("That player doesn't exist.");
        return { player: p, result: applyModAction(p, action, hours, reason, now, Number(b.amount) || 0) };
      });
    }
    if (reportId !== null) {
      await store.updateReport(reportId, { status: action === "dismiss" ? "dismissed" : "resolved", resolvedBy: admin.account!.username, action: line });
    }
    return NextResponse.json({ ok: true, line });
  } catch (e) {
    return failure(e);
  }
}
