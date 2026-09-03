-- Storage bucket that receives locally-uploaded photos attached to
-- price_listings. Public read (URLs are stored in the listings
-- gallery jsonb and served directly from a <img>/<Image> tag).
-- Insert/update/delete are restricted to the object's owner, keyed
-- to the user_id folder prefix.
--
-- Idempotent: the bucket row is upserted and each policy is dropped
-- if it exists before being recreated.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-photos',
  'listing-photos',
  true,
  5242880,  -- 5 MB per file; use client-side compression for larger originals
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  execute 'drop policy if exists "listing photos public read" on storage.objects';
  execute $sql$
    create policy "listing photos public read"
      on storage.objects for select
      using (bucket_id = 'listing-photos')
  $sql$;

  execute 'drop policy if exists "listing photos owner insert" on storage.objects';
  execute $sql$
    create policy "listing photos owner insert"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'listing-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $sql$;

  execute 'drop policy if exists "listing photos owner update" on storage.objects';
  execute $sql$
    create policy "listing photos owner update"
      on storage.objects for update
      to authenticated
      using (
        bucket_id = 'listing-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
      with check (
        bucket_id = 'listing-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $sql$;

  execute 'drop policy if exists "listing photos owner delete" on storage.objects';
  execute $sql$
    create policy "listing photos owner delete"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'listing-photos'
        and (storage.foldername(name))[1] = auth.uid()::text
      )
  $sql$;
end
$$;
