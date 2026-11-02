-- Community: crews, chat messages, account recovery codes.
-- Private schema with RLS on and no policies: only the game server has access.
create table injustice.crews (
  id text primary key,
  tag text not null,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);
create unique index crews_tag_idx on injustice.crews (upper(tag));

create table injustice.messages (
  id bigserial primary key,
  channel text not null,           -- "global", "country:<id>", "crew:<id>"
  author_id text not null,
  author_name text not null,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index messages_channel_idx on injustice.messages (channel, id desc);

alter table injustice.accounts add column recovery_hash text;   -- sha256 of the one-time recovery code
create index players_country_idx on injustice.players ((coalesce(data->>'country', 'varrow')), updated_at desc);

alter table injustice.crews enable row level security;
alter table injustice.messages enable row level security;
revoke all on injustice.crews, injustice.messages from public, anon, authenticated;
revoke all on sequence injustice.messages_id_seq from public, anon, authenticated;
