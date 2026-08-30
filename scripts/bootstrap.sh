#!/usr/bin/env bash
# One-shot bootstrap: start Supabase, capture keys, write .env.local
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Starting Supabase (this may take a while first time — pulling ~10 Docker images)…"
OUT=$(npx supabase start 2>&1 || true)
echo "$OUT"

ANON=$(echo "$OUT" | grep -Eo 'anon key: *eyJ[A-Za-z0-9._-]+' | awk '{print $NF}' | head -1)
SVC=$(echo "$OUT"  | grep -Eo 'service_role key: *eyJ[A-Za-z0-9._-]+' | awk '{print $NF}' | head -1)
URL=$(echo "$OUT"  | grep -Eo 'API URL: *https?://[^ ]+' | awk '{print $NF}' | head -1)

if [ -z "$ANON" ] || [ -z "$SVC" ] || [ -z "$URL" ]; then
  echo "!! Could not parse Supabase keys. Try running 'npx supabase status' after 'npx supabase start' completes."
  exit 1
fi

cat > .env.local <<EOF
NEXT_PUBLIC_SUPABASE_URL=$URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$ANON
SUPABASE_SERVICE_ROLE_KEY=$SVC
SEED_ADMIN_EMAIL=admin@agrotik.local
EOF

echo ""
echo "✓ .env.local γράφτηκε"
echo "→ Studio: http://127.0.0.1:54323"
echo "→ Επόμενο: npm run dev"
