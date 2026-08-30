-- Post-MVP additions: messages, reports, app_settings, avatar storage,
-- extended notification kinds.

-- ============================================================
-- Extend notification kinds
-- ============================================================
alter type public.notification_kind add value if not exists 'new_better_price';
alter type public.notification_kind add value if not exists 'new_message';
alter type public.notification_kind add value if not exists 'report_received';

-- ============================================================
-- messages (in-app 1:1 chat)
-- ============================================================
create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  body          text not null check (length(body) between 1 and 4000),
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index messages_pair_idx
  on public.messages (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);

create index messages_recipient_unread_idx
  on public.messages (recipient_id, read_at, created_at desc);

alter table public.messages enable row level security;

create policy "messages participants read"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "messages sender insert"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "messages recipient update read"
  on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

alter publication supabase_realtime add table public.messages;

-- ============================================================
-- reports (user/listing flagging)
-- ============================================================
create type public.report_target_type as enum ('profile','price_listing','production_listing','message');
create type public.report_status as enum ('open','reviewing','resolved','dismissed');

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_type  public.report_target_type not null,
  target_id    uuid not null,
  reason       text not null check (length(reason) between 3 and 1000),
  status       public.report_status not null default 'open',
  admin_note   text,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);

alter table public.reports enable row level security;

create policy "reports reporter select"
  on public.reports for select
  using (auth.uid() = reporter_id);

create policy "reports reporter insert"
  on public.reports for insert
  with check (auth.uid() = reporter_id);

-- ============================================================
-- app_settings (admin-managed key-value)
-- ============================================================
create table public.app_settings (
  key         text primary key,
  value       jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.app_settings enable row level security;

-- Only admin-role users can read/write via anon/authenticated; server actions
-- use service role for full control. We add a targeted authenticated policy so
-- admin server components can read directly if needed.
create policy "app_settings admin read"
  on public.app_settings for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Seed with defaults (Brevo off by default, no key set)
insert into public.app_settings (key, value) values
  ('brevo', jsonb_build_object(
    'enabled', false,
    'api_key', '',
    'sender_email', 'no-reply@agrotik.local',
    'sender_name', 'AGROTIK',
    'templates', jsonb_build_object(
      'price_changed', true,
      'new_better_price', true,
      'new_message', true,
      'welcome', false
    )
  ))
on conflict (key) do nothing;

-- Storage bucket policies deferred: storage container has healthcheck issues
-- in this local WSL2 setup, so avatar upload is post-launch. Profiles keep the
-- optional `avatar_path` column; the UI accepts a raw URL as a fallback.
