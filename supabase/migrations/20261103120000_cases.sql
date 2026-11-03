-- Street crime case files. The criminal's identity lives only in `data` and is never
-- sent to players. Private schema, RLS on, no policies: only the game server has access.
create table injustice.cases (
  id text primary key,
  country text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index cases_country_idx on injustice.cases (country, created_at desc);

alter table injustice.cases enable row level security;
revoke all on injustice.cases from public, anon, authenticated;
