# Capacity

How much the game reads from the database per player, and what that means for the hosting plan.
Measured in 8.1.0 with `STORE_METER` (see `src/server/store.ts`): every store call records the
size of what it returned, which is close to what Postgres sends.

## What each polling request reads

A busy city: 40 players in Port Solace, 60 chat lines from 20 people. Sizes are what the server
reads from the database per request (the browser receives much less).

| Request | How often | Before (8.0.3) | After (8.1.0) |
|---|---|---|---|
| City pulse | every minute | 618 KB | 57 KB |
| City chat | every 8 s while visible (People chat was every 4 s, even hidden) | 316 KB | 35 KB |
| People tab | when opened | 669 KB | 231 KB |
| Game state | every 2 min | 14 KB | 14 KB |

Today's small test city (6 players): pulse 65 → 43 KB, chat 26 → 21 KB, People 117 → 93 KB.

On live data (November 2026) a player listed for someone else went from 9.8 KB to under 2 KB on
average; a player with an uploaded photo from 39.5 KB to 6.7 KB.

## What changed

- Lists of other players (pulse, People, chat authors, contacts) read slim copies: the database
  leaves out what only the owner sees (log, ledger, inbox, journal...) before sending.
  `listPeople` / `getPeople` for People and contacts; `listFaces` / `getFaces` (a handful of
  fields) for the pulse, chat and witnesses.
- Uploaded photos are served from `/api/face/<id>?v=<updatedAt>` and cached for a year, instead
  of travelling inside every list.
- Chat authors are fetched in one query instead of one per author.
- Chat and the crew forum poll every 8 seconds, only while the tab is visible.
- A slim copy can never be saved: `putPlayer` refuses it (tests in `src/server/slim.test.ts`, and
  against a real Postgres in `slim.pg.test.ts`).

## Database reads per hour of play (busy city)

| Player | Before | After |
|---|---|---|
| On a phone (game state + pulse) | about 37 MB | about 4 MB |
| On desktop (plus the chat rail) | about 180 MB | about 20 MB |

On Supabase's free plan (5 GB of transfer a month) that is roughly 45 player-hours a month
before and about 430 after, for a half-phone, half-desktop mix in busy cities. Supabase Pro
(250 GB) multiplies either figure by 50.
