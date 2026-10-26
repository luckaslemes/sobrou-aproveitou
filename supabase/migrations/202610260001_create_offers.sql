-- Sobrou, Aproveitou! - public offers table
-- Run this file in Supabase SQL Editor before expecting offers to appear.
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null default 'Outros',
  store_name text not null,
  neighborhood text not null default 'Londrina, PR',
  city text not null default 'Londrina',
  original_price numeric(10,2),
  price numeric(10,2) not null check (price >= 0),
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'expired')),
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offers enable row level security;
drop policy if exists "Anyone can read published active offers" on public.offers;
create policy "Anyone can read published active offers"
  on public.offers for select
  using (status = 'published' and is_active = true and (expires_at is null or expires_at > now()));

grant select on public.offers to anon, authenticated;
