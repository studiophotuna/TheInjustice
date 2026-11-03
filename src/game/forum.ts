// A crew leader's secret forum: a private board for the crew plus guests the leader invites.
// Guests can be anyone (a cop on the payroll, a doctor who stitches people up quietly, a banker
// who cleans money); they can read and post there without joining the crew.

import { notify } from "./social";
import { GameError, type Crew, type GameEvent, type Player } from "./types";

export const FORUM = { cost: 1000, maxGuests: 20, nameMax: 30 };

export const forumChannel = (crewId: string) => `forum:${crewId}`;

/** Whether this player can read and post in the crew's forum. */
export function canUseForum(crew: Crew | null, p: Player): boolean {
  if (!crew?.forum) return false;
  return p.crewId === crew.id || crew.forum.guests.some((g) => g.id === p.id);
}

const leaderOnly = (crew: Crew, p: Player) => {
  if (crew.leaderId !== p.id) throw new GameError("Only the crew leader runs the forum.");
};

export function createForum(crew: Crew, leader: Player, name: unknown, now: number): GameEvent[] {
  leaderOnly(crew, leader);
  if (crew.forum) throw new GameError("Your crew already has a forum.");
  const n = typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, FORUM.nameMax) : "";
  if (n.length < 3) throw new GameError("Give the forum a name (3 or more letters).");
  if (crew.vault < FORUM.cost) throw new GameError(`Setting it up costs $${FORUM.cost} from the vault.`);
  crew.vault -= FORUM.cost;
  crew.forum = { name: n, createdAt: now, guests: [] };
  crew.log = [{ at: now, text: `${leader.name} opened a secret forum: "${n}".` }, ...crew.log].slice(0, 30);
  return [{ tone: "good", text: `"${n}" is open. Invite whoever you trust.` }];
}

export function inviteToForum(crew: Crew, leader: Player, guest: Player, now: number): GameEvent[] {
  leaderOnly(crew, leader);
  if (!crew.forum) throw new GameError("Open a forum first.");
  if (guest.id === leader.id || guest.crewId === crew.id) throw new GameError("Crew members are already in.");
  if (guest.dead) throw new GameError("They're dead.");
  if (crew.forum.guests.some((g) => g.id === guest.id)) throw new GameError("They're already invited.");
  if (crew.forum.guests.length >= FORUM.maxGuests) throw new GameError(`At most ${FORUM.maxGuests} guests.`);
  crew.forum.guests.push({ id: guest.id, name: guest.name, at: now });
  guest.forums = [...(guest.forums ?? []).filter((f) => f.crewId !== crew.id), { crewId: crew.id, name: crew.forum.name, tag: crew.tag }].slice(-10);
  notify(guest, `${leader.name} of ${crew.name} [${crew.tag}] let you into a private forum: "${crew.forum.name}". Find it under People → Crew.`, "story", leader, now);
  return [{ tone: "good", text: `${guest.name} is in the forum.` }];
}

/** The leader removes a guest, or a guest walks out. */
export function removeFromForum(crew: Crew | null, actor: Player, guest: Player, crewId: string): GameEvent[] {
  if (actor.id !== guest.id && (!crew || crew.leaderId !== actor.id)) throw new GameError("Only the crew leader can do that.");
  if (crew?.forum) crew.forum.guests = crew.forum.guests.filter((g) => g.id !== guest.id);
  guest.forums = (guest.forums ?? []).filter((f) => f.crewId !== crewId);
  return [{ tone: "info", text: actor.id === guest.id ? "You left the forum." : `${guest.name} is out of the forum.` }];
}

/** The leader shuts the forum; guests lose access. */
export function closeForum(crew: Crew, leader: Player, guests: Player[], now: number): GameEvent[] {
  leaderOnly(crew, leader);
  if (!crew.forum) throw new GameError("There's no forum.");
  for (const g of guests) g.forums = (g.forums ?? []).filter((f) => f.crewId !== crew.id);
  crew.log = [{ at: now, text: `${leader.name} shut down the forum.` }, ...crew.log].slice(0, 30);
  crew.forum = null;
  return [{ tone: "info", text: "The forum is gone. Nobody was ever there." }];
}
