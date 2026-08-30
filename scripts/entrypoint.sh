#!/bin/sh
# AGROTIK production entrypoint
#   1. Wait until Postgres is reachable (as `postgres` — always has a
#      predictable password of POSTGRES_PASSWORD in supabase/postgres)
#   2. Apply every SQL migration in /app/supabase/migrations that has not
#      run yet — recorded in _agrotik_migrations so re-runs are safe
#   3. Apply seed.sql once
#   4. Exec the Next.js standalone server
#
# All the reserved-Supabase-role wrangling happens on the db container
# via the mounted /docker-entrypoint-initdb.d config, so nothing to do
# from here.

set -eu

if [ -n "${PGHOST:-}" ]; then
  echo "→ Waiting for Postgres…"
  ready=false
  for i in $(seq 1 60); do
    if psql -c 'select 1' > /dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 2
  done

  if [ "$ready" != "true" ]; then
    echo "ERROR: Postgres did not become reachable within 120 seconds." >&2
    exit 1
  fi

  echo "→ Ensuring migration ledger…"
  psql -v ON_ERROR_STOP=1 <<'SQL' > /dev/null
    create table if not exists public._agrotik_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
SQL

  echo "→ Applying pending migrations…"
  for f in /app/supabase/migrations/*.sql; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    already=$(psql -tA -c "select 1 from public._agrotik_migrations where filename = '$name'")
    if [ "$already" = "1" ]; then
      echo "   ✓ $name (already applied)"
      continue
    fi
    echo "   → $name"
    psql -v ON_ERROR_STOP=1 -f "$f" > /dev/null
    psql -c "insert into public._agrotik_migrations (filename) values ('$name')" > /dev/null
  done

  if [ -f /app/supabase/seed.sql ]; then
    already_seed=$(psql -tA -c "select 1 from public._agrotik_migrations where filename = 'seed.sql'" 2>/dev/null)
    if [ "$already_seed" != "1" ]; then
      echo "→ Applying seed.sql (first-time only)…"
      psql -v ON_ERROR_STOP=1 -f /app/supabase/seed.sql > /dev/null || echo "   (seed partial — non-fatal)"
      psql -c "insert into public._agrotik_migrations (filename) values ('seed.sql')" > /dev/null || true
    fi
  fi
else
  echo "→ PGHOST not set — skipping migrations."
fi

echo "→ Starting Next.js on 0.0.0.0:${PORT:-3000}…"
exec node server.js
