-- Merchants can publish their own offers immediately; admin retains moderation rights.
drop policy if exists "merchant creates own draft offers" on public.offers;
drop policy if exists "merchant updates own draft offers" on public.offers;
drop policy if exists "merchant publishes own offers" on public.offers;
create policy "merchant publishes own offers"
on public.offers for insert to authenticated
with check (
  owner_id = (select auth.uid())
  and public.current_app_role() = 'merchant'
  and status = 'published'
  and is_active = true
);

drop policy if exists "merchant manages own offers" on public.offers;
create policy "merchant manages own offers"
on public.offers for update to authenticated
using (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant')
with check (owner_id = (select auth.uid()) and public.current_app_role() = 'merchant');

-- Keep public visibility limited to active, published, non-expired offers.
drop policy if exists "Anyone can read published active offers" on public.offers;
create policy "Anyone can read published active offers"
on public.offers for select to anon, authenticated
using (
  (status = 'published' and is_active = true and (expires_at is null or expires_at > now()))
  or owner_id = (select auth.uid())
  or public.current_app_role() = 'admin'
);
