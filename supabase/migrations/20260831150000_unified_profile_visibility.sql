-- Respect the is_public flag for every public account type.

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select
  using (
    is_active = true
    and is_public = true
    and deleted_at is null
    and role in ('farmer', 'merchant', 'factory')
  );

drop policy if exists "price_listings public read" on public.price_listings;
create policy "price_listings public read"
  on public.price_listings for select
  using (
    is_active = true
    and exists (
      select 1 from public.profiles p
      where p.id = owner_id
        and p.is_active = true
        and p.is_public = true
        and p.deleted_at is null
        and p.role in ('merchant', 'factory')
    )
  );
