-- Reforça integridade e segurança da tabela pública de perfis.

alter table public.profiles
  alter column role set default 'user',
  alter column role set not null;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'user'));

alter table public.profiles
  alter column full_name type text using nullif(trim(full_name), '');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
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
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.email)), ''),
    'user'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        updated_at = now();

  return new;
end;
$$;

revoke all on table public.profiles from public;
grant select, insert, update on table public.profiles to authenticated;
