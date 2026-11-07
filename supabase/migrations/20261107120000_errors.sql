-- Crash reports from players' browsers and from the server, for moderators to read on /admin.
-- Only the message, where it happened and a short stack: no personal data.
create table injustice.errors (
  id bigserial primary key,
  source text not null check (source in ('client', 'server')),
  message text not null,
  place text not null default '',
  stack text not null default '',
  version text not null default '',
  created_at timestamptz not null default now()
);
create index errors_created_idx on injustice.errors (created_at desc);
alter table injustice.errors enable row level security;
revoke all on injustice.errors from public, anon, authenticated;
revoke all on sequence injustice.errors_id_seq from public, anon, authenticated;
