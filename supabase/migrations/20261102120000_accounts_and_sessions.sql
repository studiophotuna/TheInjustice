-- Username/password accounts and login sessions for Injustice.
-- Private schema, RLS on with no policies: only the game server (database owner) has access.
create table injustice.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,          -- scrypt$N$r$p$salt$hash
  failed_logins integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now()
);
create unique index accounts_username_lower_idx on injustice.accounts (lower(username));

create table injustice.sessions (
  token_hash text primary key,          -- sha256 of the cookie token; raw tokens are never stored
  account_id uuid not null references injustice.accounts (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_account_idx on injustice.sessions (account_id);

alter table injustice.accounts enable row level security;
alter table injustice.sessions enable row level security;
revoke all on injustice.accounts, injustice.sessions from public, anon, authenticated;
