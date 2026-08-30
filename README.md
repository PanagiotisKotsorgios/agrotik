# AGROTIK

Πλατφόρμα σύνδεσης αγροτών με εμπόρους και εργοστάσια. Πραγματικές τιμές, δημόσια προφίλ, καμία μεσιτεία — απλά μια γέφυρα για να κλείσουν οι δύο πλευρές τη συμφωνία τους.

**Live επικοινωνία:** ☎ 2631028971 · ✉ info@agrotik.gr

---

## One-click deploy σε Coolify · self-contained stack

**Τίποτα δεν τρέχει έξω από τον server σου.** Postgres, Auth, REST API, Realtime, Kong και η εφαρμογή σηκώνονται όλα από το ίδιο `docker-compose.yml`. Καμία εγγραφή σε supabase.com, καμία εξωτερική υπηρεσία.

1. **Coolify → New Resource → Docker Compose from GitHub**
2. Repo: `https://github.com/PanagiotisKotsorgios/agrotik` · Branch: `main`
3. Compose file: `docker-compose.yml` (auto-detected)
4. Environment variables (ΠΡΟΑΙΡΕΤΙΚΑ — έχει sensible defaults που δουλεύουν άμεσα):

   ```
   POSTGRES_PASSWORD=<strong-random-string>
   JWT_SECRET=<40+ char random string>
   SUPABASE_ANON_KEY=<JWT signed with JWT_SECRET, role=anon>
   SUPABASE_SERVICE_ROLE_KEY=<JWT signed with JWT_SECRET, role=service_role>
   SEED_ADMIN_EMAIL=admin@agrotik.gr
   APP_ORIGIN=https://agrotik.gr
   NEXT_PUBLIC_SUPABASE_URL=https://api.agrotik.gr
   ```

   > **Για γρήγορο test** — άφησε όλα κενά. Θα σηκωθεί με demo JWT keys που **πρέπει** να αντικαταστήσεις πριν δώσεις σε πραγματικούς χρήστες.

5. **Domains** (Coolify UI): `agrotik.gr` → service `web` (port 3000) · `api.agrotik.gr` → service `kong` (port 8000)
6. **Deploy**. Coolify αναλαμβάνει auto-TLS με Let's Encrypt.

Ο stack ενεργοποιεί αυτόματα:
- **Auto-migration**: κάθε νέο `.sql` στο `supabase/migrations/` εφαρμόζεται μία φορά (tracked σε `_agrotik_migrations`)
- **Seed**: πρώτη φορά μόνο (74 νομοί + 12 προϊόντα)
- **Postgres named volume** `agrotik-db` για persistence — **backup το!**
- **Production Next.js** (standalone output — cold start ~3s, warm ~150ms)

📘 Πλήρης οδηγός με JWT generation, DNS, backups: [`COOLIFY.md`](./COOLIFY.md).

---

## Stack

- **Next.js 15** (App Router + Turbopack για dev)
- **Tailwind CSS** + custom design tokens (Fraunces display / Inter body / JetBrains Mono figures)
- **FontAwesome 7** icons
- **Supabase** (Postgres + Auth + Realtime + optional Storage)
- **Brevo API** για transactional emails (ενεργοποιείται από admin panel)
- **TypeScript** + **Zod**

---

## Local development

Χρειάζεσαι Node 22+, npm, Docker (για local Supabase).

```bash
npm install --legacy-peer-deps

# 1. Start local Supabase (Postgres, Auth, Realtime — Storage disabled by default)
npm run db:start
# copy the printed anon + service_role keys to .env.local

# 2. Copy env template και συμπλήρωσε τα κλειδιά
cp .env.example .env.local

# 3. Run dev
npm run dev
```

- App: http://localhost:3000
- Supabase Studio: `npm run db:stop && npm run db:start` (studio disabled by default in this repo's config for compatibility; enable it in `supabase/config.toml`)

**Demo data:** `node scripts/seed-demo.mjs` creates 4 demo accounts + listings.

**Admin bootstrap:** ο πρώτος που εγγράφεται με `SEED_ADMIN_EMAIL` γίνεται αυτόματα admin. Μετά ρυθμίζεις Brevo από `/admin/settings`.

---

## Deployment (Coolify / any Docker host)

Ο repository είναι **Coolify-ready**:

1. **Δημιούργησε Supabase project** (self-hosted ή hosted). Παρέχει `URL`, `anon`, `service_role`.
2. **Coolify → New Resource → Docker Compose from GitHub**
   - Repo: `https://github.com/PanagiotisKotsorgios/agrotik`
   - Compose file: `docker-compose.yml`
3. **Environment variables** στο Coolify:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<https://your-project.supabase.co>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<eyJ...>
   SUPABASE_SERVICE_ROLE_KEY=<eyJ...>
   SEED_ADMIN_EMAIL=admin@agrotik.gr
   ```
4. **Migrations & seed**: μία φορά, από το local terminal σου:
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   ```
5. Deploy. Coolify θα κάνει build το Dockerfile (multi-stage, standalone output) και θα σηκώσει το app στο port 3000. Πρόσθεσε custom domain + auto-TLS από το Coolify UI.

**Health check:** `GET /` κάθε 30s.

**Update:** κάθε push σε `main` triggers auto-rebuild (αν το ενεργοποιήσεις στο Coolify).

---

## Δομή project

```
app/                  Next.js App Router
  page.tsx              Landing (hero, live ticker, profiles carousel)
  login/, signup/       Auth
  search/               Public search (buyers/producers) με πολλά φίλτρα
  profile/[id]/         Δημόσιο προφίλ με cover, avatar, gallery
  dashboard/            User private (profile, listings, messages, notifications, ...)
  admin/                Admin (users, products, reports, settings, exports)
  contact/, faq/, ...   Ενημερωτικές σελίδες
  legal/                Terms, Privacy, Cookies, Imprint
lib/
  actions/              Server actions (auth, profiles, listings, messages, contact, admin, ...)
  db/                   Types, queries
  domain/               Pure helpers (variant diff, image resize, search-params parser)
  supabase/             Client factories (server/browser/service/middleware)
  brevo.ts              Brevo transactional email wrapper
components/
  ui/                   Icon, Button, Input, Card
  site/                 Header, Footer, Logo, ticker, carousel, filter drawer, mobile nav
supabase/
  config.toml, migrations/, seed.sql
docs/
  superpowers/specs/    MVP design document
scripts/
  seed-demo.mjs         Populates local DB with demo users & listings
```

---

## Features

- **3 ρόλοι**: αγρότης / έμπορος / εργοστάσιο (+ admin)
- **Public search** αγοραστών & παραγωγών με φίλτρα ανά νομό, δήμο, κατηγορία, προϊόν, ποιότητα (attributes), εύρος τιμής/ποσότητας, ημερομηνία διαθεσιμότητας, όνομα
- **Mobile filter drawer** — full-screen sheet με count badge
- **In-app chat** με Supabase Realtime
- **Notifications**: αλλαγή τιμής σε αγαπημένο, νέος αγοραστής με καλύτερη τιμή, νέο μήνυμα
- **Ειδοποιήσεις email** μέσω Brevo (ρυθμίζεται από admin — API key, sender, active templates)
- **Δημόσιο προφίλ** με cover, avatar, gallery (client-side resize σε JPEG), extra fields (year founded, employees, certifications, specialties, hours, address)
- **Admin dashboard**: χρήστες (suspend/promote), προϊόντα (approve/reject), αναφορές, ρυθμίσεις Brevo, CSV exports
- **Reports/flagging** από κάθε προφίλ
- **Deal-mark** για analytics (χωρίς ποσά)
- **74 Νομοί/Π.Ε.** seeded + 12 βασικά προϊόντα με parametric attributes
- **Ευανάγνωστο UI** για μεγαλύτερες ηλικίες (44px min touch targets, 17px base font, καθαρή τυπογραφία)
- **Ελληνικά μόνο** UI (i18n post-launch)

---

## License

Proprietary — © AGROTIK. Contact info@agrotik.gr for licensing.
