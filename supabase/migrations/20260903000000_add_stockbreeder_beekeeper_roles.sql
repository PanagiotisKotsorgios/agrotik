-- Add livestock (κτηνοτρόφος) and beekeeping (μελισσοκόμος) base roles.
-- PostgreSQL requires new enum values to be committed before another
-- migration can reference them (e.g. in a combined role or an RLS
-- policy body), so this migration only adds the base values.
--
-- Existing rows are untouched. `if not exists` makes this idempotent
-- so it is safe to re-run against any Supabase project.

alter type public.user_role add value if not exists 'stockbreeder' after 'fisher';
alter type public.user_role add value if not exists 'beekeeper' after 'stockbreeder';
