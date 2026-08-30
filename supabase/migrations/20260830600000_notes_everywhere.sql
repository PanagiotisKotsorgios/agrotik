-- Ensure notes/description available on every user-created listing type.
alter table public.production_listings
  add column if not exists notes text,
  add column if not exists title text;

alter table public.purchases
  add column if not exists description text;
