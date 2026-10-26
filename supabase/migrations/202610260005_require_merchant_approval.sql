-- Require administrator approval before a merchant can publish offers.
-- Run after 202610260004_optional_coupon_and_trial.sql.

drop policy if exists "merchant publishes own offers" on public.offers;
create policy "merchant publishes own offers"
on public.offers for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and public.current_app_role() = 'merchant'
  and status = 'published'
  and is_active = true
  and exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.owner_id = (select auth.uid())
      and s.status in ('approved', 'active')
  )
);

drop policy if exists "merchant manages own offers" on public.offers;
create policy "merchant manages own offers"
on public.offers for update to authenticated
using (
  owner_id = (select auth.uid())
  and public.current_app_role() = 'merchant'
)
with check (
  owner_id = (select auth.uid())
  and public.current_app_role() = 'merchant'
  and exists (
    select 1 from public.stores s
    where s.id = store_id
      and s.owner_id = (select auth.uid())
      and s.status in ('approved', 'active')
  )
);
