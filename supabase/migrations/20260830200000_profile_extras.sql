-- Extended profile fields + media (avatar + gallery via URL/data-url)
-- Storage container is disabled in this local setup, so images are stored
-- inline as small data URLs (client resizes to ~600px WebP/JPEG).

alter table public.profiles
  add column if not exists avatar_url  text,
  add column if not exists cover_url   text,
  add column if not exists gallery     jsonb  not null default '[]'::jsonb,
  add column if not exists extras      jsonb  not null default '{}'::jsonb,
  add column if not exists year_founded    int,
  add column if not exists employees_range text,
  add column if not exists certifications  text,
  add column if not exists specialties     text,
  add column if not exists opening_hours   text,
  add column if not exists address_line    text;

-- Update the type on the profiles regenerate command — nothing to do here.
