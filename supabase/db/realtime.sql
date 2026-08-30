-- Supabase self-hosted initialization (official docker/volumes/db/realtime.sql).
\set pguser `echo "$POSTGRES_USER"`

create schema if not exists _realtime;
alter schema _realtime owner to :pguser;
