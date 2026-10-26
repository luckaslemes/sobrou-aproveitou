-- Merchant onboarding and admin-controlled coupons for Sobrou, Aproveitou!
create extension if not exists pgcrypto;

alter table public.stores
  add column if not exists owner_name text,
  add column if not exists document_number text,
  add column if not exists coupon_code text,
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists description text;

create table if not exists public.merchant_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  is_active boolean not null default true,
  max_uses integer,
  used_count integer not null default 0,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint merchant_coupon_code_format check (code = upper(trim(code)) and char_length(code) between 3 and 40),
  constraint merchant_coupon_counts check (used_count >= 0 and (max_uses is null or max_uses >= 1))
);

create index if not exists merchant_coupons_active_idx on public.merchant_coupons(is_active, expires_at);
alter table public.merchant_coupons enable row level security;
revoke all on public.merchant_coupons from anon, authenticated;
grant select, insert, update, delete on public.merchant_coupons to authenticated;

drop policy if exists "authenticated see available merchant coupons" on public.merchant_coupons;
create policy "authenticated see available merchant coupons"
on public.merchant_coupons for select to authenticated
using (
  is_active = true
  and (expires_at is null or expires_at > now())
  and (max_uses is null or used_count < max_uses)
);

drop policy if exists "admins manage merchant coupons" on public.merchant_coupons;
create policy "admins manage merchant coupons"
on public.merchant_coupons for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- A user may choose the merchant role during sign-up, but can never assign themselves admin/support.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  requested_role text;
begin
  requested_role := case when new.raw_user_meta_data ->> 'role' = 'merchant' then 'merchant' else 'customer' end;
  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''), requested_role)
  on conflict (id) do update
    set email = excluded.email,
        display_name = case when excluded.display_name <> '' then excluded.display_name else public.profiles.display_name end,
        role = case when public.profiles.role = 'admin' then 'admin' else excluded.role end;
  return new;
end;
$$;

-- Offers belong to a merchant; public users can only read active published offers.
alter table public.offers add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.offers add column if not exists store_id uuid references public.stores(id) on delete set null;
alter table public.offers add column if not exists updated_at timestamptz not null default now();
alter table public.offers enable row level security;

drop policy if exists "Anyone can read published active offers" on public.offers;
create policy "Anyone can read published active offers"
on public.offers for select to anon, authenticated
using (
  (status = 'published' and is_active = true and (expires_at is null or expires_at > now()))
  or owner_id = (select auth.uid())
  or public.current_app_role() = 'admin'
);

drop policy if exists "merchant creates own draft offers" on public.offers;
create policy "merchant creates own draft offers"
on public.offers for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and public.current_app_role() = 'merchant'
  and status = 'draft'
);

drop policy if exists "merchant updates own draft offers" on public.offers;
create policy "merchant updates own draft offers"
on public.offers for update to authenticated
using (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'draft')
with check (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'draft');

drop policy if exists "admins manage offers" on public.offers;
create policy "admins manage offers"
on public.offers for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- Store registration is pending by default and coupon must exist and be available.
drop policy if exists "merchant creates own store" on public.stores;
create policy "merchant creates own store"
on public.stores for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and public.current_app_role() = 'merchant'
  and status = 'pending'
  and exists (
    select 1 from public.merchant_coupons c
    where c.code = upper(trim(coupon_code))
      and c.is_active = true
      and (c.expires_at is null or c.expires_at > now())
      and (c.max_uses is null or c.used_count < c.max_uses)
  )
);

drop policy if exists "merchant updates own pending store" on public.stores;
create policy "merchant updates own pending store"
on public.stores for update to authenticated
using (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'pending')
with check (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'pending');

-- NOTE: coupon redemption counters should be incremented server-side in a production RPC
-- to prevent concurrent registrations from exceeding max_uses.
