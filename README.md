# AGROTIK

Πλατφόρμα σύνδεσης αγροτών, εμπόρων και εργοστασίων. Καμία μεσιτεία, καμία προμήθεια — απλά μια γέφυρα για να κλείσουν οι δύο πλευρές τη συμφωνία τους.

## Stack

- Next.js 15 (App Router)
- Tailwind CSS
- Supabase (Postgres + Auth + Storage + Realtime) — local via Docker
- Zod
- TypeScript

## Απαιτήσεις

- Node 22+
- Docker Engine (μέσα σε WSL είναι μια χαρά — αυτό το repo δουλεύεται εξ ολοκλήρου offline)
- Supabase CLI (μπαίνει ως dev dep)

## Ξεκίνημα (τοπικά, offline)

```bash
# 1. Εγκατάσταση dependencies
npm install

# 2. Εκκίνηση local Supabase (Postgres, Auth, Studio, Realtime, Storage)
npm run db:start
# ↑ Θα εκτυπώσει URL, anon key, service role key. Αντιγράψτε στο .env.local

# 3. Ρύθμιση env
cp .env.local.example .env.local
# Επεξεργασία με τα κλειδιά από το βήμα 2

# 4. Τρέξιμο εφαρμογής
npm run dev
```

Ανοίγετε http://localhost:3000.

Το Supabase Studio (DB explorer, auth admin) στο http://localhost:54323.

## Bootstrap admin

Στο `.env.local`, το `SEED_ADMIN_EMAIL` ορίζει ποιος γίνεται admin.
Ο πρώτος που θα εγγραφεί με αυτό το email γίνεται αυτόματα admin.

## Σχεδίαση

Το πλήρες design doc: `docs/superpowers/specs/2026-08-30-agrotik-mvp-design.md`

## Δομή

```
app/                    Next.js routes
  page.tsx              Landing
  login/, signup/       Auth
  search/               Public search (buyers, producers)
  profile/[id]/         Public profile
  dashboard/            User private area
  admin/                Admin dashboard
lib/
  actions/              Server actions
  db/                   Types, queries
  domain/               Pure helpers
  supabase/             Client factories
components/
  ui/                   Design primitives
  site/                 Site-wide (header, logo)
supabase/
  migrations/           Schema
  seed.sql              Regions & starter products
```
