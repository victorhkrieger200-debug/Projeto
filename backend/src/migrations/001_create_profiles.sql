create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy if not exists "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy if not exists "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);

create policy if not exists "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);
