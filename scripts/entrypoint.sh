#!/bin/sh
# AGROTIK production entrypoint — verbose + never-die.
# If any stage fails, the container prints the reason and stays alive so
# Coolify's "Runtime Logs" tab can show the failure (it only streams from
# running containers, not exited ones).

set -u

log() { echo "[entrypoint] $*"; }

fail() {
  log "ERROR: $*"
  log "keeping container alive so runtime logs can be inspected — sleep infinity"
  # Never exec here; keep PID 1 alive.
  exec sleep infinity
}

log "PID=$$  PGHOST=${PGHOST:-<unset>}  PGUSER=${PGUSER:-<unset>}  PGDATABASE=${PGDATABASE:-<unset>}  PORT=${PORT:-3000}"

if [ -z "${PGHOST:-}" ]; then
  log "PGHOST not set — skipping migrations."
else
  log "waiting for Postgres…"
  ready=false
  for i in $(seq 1 60); do
    if psql -c 'select 1' > /dev/null 2>&1; then
      ready=true
      break
    fi
    sleep 2
  done

  if [ "$ready" != "true" ]; then
    fail "Postgres unreachable at ${PGHOST} after 120s"
  fi
  log "Postgres OK"

  log "ensuring migration ledger…"
  if ! psql -v ON_ERROR_STOP=1 <<'SQL' > /dev/null 2>&1
    create table if not exists public._agrotik_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    );
SQL
  then
    fail "could not create _agrotik_migrations ledger"
  fi

  log "applying migrations…"
  for f in /app/supabase/migrations/*.sql; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    already=$(psql -tA -c "select 1 from public._agrotik_migrations where filename = '$name'" 2>/dev/null || echo "")
    if [ "$already" = "1" ]; then
      log "  ✓ $name (already applied)"
      continue
    fi
    log "  → $name"
    if ! psql -v ON_ERROR_STOP=1 -f "$f" > /tmp/migration-error.log 2>&1; then
      log "MIGRATION FAILED — output:"
      cat /tmp/migration-error.log
      fail "migration $name failed"
    fi
    psql -c "insert into public._agrotik_migrations (filename) values ('$name')" > /dev/null 2>&1 || true
  done

  if [ -f /app/supabase/seed.sql ]; then
    already_seed=$(psql -tA -c "select 1 from public._agrotik_migrations where filename = 'seed.sql'" 2>/dev/null || echo "")
    if [ "$already_seed" != "1" ]; then
      log "applying seed.sql (first-time only)…"
      psql -v ON_ERROR_STOP=1 -f /app/supabase/seed.sql > /tmp/seed.log 2>&1 || {
        log "seed partial — non-fatal. tail of output:"
        tail -20 /tmp/seed.log || true
      }
      psql -c "insert into public._agrotik_migrations (filename) values ('seed.sql')" > /dev/null 2>&1 || true
    fi
  fi
fi

log "starting Next.js on 0.0.0.0:${PORT:-3000}…"
# Do NOT `exec` — we want to catch a crash and keep the container alive
# so its output stays visible in Coolify runtime logs.
node server.js
rc=$?
log "Next.js exited with code $rc — container will stay alive for inspection"
exec sleep infinity
