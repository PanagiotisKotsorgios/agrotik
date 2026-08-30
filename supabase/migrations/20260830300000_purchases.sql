-- Purchase tracking (private to the merchant/factory recording it).
-- Records what a buyer actually acquired from a producer, per season.

create table if not exists public.purchases (
  id            uuid primary key default gen_random_uuid(),
  buyer_id      uuid not null references public.profiles(id) on delete cascade,
  farmer_id     uuid not null references public.profiles(id) on delete restrict,
  product_id    uuid not null references public.products(id) on delete restrict,
  season        text not null,                -- π.χ. "2026-2027"
  quantity      numeric not null check (quantity > 0),
  unit          text not null,                -- κιλό, λίτρο, τόνος
  price_per_unit numeric,                     -- προαιρετικό
  currency      text not null default 'EUR',
  notes         text,
  purchased_at  date not null default (now() at time zone 'utc')::date,
  created_at    timestamptz not null default now()
);

create index if not exists purchases_buyer_season_idx on public.purchases (buyer_id, season, purchased_at desc);
create index if not exists purchases_buyer_farmer_idx on public.purchases (buyer_id, farmer_id, purchased_at desc);
create index if not exists purchases_buyer_product_idx on public.purchases (buyer_id, product_id);

alter table public.purchases enable row level security;

-- Only the recording buyer can read/write their own rows.
create policy "purchases owner select"
  on public.purchases for select
  using (auth.uid() = buyer_id);

create policy "purchases owner insert"
  on public.purchases for insert
  with check (auth.uid() = buyer_id);

create policy "purchases owner update"
  on public.purchases for update
  using (auth.uid() = buyer_id)
  with check (auth.uid() = buyer_id);

create policy "purchases owner delete"
  on public.purchases for delete
  using (auth.uid() = buyer_id);
