-- Moderation: players report other players or chat messages; moderators resolve them.
create table injustice.reports (
  id bigserial primary key,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index reports_status_idx on injustice.reports (status, id desc);
alter table injustice.reports enable row level security;
revoke all on injustice.reports from public, anon, authenticated;
revoke all on sequence injustice.reports_id_seq from public, anon, authenticated;
