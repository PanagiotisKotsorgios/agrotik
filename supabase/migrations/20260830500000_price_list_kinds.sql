-- Multiple kinds of price lists (esp. for factories) with role-based visibility.
--   buy_from_producer  → shown to farmers in "Βρες Αγοραστή"
--   buy_from_merchant  → shown to merchants
--   sell_wholesale     → shown to merchants+factories in "Αγοράζοντας χονδρικά"
--   sell_retail        → shown to everyone (public listings for retail buyers)

create type public.price_list_kind as enum (
  'buy_from_producer',
  'buy_from_merchant',
  'sell_wholesale',
  'sell_retail'
);

alter table public.price_listings
  add column if not exists kind public.price_list_kind not null default 'buy_from_producer',
  add column if not exists title text;

create index if not exists price_listings_kind_idx on public.price_listings (kind, is_active);

-- Legacy rows keep default kind (buy_from_producer) so nothing breaks.
