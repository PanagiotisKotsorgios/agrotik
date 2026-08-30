-- Custom password reset via Brevo (bypasses Supabase Auth's own email service).

create table if not exists public.password_reset_tokens (
  token       uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_idx on public.password_reset_tokens (user_id, created_at desc);
create index if not exists password_reset_tokens_expiry_idx on public.password_reset_tokens (expires_at) where used_at is null;

-- Table is accessed only via service role; deny all direct access.
alter table public.password_reset_tokens enable row level security;
