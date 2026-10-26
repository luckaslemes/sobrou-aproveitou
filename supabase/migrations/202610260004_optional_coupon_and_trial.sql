-- Optional coupon tracking and 14-day trial foundation.
-- Run after migrations 202610240001, 202610260001, 202610260002 and 202610260003.
alter table public.stores
  add column if not exists trial_started_at timestamptz not null default now(),
  add column if not exists subscription_status text not null default 'trial'
    check (subscription_status in ('trial','active','past_due','cancelled','blocked')),
  add column if not exists plan_code text,
  add column if not exists payment_reference text;

-- Coupon is optional and is not a prerequisite for account/store creation.
alter table public.stores alter column coupon_code drop not null;

drop policy if exists "merchant creates own store" on public.stores;
create policy "merchant creates own store"
on public.stores for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and public.current_app_role() = 'merchant'
  and status = 'pending'
);

drop policy if exists "merchant updates own pending store" on public.stores;
create policy "merchant updates own pending store"
on public.stores for update to authenticated
using (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'pending')
with check (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant' and status = 'pending');

-- Store the trial length as a configurable admin setting. This does not charge customers.
insert into public.app_settings (key, value)
values ('merchant_trial_days', '14')
on conflict (key) do update set value = excluded.value, updated_at = now();
