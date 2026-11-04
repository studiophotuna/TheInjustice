// Moderation: player reports, mutes and suspensions. Moderators are accounts listed in the
// ADMIN_USERNAMES environment variable; they work from the /admin page.

import { GameError, type Player, type Report } from "./types";

export const MOD = { reasonMax: 200, reportCooldownMs: 60_000 };

export const REPORT_REASONS = ["Offensive photo", "Offensive name or intro", "Harassment or hate in chat", "Cheating or alt accounts", "Something else"] as const;

export const isMuted = (p: Player, now: number) => (p.mutedUntil ?? 0) > now;
export const isBanned = (p: Player, now: number) => (p.bannedUntil ?? 0) > now;

/** Throws for a suspended player: they can look, but not play. */
export function assertActive(p: Player | null, now: number) {
  if (p && isBanned(p, now)) {
    const until = p.bannedUntil! > now + 10 * 365 * 24 * 60 * 60_000 ? "permanently" : `until ${new Date(p.bannedUntil!).toUTCString()}`;
    throw new GameError(`This character is suspended ${until}.${p.banReason ? ` Reason: ${p.banReason}.` : ""}`);
  }
}

export function assertCanSpeak(p: Player, now: number) {
  if (isMuted(p, now)) throw new GameError(`You're muted until ${new Date(p.mutedUntil!).toUTCString()}.`);
}

/** Validates a report from `reporter` and records the time (one report a minute). */
export function checkReport(reporter: Player, targetId: string, reason: unknown, now: number): string {
  if (reporter.id === targetId) throw new GameError("You can't report yourself.");
  if (now - (reporter.lastReportAt ?? 0) < MOD.reportCooldownMs) throw new GameError("One report a minute, please.");
  const r = typeof reason === "string" ? reason.replace(/\s+/g, " ").trim().slice(0, MOD.reasonMax) : "";
  if (!r) throw new GameError("Say what's wrong.");
  reporter.lastReportAt = now;
  return r;
}

export type ModAction = "dismiss" | "remove_photo" | "clear_bio" | "delete_message" | "mute" | "ban" | "unban";

/** Applies a moderator's action to the reported player. Returns a line for the log. */
export function applyModAction(target: Player, action: ModAction, hours: number, reason: string, now: number): string {
  switch (action) {
    case "remove_photo":
      target.profile = { ...(target.profile ?? {}), photo: null };
      return "photo removed";
    case "clear_bio":
      target.profile = { ...(target.profile ?? {}), bio: "" };
      return "intro cleared";
    case "mute":
      target.mutedUntil = now + Math.max(1, hours) * 3_600_000;
      return `muted for ${hours}h`;
    case "ban":
      target.bannedUntil = hours > 0 ? now + hours * 3_600_000 : now + 100 * 365 * 24 * 3_600_000;
      target.banReason = reason.slice(0, MOD.reasonMax) || "Breaking the rules";
      return hours > 0 ? `suspended for ${hours}h` : "suspended permanently";
    case "unban":
      target.bannedUntil = 0;
      target.mutedUntil = 0;
      target.banReason = undefined;
      return "suspension lifted";
    default:
      return "";
  }
}

export function reportView(r: Report) {
  return r;
}

export function assertModAction(v: unknown): ModAction {
  if (["dismiss", "remove_photo", "clear_bio", "delete_message", "mute", "ban", "unban"].includes(v as string)) return v as ModAction;
  throw new GameError("Unknown action.");
}
