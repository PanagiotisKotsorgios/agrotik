-- Fisher access mirrors farmer access without changing any existing profile or
-- listing. The seafood catalog entry is additive and keeps species/details as
-- free text so users are not restricted to a fixed fish list.

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select
  using (
    is_active = true
    and is_public = true
    and deleted_at is null
    and role in ('farmer', 'fisher', 'farmer_fisher', 'merchant', 'factory')
  );

drop policy if exists "production_listings public read" on public.production_listings;
create policy "production_listings public read"
  on public.production_listings for select
  using (
    is_active = true
    and exists (
      select 1 from public.profiles p
      where p.id = owner_id
        and p.is_active = true
        and p.is_public = true
        and p.deleted_at is null
        and p.role in ('farmer', 'fisher', 'farmer_fisher')
    )
  );

drop policy if exists "production_listings owner write" on public.production_listings;
create policy "production_listings owner write"
  on public.production_listings for all
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.deleted_at is null
        and p.role in ('farmer', 'fisher', 'farmer_fisher')
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.deleted_at is null
        and p.role in ('farmer', 'fisher', 'farmer_fisher')
    )
  );

insert into public.products (slug, name_el, category, unit, attributes_schema, status)
values (
  'seafood',
  'Ψάρια & θαλασσινά',
  'Αλιευτικά είδη',
  'κιλό',
  jsonb_build_object(
    'species', jsonb_build_object(
      'type', 'text',
      'label', 'Είδος αλιεύματος'
    ),
    'condition', jsonb_build_object(
      'type', 'text',
      'label', 'Μορφή / κατάσταση'
    ),
    'size', jsonb_build_object(
      'type', 'text',
      'label', 'Μέγεθος / διαλογή'
    ),
    'origin', jsonb_build_object(
      'type', 'text',
      'label', 'Περιοχή αλίευσης / προέλευση'
    )
  ),
  'active'
)
on conflict (slug) do nothing;
