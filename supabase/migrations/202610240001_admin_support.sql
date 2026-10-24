-- Sobrou, Aproveitou! — base inicial de administração e suporte.
-- Execute no SQL Editor do Supabase. Revise em ambiente de teste antes de produção.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'customer' check (role in ('admin','support','merchant','customer')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  category text,
  city text,
  status text not null default 'pending' check (status in ('pending','approved','active','blocked','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  assigned_to uuid references public.profiles(id) on delete set null,
  subject text not null default 'Atendimento ao comércio',
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null default '',
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists stores_owner_id_idx on public.stores(owner_id);
create index if not exists stores_status_idx on public.stores(status);
create index if not exists conversations_store_id_idx on public.support_conversations(store_id);
create index if not exists conversations_assigned_to_idx on public.support_conversations(assigned_to);
create index if not exists messages_conversation_created_idx on public.support_messages(conversation_id, created_at);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    'customer'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;

create or replace function public.is_admin_or_support()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('admin','support'), false)
$$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.app_settings enable row level security;

revoke all on public.profiles, public.stores, public.support_conversations, public.support_messages, public.app_settings from anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.stores to authenticated;
grant select, insert, update on public.support_conversations to authenticated;
grant select, insert on public.support_messages to authenticated;
grant select, insert, update on public.app_settings to authenticated;

drop policy if exists "profile self or admin read" on public.profiles;
create policy "profile self or admin read" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.current_app_role() = 'admin');

drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "merchant sees own store admin support see all" on public.stores;
create policy "merchant sees own store admin support see all" on public.stores for select to authenticated
using (owner_id = (select auth.uid()) or public.is_admin_or_support());

drop policy if exists "merchant creates own store" on public.stores;
create policy "merchant creates own store" on public.stores for insert to authenticated
with check (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant');

drop policy if exists "admin updates stores" on public.stores;
create policy "admin updates stores" on public.stores for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "merchant updates own pending store" on public.stores;
create policy "merchant updates own pending store" on public.stores for update to authenticated
using (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'pending')
with check (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'pending');

drop policy if exists "support or store owner sees conversations" on public.support_conversations;
create policy "support or store owner sees conversations" on public.support_conversations for select to authenticated
using (public.is_admin_or_support() or created_by = (select auth.uid()) or exists (
  select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid())
));

drop policy if exists "store owner creates conversations" on public.support_conversations;
create policy "store owner creates conversations" on public.support_conversations for insert to authenticated
with check (
  created_by = (select auth.uid()) and
  (public.current_app_role() = 'merchant' or public.current_app_role() = 'customer') and
  (store_id is null or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = (select auth.uid())))
);

drop policy if exists "support updates conversations" on public.support_conversations;
create policy "support updates conversations" on public.support_conversations for update to authenticated
using (public.is_admin_or_support())
with check (public.is_admin_or_support());

drop policy if exists "conversation participants read messages" on public.support_messages;
create policy "conversation participants read messages" on public.support_messages for select to authenticated
using (exists (
  select 1 from public.support_conversations c
  where c.id = conversation_id and (
    public.is_admin_or_support() or c.created_by = (select auth.uid()) or
    exists (select 1 from public.stores s where s.id = c.store_id and s.owner_id = (select auth.uid()))
  )
));

drop policy if exists "conversation participants send messages" on public.support_messages;
create policy "conversation participants send messages" on public.support_messages for insert to authenticated
with check (
  sender_id = (select auth.uid()) and exists (
    select 1 from public.support_conversations c
    where c.id = conversation_id and (
      public.is_admin_or_support() or c.created_by = (select auth.uid()) or
      exists (select 1 from public.stores s where s.id = c.store_id and s.owner_id = (select auth.uid()))
    )
  )
);

drop policy if exists "admin reads settings" on public.app_settings;
create policy "admin reads settings" on public.app_settings for select to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists "admin writes settings" on public.app_settings;
create policy "admin writes settings" on public.app_settings for insert to authenticated
with check (public.current_app_role() = 'admin');

drop policy if exists "admin updates settings" on public.app_settings;
create policy "admin updates settings" on public.app_settings for update to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Depois de criar seu usuário em Authentication > Users, copie o UUID e execute:
-- update public.profiles set role = 'admin' where id = 'COLE-SEU-UUID-AQUI';
-- Faça isso manualmente no SQL Editor. Nunca permita que o frontend escolha a própria função.
