-- SIR Rens & Pleie: secure order tracking for a static GitHub Pages site.
-- 1) Replace Sirrenspleie@gmail.com below with your exact Supabase login email.
-- 2) Run the whole file in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  tracking_token uuid unique not null default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  service text not null,
  object_type text,
  problem text,
  need_visit boolean not null default false,
  address text,
  estimated_price text,
  status text not null default 'sent' check (status in ('sent','review','contact','confirmed','scheduled','completed','cancelled')),
  status_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);



-- Review SMS tracking. Safe to run on an existing project.
alter table public.orders add column if not exists review_sms_status text not null default 'not_sent'
  check (review_sms_status in ('not_sent','sending','sent','failed'));
alter table public.orders add column if not exists review_sms_sent_at timestamptz;
alter table public.orders add column if not exists review_sms_sid text;
alter table public.orders add column if not exists review_sms_error text;

alter table public.orders enable row level security;
revoke all on public.orders from anon;
revoke all on public.orders from authenticated;

grant select, update on public.orders to authenticated;

-- Only the owner's authenticated email may list and change orders.
drop policy if exists "admin can read orders" on public.orders;
create policy "admin can read orders" on public.orders
for select to authenticated
using ((auth.jwt() ->> 'email') = 'Sirrenspleie@gmail.com');

drop policy if exists "admin can update orders" on public.orders;
create policy "admin can update orders" on public.orders
for update to authenticated
using ((auth.jwt() ->> 'email') = 'Sirrenspleie@gmail.com')
with check ((auth.jwt() ->> 'email') = 'Sirrenspleie@gmail.com');

-- Public RPC: creates one order but does not expose the table.
create or replace function public.create_public_order(
  p_order_number text,
  p_customer_name text,
  p_phone text,
  p_service text,
  p_object_type text,
  p_problem text,
  p_need_visit boolean,
  p_address text,
  p_estimated_price text
) returns table(order_number text, tracking_token uuid, status text, created_at timestamptz)
language plpgsql security definer set search_path = public
as $$
begin
  return query
  insert into public.orders(order_number, customer_name, phone, service, object_type, problem, need_visit, address, estimated_price)
  values (p_order_number, left(p_customer_name,120), left(p_phone,40), left(p_service,120), left(coalesce(p_object_type,''),200), left(coalesce(p_problem,''),2000), p_need_visit, left(coalesce(p_address,''),300), left(coalesce(p_estimated_price,''),80))
  returning orders.order_number, orders.tracking_token, orders.status, orders.created_at;
end;
$$;

grant execute on function public.create_public_order(text,text,text,text,text,text,boolean,text,text) to anon, authenticated;

-- Public RPC: returns only the order matching its unguessable tracking token.
create or replace function public.get_public_order_status(p_tracking_token uuid)
returns table(order_number text, service text, status text, status_message text, created_at timestamptz, updated_at timestamptz)
language sql security definer stable set search_path = public
as $$
  select o.order_number, o.service, o.status, o.status_message, o.created_at, o.updated_at
  from public.orders o
  where o.tracking_token = p_tracking_token
  limit 1;
$$;

grant execute on function public.get_public_order_status(uuid) to anon, authenticated;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();


-- Editable website settings (theme and main copy).
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  primary_color text not null default '#c99a4b',
  background_color text not null default '#07111f',
  card_color text not null default '#101d2d',
  hero_title text not null default 'Renere interiør. Friskere hjem. Bedre inntrykk.',
  hero_text text not null default 'Profesjonell dyprens av bilinteriør og tekstilmøbler. Send bilder og få en individuell vurdering.',
  promo_text text not null default '',
  promo_enabled boolean not null default false,
  promo_code text not null default 'SIR10',
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;
revoke all on public.site_settings from anon, authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
drop policy if exists "public can read site settings" on public.site_settings;
create policy "public can read site settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admin can insert site settings" on public.site_settings;
create policy "admin can insert site settings" on public.site_settings for insert to authenticated
with check ((auth.jwt() ->> 'email') = 'Sirrenspleie@gmail.com');
drop policy if exists "admin can update site settings" on public.site_settings;
create policy "admin can update site settings" on public.site_settings for update to authenticated
using ((auth.jwt() ->> 'email') = 'Sirrenspleie@gmail.com')
with check ((auth.jwt() ->> 'email') = 'Sirrenspleie@gmail.com');
