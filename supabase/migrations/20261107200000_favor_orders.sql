-- The Favors exchange: players list Favors for in-game cash. The Favors sit in escrow on the
-- order until it's bought or cancelled.
create table injustice.favor_orders (
  id text primary key,
  seller_id text not null,
  status text not null default 'open' check (status in ('open', 'filled', 'cancelled')),
  data jsonb not null,
  created_at timestamptz not null default now()
);
create index favor_orders_open_idx on injustice.favor_orders (status, created_at desc);
create index favor_orders_seller_idx on injustice.favor_orders (seller_id, created_at desc);
alter table injustice.favor_orders enable row level security;
revoke all on injustice.favor_orders from public, anon, authenticated;
