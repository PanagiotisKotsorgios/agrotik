-- Supabase self-hosted initialization (official docker/volumes/db/roles.sql).
-- The image creates these reserved roles; this compose layer gives the
-- database-facing services the same password as the Postgres instance.
\set pgpass `echo "$POSTGRES_PASSWORD"`

alter user authenticator with password :'pgpass';
alter user pgbouncer with password :'pgpass';
alter user supabase_auth_admin with password :'pgpass';
alter user supabase_functions_admin with password :'pgpass';
alter user supabase_storage_admin with password :'pgpass';
