-- Add the fisher role in its own migration. PostgreSQL requires new enum
-- values to be committed before they are referenced by another migration.

alter type public.user_role add value if not exists 'fisher' after 'farmer';
