-- Player uploads (custom frames and banners). Nobody else sees an upload until a moderator
-- approves it. The image itself is a small data URL, shrunk in the browser before upload.
create table injustice.uploads (
  id text primary key,
  player_id text not null,
  kind text not null check (kind in ('frame', 'banner')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  data text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index uploads_status_idx on injustice.uploads (status, created_at);
create index uploads_player_idx on injustice.uploads (player_id);
alter table injustice.uploads enable row level security;
revoke all on injustice.uploads from public, anon, authenticated;
