#!/bin/sh
# AGROTIK production entrypoint
#   1. Wait until Postgres is reachable
#   2. Repair the Supabase role passwords/schema for both new and existing volumes
#   3. Apply every SQL migration in /app/supabase/migrations that has not run yet
#   4. Apply seed.sql once (idempotent — ON CONFLICT clauses in the file)
#   5. Exec the Next.js standalone server
#
# Migration tracking uses a table _agrotik_migrations. Each filename is recorded
# only after that migration succeeds, so completed migrations are not re-run.

set -eu

db_psql() {
  if [ -n "${PGHOST:-}" ]; then
    psql "$@"
  else
    psql "${SUPABASE_DB_URL}" "$@"
  fi
}

if [ -n "${PGHOST:-}" ] || [ -n "${SUPABASE_DB_URL:-}" ]; then
  echo "→ Waiting for Postgres…"
  database_ready=false
  for i in $(seq 1 60); do
    if db_psql -c 'select 1' > /dev/null 2>&1; then
      database_ready=true
      break
    fi
    sleep 2
  done

  if [ "$database_ready" != "true" ]; then
    echo "ERROR: Postgres did not become reachable within 120 seconds." >&2
    exit 1
  fi

  # The official Supabase self-hosted compose runs roles.sql, jwt.sql and
  # realtime.sql only while initializing a brand-new PGDATA directory. Run the
  # equivalent idempotent repair here too so a previously-created Coolify
  # volume is fixed on its next deployment instead of needing to be deleted.
  if [ -n "${POSTGRES_PASSWORD:-}" ] && [ -n "${PGHOST:-}" ]; then
    echo "→ Configuring Supabase database roles…"
    # Reserved Supabase roles can only be altered by the image's
    # supabase_admin superuser; application migrations remain on `postgres`.
    PGPASSWORD="${PGPASSWORD:-$POSTGRES_PASSWORD}" psql \
      -h "$PGHOST" \
      -p "${PGPORT:-5432}" \
      -d "${PGDATABASE:-postgres}" \
      -U supabase_admin \
      -v ON_ERROR_STOP=1 \
      -v "pgpass=${POSTGRES_PASSWORD}" \
      -v "jwt_secret=${JWT_SECRET:-super-secret-jwt-token-with-at-least-32-characters-long}" \
      -v "jwt_exp=${JWT_EXP:-3600}" <<'SQL' > /dev/null
select format('alter role %I with password %L', rolname, :'pgpass')
from pg_roles
where rolname in (
  'authenticator',
  'supabase_admin',
  'supabase_auth_admin',
  'supabase_functions_admin',
  'supabase_storage_admin'
)
\gexec

create schema if not exists _realtime authorization supabase_admin;
alter schema _realtime owner to supabase_admin;
alter database postgres set "app.settings.jwt_secret" to :'jwt_secret';
alter database postgres set "app.settings.jwt_exp" to :'jwt_exp';
SQL
  fi

  echo "→ Ensuring migration ledger…"
  db_psql -v ON_ERROR_STOP=1 <<'SQL' > /dev/null
    create table if not exists public._agrotik_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
SQL

  echo "→ Applying pending migrations…"
  for f in /app/supabase/migrations/*.sql; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    already=$(db_psql -tA -c "select 1 from public._agrotik_migrations where filename = '$name'")
    if [ "$already" = "1" ]; then
      echo "   ✓ $name (already applied)"
      continue
    fi
    echo "   → $name"
    db_psql -v ON_ERROR_STOP=1 -f "$f" > /dev/null
    db_psql -c "insert into public._agrotik_migrations (filename) values ('$name')" > /dev/null
  done

  if [ -f /app/supabase/seed.sql ]; then
    already_seed=$(db_psql -tA -c "select 1 from public._agrotik_migrations where filename = 'seed.sql'" 2>/dev/null)
    if [ "$already_seed" != "1" ]; then
      echo "→ Applying seed.sql (first-time only)…"
      db_psql -v ON_ERROR_STOP=1 -f /app/supabase/seed.sql > /dev/null || echo "   (seed partial — non-fatal)"
      db_psql -c "insert into public._agrotik_migrations (filename) values ('seed.sql')" > /dev/null || true
    fi
  fi
else
  echo "→ Database connection not set — skipping migrations. Apply them manually."
fi

echo "→ Starting Next.js on 0.0.0.0:${PORT:-3000}…"
exec node server.js
