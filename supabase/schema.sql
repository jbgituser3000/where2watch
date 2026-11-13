-- where2watch accounts: one row per user holding the synced watchlist + services.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  watchlist  jsonb not null default '[]'::jsonb,
  services   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint watchlist_is_array check (jsonb_typeof(watchlist) = 'array'),
  constraint services_is_array  check (jsonb_typeof(services) = 'array'),
  constraint size_limit check (pg_column_size(watchlist) + pg_column_size(services) < 512000)
);

alter table public.user_data enable row level security;

drop policy if exists "read own data"   on public.user_data;
drop policy if exists "insert own data" on public.user_data;
drop policy if exists "update own data" on public.user_data;
create policy "read own data"   on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "insert own data" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "update own data" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.user_data from anon;
grant select, insert, update on public.user_data to authenticated;
