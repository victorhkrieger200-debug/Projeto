begin;

alter table public.profiles enable row level security;

alter table public.profiles
  alter column role set default 'user';

alter table public.profiles
  drop constraint if exists profiles_role_check;

update public.profiles
set
  full_name = nullif(trim(full_name), ''),
  role = case when role = 'admin' then 'admin' else 'user' end;

alter table public.profiles
  alter column role set not null;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.email)), ''),
    'user'
  )
  on conflict (id) do update
    set full_name = coalesce(excluded.full_name, public.profiles.full_name),
        updated_at = now();

  return new;
end;
$$;

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (id, full_name) on table public.profiles to authenticated;
grant update (full_name) on table public.profiles to authenticated;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own_name on public.profiles;

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id and role = 'user');

create policy profiles_update_own_name
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'user');

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user_profile();

commit;
