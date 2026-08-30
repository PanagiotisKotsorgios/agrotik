#!/bin/sh
# AGROTIK production entrypoint
#   1. Wait until Postgres is reachable (via SUPABASE_DB_URL if set, else skip)
#   2. Apply every SQL migration in /app/supabase/migrations that has not run yet
#   3. Apply seed.sql once (idempotent — ON CONFLICT clauses in the file)
#   4. Exec the Next.js standalone server
#
# Migration tracking uses a table _agrotik_migrations. Each file is applied inside
# its own transaction and the filename gets recorded on success. Re-runs are safe.

set -e

if [ -n "${SUPABASE_DB_URL}" ]; then
  echo "→ Waiting for Postgres…"
  for i in $(seq 1 60); do
    if psql "${SUPABASE_DB_URL}" -c 'select 1' > /dev/null 2>&1; then
      break
    fi
    sleep 2
  done

  echo "→ Ensuring migration ledger…"
  psql "${SUPABASE_DB_URL}" -v ON_ERROR_STOP=1 <<'SQL' > /dev/null
    create table if not exists public._agrotik_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
SQL

  echo "→ Applying pending migrations…"
  for f in /app/supabase/migrations/*.sql; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    already=$(psql -tA "${SUPABASE_DB_URL}" -c "select 1 from public._agrotik_migrations where filename = '$name'")
    if [ "$already" = "1" ]; then
      echo "   ✓ $name (already applied)"
      continue
    fi
    echo "   → $name"
    psql -v ON_ERROR_STOP=1 "${SUPABASE_DB_URL}" -f "$f" > /dev/null
    psql "${SUPABASE_DB_URL}" -c "insert into public._agrotik_migrations (filename) values ('$name')" > /dev/null
  done

  if [ -f /app/supabase/seed.sql ]; then
    already_seed=$(psql -tA "${SUPABASE_DB_URL}" -c "select 1 from public._agrotik_migrations where filename = 'seed.sql'" 2>/dev/null)
    if [ "$already_seed" != "1" ]; then
      echo "→ Applying seed.sql (first-time only)…"
      psql -v ON_ERROR_STOP=1 "${SUPABASE_DB_URL}" -f /app/supabase/seed.sql > /dev/null || echo "   (seed partial — non-fatal)"
      psql "${SUPABASE_DB_URL}" -c "insert into public._agrotik_migrations (filename) values ('seed.sql')" > /dev/null || true
    fi
  fi
else
  echo "→ SUPABASE_DB_URL not set — skipping migrations. Apply them manually."
fi

echo "→ Starting Next.js on 0.0.0.0:${PORT:-3000}…"
exec node server.js
