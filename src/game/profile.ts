// A player's own profile: a short introduction and a photo. Minimal on purpose. The street name
// can't be changed: detectives' clues are built from it, and case files, crews and trials keep it.

import { GameError, type GameEvent, type Player } from "./types";

export const PROFILE = {
  bioMax: 160,
  /** A data URL of a small JPEG/PNG/WebP (the client shrinks photos to 160×160 before sending). */
  photoMaxChars: 70_000,
  cooldownMs: 30_000,
};

const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function cleanBio(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, PROFILE.bioMax);
}

export function validPhoto(raw: unknown): string | null {
  if (raw === null || raw === "") return null;
  if (typeof raw !== "string" || raw.length > PROFILE.photoMaxChars || !PHOTO_RE.test(raw)) {
    throw new GameError("That photo won't work. Use a JPEG, PNG or WebP image.");
  }
  return raw;
}

/** Updates the intro and/or the photo. `photo: null` removes it; leaving it out keeps it. */
export function updateProfile(p: Player, change: { bio?: unknown; photo?: unknown }, now: number): GameEvent[] {
  if (now - (p.profile?.updatedAt ?? 0) < PROFILE.cooldownMs) throw new GameError("Give it a moment before changing it again.");
  const next = { ...(p.profile ?? {}) };
  if (change.bio !== undefined) next.bio = cleanBio(change.bio);
  if (change.photo !== undefined) next.photo = validPhoto(change.photo);
  next.updatedAt = now;
  p.profile = next;
  return [{ tone: "good", text: "Profile updated." }];
}

/** What other players see. */
export const publicProfile = (p: Player) => ({ bio: p.profile?.bio || null, photo: p.profile?.photo || null });
