-- Security and audience hardening. This migration is intentionally additive/
-- policy-only so it can be reviewed and applied before the matching app deploy.

-- A profile owner previously had a broad UPDATE policy and could call PostgREST
-- directly to change protected fields such as role/is_active. Keep normal profile
-- editing, but protect system-owned fields at the database boundary.
create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() = old.id then
    if new.is_active is distinct from old.is_active
      or new.deleted_at is distinct from old.deleted_at
      or new.created_at is distinct from old.created_at then
      raise exception 'Protected profile fields cannot be changed by the profile owner';
    end if;

    if new.role is distinct from old.role and not (
      (old.role = 'farmer' and new.role in ('farmer', 'farmer_fisher'))
      or (old.role = 'fisher' and new.role in ('fisher', 'farmer_fisher'))
      or (old.role = 'farmer_fisher' and new.role = 'farmer_fisher')
    ) then
      raise exception 'This role change is not allowed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_system_fields on public.profiles;
create trigger profiles_protect_system_fields
  before update on public.profiles
  for each row execute function public.protect_profile_system_fields();

drop policy if exists "profiles owner update" on public.profiles;
create policy "profiles owner update"
  on public.profiles for update
  using (
    auth.uid() = id
    and is_active = true
    and deleted_at is null
  )
  with check (
    auth.uid() = id
    and is_active = true
    and deleted_at is null
  );

-- Anonymous visitors only need the public presentation columns. Contact and
-- legal identifiers remain available to authenticated users, subject to RLS.
revoke select on table public.profiles from anon;
grant select (
  id,
  role,
  display_name,
  region_code,
  municipality,
  avatar_path,
  avatar_url,
  cover_url,
  gallery,
  bio,
  website,
  year_founded,
  employees_range,
  certifications,
  specialties,
  opening_hours,
  is_public,
  is_active,
  deleted_at,
  created_at,
  updated_at
) on table public.profiles to anon;

-- Price-list kinds have distinct audiences. Public producer-buying and retail
-- lists remain public; trade-only lists require a merchant/factory account.
drop policy if exists "price_listings public read" on public.price_listings;
create policy "price_listings audience read"
  on public.price_listings for select
  using (
    is_active = true
    and exists (
      select 1
      from public.profiles owner
      where owner.id = owner_id
        and owner.is_active = true
        and owner.is_public = true
        and owner.deleted_at is null
        and owner.role in ('merchant', 'factory')
    )
    and (
      kind in ('buy_from_producer', 'sell_retail')
      or exists (
        select 1
        from public.profiles viewer
        where viewer.id = auth.uid()
          and viewer.is_active = true
          and viewer.deleted_at is null
          and viewer.role in ('merchant', 'factory')
      )
    )
  );

-- Listing write access must follow the current account state and role, even
-- when requests bypass the application UI and call PostgREST directly.
drop policy if exists "price_listings owner write" on public.price_listings;
create policy "price_listings owner write"
  on public.price_listings for all
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles owner
      where owner.id = auth.uid()
        and owner.is_active = true
        and owner.deleted_at is null
        and owner.role in ('merchant', 'factory')
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles owner
      where owner.id = auth.uid()
        and owner.is_active = true
        and owner.deleted_at is null
        and owner.role in ('merchant', 'factory')
    )
  );

-- Expired production stays available to its owner through the owner policy,
-- but is no longer exposed as current stock to public visitors.
drop policy if exists "production_listings public read" on public.production_listings;
create policy "production_listings public read"
  on public.production_listings for select
  using (
    is_active = true
    and (available_until is null or available_until >= current_date)
    and exists (
      select 1 from public.profiles owner
      where owner.id = owner_id
        and owner.is_active = true
        and owner.is_public = true
        and owner.deleted_at is null
        and owner.role in ('farmer', 'fisher', 'farmer_fisher')
    )
  );

-- Both participants need to see a recorded deal. The producer remains the only
-- participant allowed to create a mark until mutual confirmation is introduced.
drop policy if exists "deal_marks target select" on public.deal_marks;
create policy "deal_marks target select"
  on public.deal_marks for select
  using (auth.uid() = target_id);

drop policy if exists "deal_marks owner insert" on public.deal_marks;
create policy "deal_marks producer insert"
  on public.deal_marks for insert
  with check (
    auth.uid() = farmer_id
    and exists (
      select 1 from public.profiles producer
      where producer.id = auth.uid()
        and producer.role in ('farmer', 'fisher', 'farmer_fisher')
        and producer.is_active = true
        and producer.deleted_at is null
    )
    and exists (
      select 1 from public.profiles buyer
      where buyer.id = target_id
        and buyer.role in ('merchant', 'factory')
        and buyer.is_active = true
        and buyer.deleted_at is null
    )
  );

drop policy if exists "products insert by authenticated" on public.products;
create policy "products propose by active account"
  on public.products for insert
  with check (
    proposed_by = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.profiles proposer
      where proposer.id = auth.uid()
        and proposer.is_active = true
        and proposer.deleted_at is null
        and proposer.role <> 'admin'
    )
  );

-- Structured moderation categories make reports easier to triage while the
-- text reason remains available for context. Existing reports map to "other".
alter table public.reports
  add column if not exists category text not null default 'other'
  check (category in ('misleading', 'spam', 'abuse', 'privacy', 'unsafe', 'other'));

drop policy if exists "reports reporter insert" on public.reports;
create policy "reports active reporter insert"
  on public.reports for insert
  with check (
    auth.uid() = reporter_id
    and status = 'open'
    and exists (
      select 1 from public.profiles reporter
      where reporter.id = auth.uid()
        and reporter.is_active = true
        and reporter.deleted_at is null
    )
  );

-- New uploads use object storage instead of inflating the profiles row with
-- base64 strings when Storage is installed. The bundled self-host stack does
-- not currently run the Storage service, so this block deliberately skips
-- itself there and the app keeps its backwards-compatible data-URL fallback.
do $$
begin
  if to_regclass('storage.buckets') is null or to_regclass('storage.objects') is null then
    raise notice 'Supabase Storage is not installed; skipping profile-media bucket';
    return;
  end if;

  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    'profile-media',
    'profile-media',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  )
  on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

  execute 'drop policy if exists "profile media public read" on storage.objects';
  execute 'create policy "profile media public read" on storage.objects for select using (bucket_id = ''profile-media'')';
  execute 'drop policy if exists "profile media owner insert" on storage.objects';
  execute 'create policy "profile media owner insert" on storage.objects for insert to authenticated with check (bucket_id = ''profile-media'' and (storage.foldername(name))[1] = auth.uid()::text)';
  execute 'drop policy if exists "profile media owner update" on storage.objects';
  execute 'create policy "profile media owner update" on storage.objects for update to authenticated using (bucket_id = ''profile-media'' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = ''profile-media'' and (storage.foldername(name))[1] = auth.uid()::text)';
  execute 'drop policy if exists "profile media owner delete" on storage.objects';
  execute 'create policy "profile media owner delete" on storage.objects for delete to authenticated using (bucket_id = ''profile-media'' and (storage.foldername(name))[1] = auth.uid()::text)';
end
$$;

drop policy if exists "notifications owner delete" on public.notifications;
create policy "notifications owner delete"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Shared, privacy-preserving rate limits for horizontally scaled app servers.
create table if not exists public.rate_limits (
  bucket text not null,
  key_hash text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count > 0),
  primary key (bucket, key_hash)
);
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.rate_limits%rowtype;
begin
  if length(p_bucket) not between 1 and 80
    or length(p_key_hash) <> 64
    or p_limit not between 1 and 10000
    or p_window_seconds not between 1 and 2592000 then
    return false;
  end if;

  insert into public.rate_limits (bucket, key_hash, window_started_at, request_count)
  values (p_bucket, p_key_hash, now(), 1)
  on conflict (bucket, key_hash) do update set
    window_started_at = case
      when public.rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= now() then now()
      else public.rate_limits.window_started_at
    end,
    request_count = case
      when public.rate_limits.window_started_at + make_interval(secs => p_window_seconds) <= now() then 1
      else public.rate_limits.request_count + 1
    end
  returning * into current_row;

  return current_row.request_count <= p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text, text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;

-- Message participants cannot mutate message content after sending. Recipients
-- may only change the read timestamp.
create or replace function public.protect_message_content()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
    or new.sender_id is distinct from old.sender_id
    or new.recipient_id is distinct from old.recipient_id
    or new.body is distinct from old.body
    or new.created_at is distinct from old.created_at then
    raise exception 'Message content is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_protect_content on public.messages;
create trigger messages_protect_content
  before update on public.messages
  for each row execute function public.protect_message_content();

drop policy if exists "messages sender insert" on public.messages;
create policy "messages active sender insert"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and sender_id <> recipient_id
    and exists (
      select 1 from public.profiles sender
      where sender.id = auth.uid() and sender.is_active = true and sender.deleted_at is null
    )
    and exists (
      select 1 from public.profiles recipient
      where recipient.id = recipient_id and recipient.is_active = true and recipient.deleted_at is null
    )
  );

drop policy if exists "favorites owner all" on public.favorites;
drop policy if exists "favorites active owner select" on public.favorites;
drop policy if exists "favorites active owner insert" on public.favorites;
drop policy if exists "favorites active owner delete" on public.favorites;
create policy "favorites active owner select"
  on public.favorites for select
  using (auth.uid() = user_id);
create policy "favorites active owner insert"
  on public.favorites for insert
  with check (
    auth.uid() = user_id
    and user_id <> target_id
    and exists (
      select 1 from public.profiles owner
      where owner.id = auth.uid() and owner.is_active = true and owner.deleted_at is null and owner.role <> 'admin'
    )
    and exists (
      select 1 from public.profiles target
      where target.id = target_id and target.is_active = true and target.is_public = true and target.deleted_at is null
    )
  );
create policy "favorites active owner delete"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- Suspended/deleted accounts must not retain direct REST access merely because
-- an old JWT remains valid.
drop policy if exists "messages participants read" on public.messages;
create policy "messages active participants read"
  on public.messages for select
  using (
    (auth.uid() = sender_id or auth.uid() = recipient_id)
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  );

drop policy if exists "messages recipient update read" on public.messages;
create policy "messages active recipient update read"
  on public.messages for update
  using (
    auth.uid() = recipient_id
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  )
  with check (auth.uid() = recipient_id);

drop policy if exists "notifications owner select" on public.notifications;
drop policy if exists "notifications owner update" on public.notifications;
drop policy if exists "notifications owner delete" on public.notifications;
create policy "notifications active owner select"
  on public.notifications for select
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  );
create policy "notifications active owner update"
  on public.notifications for update
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  )
  with check (auth.uid() = user_id);
create policy "notifications active owner delete"
  on public.notifications for delete
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  );

drop policy if exists "reports reporter select" on public.reports;
create policy "reports active reporter select"
  on public.reports for select
  using (
    auth.uid() = reporter_id
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  );

drop policy if exists "deal_marks owner select" on public.deal_marks;
drop policy if exists "deal_marks target select" on public.deal_marks;
create policy "deal_marks active producer select"
  on public.deal_marks for select
  using (
    auth.uid() = farmer_id
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  );
create policy "deal_marks active target select"
  on public.deal_marks for select
  using (
    auth.uid() = target_id
    and exists (
      select 1 from public.profiles viewer
      where viewer.id = auth.uid() and viewer.is_active = true and viewer.deleted_at is null
    )
  );

drop policy if exists "purchases owner select" on public.purchases;
drop policy if exists "purchases owner insert" on public.purchases;
drop policy if exists "purchases owner update" on public.purchases;
drop policy if exists "purchases owner delete" on public.purchases;
create policy "purchases active owner select"
  on public.purchases for select
  using (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.profiles buyer
      where buyer.id = auth.uid() and buyer.role in ('merchant', 'factory') and buyer.is_active = true and buyer.deleted_at is null
    )
  );
create policy "purchases active owner insert"
  on public.purchases for insert
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.profiles buyer
      where buyer.id = auth.uid() and buyer.role in ('merchant', 'factory') and buyer.is_active = true and buyer.deleted_at is null
    )
    and exists (
      select 1 from public.profiles producer
      where producer.id = farmer_id and producer.role in ('farmer', 'fisher', 'farmer_fisher') and producer.is_active = true and producer.deleted_at is null
    )
    and exists (select 1 from public.products product where product.id = product_id and product.status = 'active')
  );
create policy "purchases active owner update"
  on public.purchases for update
  using (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.profiles buyer
      where buyer.id = auth.uid() and buyer.role in ('merchant', 'factory') and buyer.is_active = true and buyer.deleted_at is null
    )
  )
  with check (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.profiles producer
      where producer.id = farmer_id and producer.role in ('farmer', 'fisher', 'farmer_fisher') and producer.is_active = true and producer.deleted_at is null
    )
    and exists (select 1 from public.products product where product.id = product_id and product.status = 'active')
  );
create policy "purchases active owner delete"
  on public.purchases for delete
  using (
    auth.uid() = buyer_id
    and exists (
      select 1 from public.profiles buyer
      where buyer.id = auth.uid() and buyer.role in ('merchant', 'factory') and buyer.is_active = true and buyer.deleted_at is null
    )
  );

-- Admin audit log: append-only, service-role written.
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_at_idx
  on public.admin_audit(created_at desc);
create index if not exists admin_audit_actor_id_idx
  on public.admin_audit(actor_id);
alter table public.admin_audit enable row level security;
-- Only admins read; only service role writes (implicit — no policy).
drop policy if exists "admin_audit admin read" on public.admin_audit;
create policy "admin_audit admin read"
  on public.admin_audit for select
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
        and admin.is_active = true and admin.deleted_at is null
    )
  );

-- Report resolutions: dedicated moderation trail per report.
create table if not exists public.report_resolutions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  resolver_id uuid references public.profiles(id) on delete set null,
  outcome text not null check (outcome in ('accepted', 'rejected', 'invalid')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists report_resolutions_report_id_idx
  on public.report_resolutions(report_id);
alter table public.report_resolutions enable row level security;
drop policy if exists "report_resolutions admin read" on public.report_resolutions;
create policy "report_resolutions admin read"
  on public.report_resolutions for select
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid() and admin.role = 'admin'
        and admin.is_active = true and admin.deleted_at is null
    )
  );
