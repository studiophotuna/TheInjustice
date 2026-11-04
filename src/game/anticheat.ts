// Anti-cheat basics: characters played from the same device are treated as the same person.
//
// Every request carries a long-lived device cookie (and a hashed IP address). A character
// remembers the last few of each. Two characters that share a device can't trade, fight, lend,
// vouch, launder or sell to each other, and only one of them can vote in an election. Shared IP
// addresses alone are only shown to moderators: households and cafés share IPs.

import { GameError, type Player } from "./types";

export const ANTICHEAT = { keep: 5 };

/** Remembers the device and (hashed) IP this character was just played from. */
export function trackDevice(p: Player, deviceId: string | null, ipHash: string | null) {
  if (deviceId) p.devices = [deviceId, ...(p.devices ?? []).filter((d) => d !== deviceId)].slice(0, ANTICHEAT.keep);
  if (ipHash) p.ips = [ipHash, ...(p.ips ?? []).filter((d) => d !== ipHash)].slice(0, ANTICHEAT.keep);
}

/** Two characters played from the same device. */
export function sameOwner(a: Player, b: Player): boolean {
  if (a.id === b.id) return true;
  const devices = new Set(a.devices ?? []);
  return (b.devices ?? []).some((d) => devices.has(d));
}

/** Two characters seen on the same network (only a hint, for moderators). */
export function sameNetwork(a: Player, b: Player): boolean {
  const ips = new Set(a.ips ?? []);
  return (b.ips ?? []).some((d) => ips.has(d));
}

export const ALT_BLOCK = "That's another of your own characters. Characters on the same device can't deal with each other.";

/** Throws if two characters on the same device try to deal with each other. */
export function assertNotAlt(a: Player, b: Player) {
  if (a.id !== b.id && sameOwner(a, b)) throw new GameError(ALT_BLOCK);
}

/** Groups of characters that share a device or a network, for the moderation page. */
export function linkedGroups(players: Player[]) {
  const groups: { ids: string[]; names: string[]; device: boolean }[] = [];
  const seen = new Set<string>();
  for (const p of players) {
    if (seen.has(p.id)) continue;
    const device = players.filter((o) => o.id !== p.id && sameOwner(p, o));
    const network = players.filter((o) => o.id !== p.id && !sameOwner(p, o) && sameNetwork(p, o));
    if (!device.length && !network.length) continue;
    const members = [p, ...device, ...network];
    members.forEach((m) => seen.add(m.id));
    groups.push({ ids: members.map((m) => m.id), names: members.map((m) => m.name), device: device.length > 0 });
  }
  return groups;
}
