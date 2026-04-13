create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.monthly_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_key text not null,
  year int not null,
  month int not null,
  monthly_income numeric not null,
  hour_rate numeric not null,
  updated_at timestamptz not null default now(),
  unique(user_id, month_key)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month_key text not null,
  year int not null,
  month int not null,
  amount numeric not null,
  minutes int not null,
  category_id text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.monthly_rates enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
for delete to authenticated
using (auth.uid() = id);

drop policy if exists "rates_select_own" on public.monthly_rates;
create policy "rates_select_own" on public.monthly_rates
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "rates_insert_own" on public.monthly_rates;
create policy "rates_insert_own" on public.monthly_rates
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "rates_update_own" on public.monthly_rates;
create policy "rates_update_own" on public.monthly_rates
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "rates_delete_own" on public.monthly_rates;
create policy "rates_delete_own" on public.monthly_rates
for delete to authenticated
using (auth.uid() = user_id);

drop policy if exists "expenses_select_own" on public.expenses;
create policy "expenses_select_own" on public.expenses
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "expenses_insert_own" on public.expenses;
create policy "expenses_insert_own" on public.expenses
for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "expenses_update_own" on public.expenses;
create policy "expenses_update_own" on public.expenses
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "expenses_delete_own" on public.expenses;
create policy "expenses_delete_own" on public.expenses
for delete to authenticated
using (auth.uid() = user_id);
