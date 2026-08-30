-- AGROTIK MVP — initial schema
-- Enable required extensions

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Enums

create type public.user_role as enum ('farmer','merchant','factory','admin');
create type public.product_status as enum ('active','pending','rejected');
create type public.notification_kind as enum ('price_changed');

-- ============================================================
-- regions (seeded, 74 Νομοί/Περιφερειακές Ενότητες)
-- ============================================================
create table public.regions (
  code    text primary key,
  name_el text not null
);

alter table public.regions enable row level security;

create policy "regions readable by all"
  on public.regions for select
  using (true);

-- ============================================================
-- profiles (1-1 με auth.users)
-- ============================================================
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          public.user_role not null,
  display_name  text not null,
  phone         text not null,
  region_code   text not null references public.regions(code),
  municipality  text,
  avatar_path   text,
  bio           text,
  website       text,
  vat_number    text,
  is_public     boolean not null default true,
  is_active     boolean not null default true,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index profiles_role_active_idx
  on public.profiles (role, is_active, is_public, region_code);

alter table public.profiles enable row level security;

-- Public read: merchants/factories always visible; farmers only if is_public
create policy "profiles public read"
  on public.profiles for select
  using (
    is_active = true
    and deleted_at is null
    and (
      role in ('merchant','factory')
      or (role = 'farmer' and is_public = true)
    )
  );

-- Owner reads own row always (even if suspended)
create policy "profiles owner read"
  on public.profiles for select
  using (auth.uid() = id);

-- Owner updates own row (server actions guard against role changes)
create policy "profiles owner update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Insert via signup handled by server action with service role
-- (owner insert is also allowed for safety)
create policy "profiles owner insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- updated_at trigger
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============================================================
-- products (global catalog)
-- ============================================================
create table public.products (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  name_el           text not null,
  category          text not null,
  unit              text not null,
  attributes_schema jsonb not null default '{}'::jsonb,
  status            public.product_status not null default 'pending',
  proposed_by       uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index products_status_category_idx on public.products (status, category);

alter table public.products enable row level security;

create policy "products active readable by all"
  on public.products for select
  using (status = 'active');

create policy "products pending readable by proposer"
  on public.products for select
  using (status = 'pending' and proposed_by = auth.uid());

create policy "products insert by authenticated"
  on public.products for insert
  with check (
    auth.uid() is not null
    and proposed_by = auth.uid()
    and status = 'pending'
  );

-- ============================================================
-- price_listings (τιμοκατάλογος)
-- ============================================================
create table public.price_listings (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  variants    jsonb not null default '[]'::jsonb,
  region_code text not null references public.regions(code),
  notes       text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index price_listings_search_idx
  on public.price_listings (product_id, region_code, is_active);

create index price_listings_variants_gin
  on public.price_listings using gin (variants jsonb_path_ops);

create trigger price_listings_set_updated_at
  before update on public.price_listings
  for each row execute function public.set_updated_at();

alter table public.price_listings enable row level security;

create policy "price_listings public read"
  on public.price_listings for select
  using (
    is_active = true
    and exists (
      select 1 from public.profiles p
      where p.id = owner_id
        and p.is_active = true
        and p.deleted_at is null
        and p.role in ('merchant','factory')
    )
  );

create policy "price_listings owner write"
  on public.price_listings for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================
-- production_listings (παραγωγή)
-- ============================================================
create table public.production_listings (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete restrict,
  attributes      jsonb not null default '{}'::jsonb,
  quantity        numeric not null check (quantity > 0),
  unit            text,
  region_code     text not null references public.regions(code),
  available_from  date,
  available_until date,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index production_listings_search_idx
  on public.production_listings (product_id, region_code, is_active, available_from, available_until);

create trigger production_listings_set_updated_at
  before update on public.production_listings
  for each row execute function public.set_updated_at();

alter table public.production_listings enable row level security;

create policy "production_listings public read"
  on public.production_listings for select
  using (
    is_active = true
    and exists (
      select 1 from public.profiles p
      where p.id = owner_id
        and p.is_active = true
        and p.deleted_at is null
        and p.role = 'farmer'
        and p.is_public = true
    )
  );

create policy "production_listings owner write"
  on public.production_listings for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- ============================================================
-- favorites (farmer → merchant/factory)
-- ============================================================
create table public.favorites (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  target_id  uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, target_id),
  check (user_id <> target_id)
);

create index favorites_target_idx on public.favorites (target_id);

alter table public.favorites enable row level security;

create policy "favorites owner all"
  on public.favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- notifications
-- ============================================================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       public.notification_kind not null,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications owner select"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "notifications owner update"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Inserts happen only from server actions via service role
-- (no owner insert policy — notifications are system-generated)

-- ============================================================
-- deal_marks (analytics flag)
-- ============================================================
create table public.deal_marks (
  id         uuid primary key default gen_random_uuid(),
  farmer_id  uuid not null references public.profiles(id) on delete cascade,
  target_id  uuid not null references public.profiles(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  created_at timestamptz not null default now()
);

create index deal_marks_farmer_idx on public.deal_marks (farmer_id, created_at desc);

alter table public.deal_marks enable row level security;

create policy "deal_marks owner select"
  on public.deal_marks for select
  using (auth.uid() = farmer_id);

create policy "deal_marks owner insert"
  on public.deal_marks for insert
  with check (auth.uid() = farmer_id);

-- ============================================================
-- Realtime publication (for in-app notifications live-update)
-- ============================================================
alter publication supabase_realtime add table public.notifications;

-- Storage bucket policies moved to a separate migration; MVP-scope
-- avatar upload UI is post-MVP so we don't wire storage in the local stack.
