-- Shared action throttling across serverless instances.
-- Expired rows are pruned during each request under a per-key advisory lock.
create table injustice.action_rate_hits (
  request_key text not null,
  hit_at timestamptz not null
);
create index action_rate_hits_key_time_idx
  on injustice.action_rate_hits (request_key, hit_at);
alter table injustice.action_rate_hits enable row level security;
revoke all on injustice.action_rate_hits from public, anon, authenticated;
