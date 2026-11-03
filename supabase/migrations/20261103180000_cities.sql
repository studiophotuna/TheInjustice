-- City hall: one row per country (mayor, treasury, policies, elections). The secret ballot
-- and the mayor's skims live in `data` and are never sent to players.
create table injustice.cities (
  country text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table injustice.cities enable row level security;
revoke all on injustice.cities from public, anon, authenticated;
