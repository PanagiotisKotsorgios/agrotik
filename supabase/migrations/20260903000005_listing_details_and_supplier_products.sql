-- Enable rich per-listing content (description + gallery) and let
-- suppliers/producers add new products to the catalog directly
-- without waiting for admin approval. The admin panel still has the
-- final say and can delete any entry.
--
-- Additive only: existing columns and rows are untouched, existing
-- policies are preserved. All new columns are nullable / defaulted.

-- --------------------------------------------------------------------
-- price_listings: description + gallery per listing
-- --------------------------------------------------------------------
alter table public.price_listings
  add column if not exists description text,
  add column if not exists gallery jsonb not null default '[]'::jsonb;

-- --------------------------------------------------------------------
-- products: allow producers and agri_suppliers to publish directly.
-- The existing "products insert by authenticated" policy allows any
-- authenticated user to insert with status='pending'. This adds a
-- privileged-role branch that lets them insert with status='active'
-- straight away. Multiple INSERT policies are OR-combined by RLS, so
-- both coexist safely.
-- --------------------------------------------------------------------
drop policy if exists "products active insert by trusted role" on public.products;
create policy "products active insert by trusted role"
  on public.products for insert
  to authenticated
  with check (
    auth.uid() is not null
    and proposed_by = auth.uid()
    and status = 'active'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.is_active = true
        and p.deleted_at is null
        and p.role in (
          'farmer', 'fisher', 'farmer_fisher',
          'stockbreeder', 'beekeeper',
          'farmer_stockbreeder', 'farmer_beekeeper',
          'agri_supplier'
        )
    )
  );

-- Proposer can delete their own product ONLY while nothing references
-- it. This protects downstream data (price/production/purchase rows)
-- from cascading gaps.
drop policy if exists "products owner delete unused" on public.products;
create policy "products owner delete unused"
  on public.products for delete
  to authenticated
  using (
    proposed_by = auth.uid()
    and not exists (select 1 from public.price_listings pl where pl.product_id = products.id)
    and not exists (select 1 from public.production_listings prl where prl.product_id = products.id)
    and not exists (select 1 from public.purchases pu where pu.product_id = products.id)
  );

-- Admin can always delete (moderation escape hatch).
drop policy if exists "products admin delete" on public.products;
create policy "products admin delete"
  on public.products for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid()
        and admin.role = 'admin'
        and admin.is_active = true
        and admin.deleted_at is null
    )
  );

-- Admin can also update products (e.g. rename, fix typos, retire).
drop policy if exists "products admin update" on public.products;
create policy "products admin update"
  on public.products for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid()
        and admin.role = 'admin'
        and admin.is_active = true
        and admin.deleted_at is null
    )
  );
