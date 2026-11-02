-- Player saves for Injustice.
-- Private schema: not exposed through the Supabase Data API, so browsers can't reach it.
-- RLS is enabled with no policies, so the anon/authenticated API roles have no access;
-- only the game server (connecting with the database connection string) reads and writes.
create schema if not exists injustice;
revoke all on schema injustice from public, anon, authenticated;

create table injustice.players (
  id text primary key,                     -- session id from the player's cookie
  name text not null,
  reputation integer not null default 0,   -- copied out of `data` for the leaderboard
  title text not null default 'Nobody',
  data jsonb not null,                     -- full player state, including hidden stats
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index players_reputation_idx on injustice.players (reputation desc);

alter table injustice.players enable row level security;
revoke all on injustice.players from public, anon, authenticated;
