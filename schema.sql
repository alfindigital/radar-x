-- RADAR-X schema (Supabase Postgres). Mirror of JsonStore shape in lib/db.ts.
-- Apply when DATA_SOURCE=supabase is wired; JSON store is the dev fallback.

create table if not exists tickers (
  symbol text primary key,
  name text,
  sub_sector text,
  active boolean default true
);

create table if not exists insider_trades (
  id bigint generated always as identity primary key,
  symbol text not null references tickers(symbol),
  holder_name text not null,
  holder_type text,
  txn_type text not null check (txn_type in ('buy','sell','others')),
  txn_date date not null,
  filed_at timestamptz,
  amount bigint,
  price numeric,
  txn_value numeric,
  pct_before numeric,
  pct_after numeric,
  cluster_hint text,
  source_url text,
  unique (symbol, holder_name, txn_type, txn_date, amount, price)
);
create index if not exists insider_trades_symbol_date on insider_trades (symbol, txn_date desc);
create index if not exists insider_trades_holder on insider_trades (holder_name);

create table if not exists flow_daily (
  symbol text not null,
  date date not null,
  net_foreign_inflow numeric,
  foreign_buy_idr numeric,
  foreign_sell_idr numeric,
  primary key (symbol, date)
);

create table if not exists price_daily (
  symbol text not null,
  date date not null,
  open numeric,
  high numeric,
  low numeric,
  close numeric,
  volume bigint,
  market_cap numeric,
  primary key (symbol, date)
);
create index if not exists price_daily_symbol_date on price_daily (symbol, date);

create table if not exists broker_rows (
  symbol text not null,
  date date not null,
  broker_code text not null,
  buy_val numeric, sell_val numeric, net_val numeric,
  buy_lot numeric, sell_lot numeric, net_lot numeric,
  avg_buy numeric, avg_sell numeric,
  foreign_buy_val numeric, foreign_sell_val numeric,
  primary key (symbol, date, broker_code)
);

create table if not exists holders_monthly (
  symbol text not null,
  month date not null,
  shares_number numeric,
  n_shareholders int,
  change_in_shareholders int,
  local jsonb,
  foreign jsonb,
  primary key (symbol, month)
);

create table if not exists cases (
  id text primary key,               -- symbol:anchorDate:pattern
  symbol text not null,
  pattern text not null,
  direction text not null check (direction in ('accumulate','distribute')),
  anchor_date date not null,
  window_start date,
  window_end date,
  score int not null,
  evidence jsonb,
  outcome jsonb,
  narrative text,
  created_at timestamptz default now()
);
create index if not exists cases_score on cases (score desc);

create table if not exists positioning_scores (
  symbol text not null,
  week date not null,
  score int not null,
  components jsonb,
  computed_at timestamptz default now(),
  primary key (symbol, week)
);

create table if not exists ingest_log (
  id bigint generated always as identity primary key,
  job text not null,
  ran_at timestamptz default now(),
  credits_est int,
  rows int,
  status text
);
