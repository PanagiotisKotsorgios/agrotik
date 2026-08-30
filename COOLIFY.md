# AGROTIK · Full deployment on Coolify

Οδηγός για να τρέξεις **ολόκληρο το AGROTIK stack** (Next.js + Supabase + Postgres) σε ένα Coolify server, με ένα σετ containers. Δοκιμασμένο σε Coolify v4+.

---

## Πίνακας περιεχομένων

1. [Prerequisites](#prerequisites)
2. [Αρχιτεκτονική σε production](#αρχιτεκτονική-σε-production)
3. [Βήμα 1 · Setup Coolify server](#βήμα-1--setup-coolify-server)
4. [Βήμα 2 · Deploy self-hosted Supabase](#βήμα-2--deploy-self-hosted-supabase)
5. [Βήμα 3 · Deploy AGROTIK Next.js app](#βήμα-3--deploy-agrotik-nextjs-app)
6. [Βήμα 4 · Migrations + seed](#βήμα-4--migrations--seed)
7. [Βήμα 5 · Custom domain + HTTPS](#βήμα-5--custom-domain--https)
8. [Βήμα 6 · Πρώτος admin login](#βήμα-6--πρώτος-admin-login)
9. [Βήμα 7 · Ρύθμιση Brevo email](#βήμα-7--ρύθμιση-brevo-email)
10. [Backups & maintenance](#backups--maintenance)
11. [Env vars reference](#env-vars-reference)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Server** με:
  - 4 GB RAM minimum (8 GB recommended)
  - 2 vCPU
  - 40 GB disk
  - Ubuntu 22.04 LTS ή Debian 12
- **Domain name** (π.χ. `agrotik.gr` + `api.agrotik.gr` για Supabase)
- **Coolify** εγκατεστημένο ([one-line install](https://coolify.io/docs/installation))
- **GitHub repo access** — https://github.com/PanagiotisKotsorgios/agrotik
- **Brevo account** (δωρεάν, 300 emails/day) — για transactional emails

---

## Αρχιτεκτονική σε production

```
                     ┌─────────────────────────────────────┐
   Internet   ───▶   │   Coolify Traefik (auto-TLS)        │
                     │                                     │
                     │   ├─▶  agrotik.gr        →  Next.js │
                     │   └─▶  api.agrotik.gr    →  Kong    │
                     └─────────────────────────────────────┘
                                        │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
              ┌────────────┐    ┌──────────────┐   ┌──────────────┐
              │  Next.js   │    │  Kong (API   │   │  Supabase    │
              │  (this     │◀──▶│  gateway,    │◀─▶│  Auth        │
              │   repo)    │    │  routes)     │   │  REST        │
              └────────────┘    └──────────────┘   │  Realtime    │
                                                   └──────────────┘
                                                           │
                                                    ┌──────▼──────┐
                                                    │  Postgres   │
                                                    │  (persistent│
                                                    │   volume)   │
                                                    └─────────────┘
```

- Το Next.js container ξέρει μόνο το URL του Supabase Kong (public + service_role key).
- Postgres persists σε named Docker volume — **μην το διαγράψεις**.

---

## Βήμα 1 · Setup Coolify server

Αν δεν έχεις ήδη Coolify:

```bash
# Στον server ως root ή sudo
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Άνοιξε `http://<your-server-ip>:8000`, φτιάξε admin account, σύνδεσε τον GitHub σου.

---

## Βήμα 2 · Deploy self-hosted Supabase

**Επιλογή A (recommended) — Official Supabase self-hosted:**

1. Coolify → **New Resource** → **Docker Compose**
2. Χρησιμοποίησε το official compose από https://github.com/supabase/supabase/blob/master/docker/docker-compose.yml
3. Στα env vars:
   - `POSTGRES_PASSWORD` — τυχαίο 32-char (κράτησέ το!)
   - `JWT_SECRET` — τυχαίο 40-char
   - `ANON_KEY` — παρήγαγε με [Supabase JWT tool](https://supabase.com/docs/guides/self-hosting/docker#securing-your-services)
   - `SERVICE_ROLE_KEY` — ομοίως
   - `SITE_URL` — `https://agrotik.gr`
   - `API_EXTERNAL_URL` — `https://api.agrotik.gr`
   - `SMTP_*` — μπορείς να αφήσεις άδεια (τα emails στέλνονται μέσω Brevo από το app)
4. Domain: **api.agrotik.gr** → port 8000 (Kong)
5. Deploy. Περίμενε ~5 λεπτά για την πρώτη φορά (image pulls).

**Επιλογή Β — Απλά Postgres + Supabase Studio σε ένα container** (μόνο για μικρές εγκαταστάσεις):
Μπορείς να τρέξεις μόνο `supabase/postgres` container και να χρησιμοποιείς το app με raw DB connection. **Δεν συνιστάται** — χάνεις Auth, Realtime, storage.

---

## Βήμα 3 · Deploy AGROTIK Next.js app

1. Coolify → **New Resource** → **Application** → **Public Repository**
2. Repo: `https://github.com/PanagiotisKotsorgios/agrotik`
3. Branch: `main`
4. Build pack: **Dockerfile** (auto-detected από το repo)
5. Port: **3000**
6. **Environment Variables** (Coolify UI):

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://api.agrotik.gr
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi... (από βήμα 2)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi... (από βήμα 2)
   SEED_ADMIN_EMAIL=admin@agrotik.gr
   APP_ORIGIN=https://agrotik.gr
   ```

   Μαρκάρετε **NEXT_PUBLIC_*** ως "Build variable" ώστε να μπουν στο client bundle.

7. Domain: **agrotik.gr** → port 3000
8. Deploy. Το Coolify θα κάνει `docker build` σύμφωνα με το `Dockerfile` (multi-stage, ~2 λεπτά).

---

## Βήμα 4 · Migrations + seed

Οι SQL migrations είναι στο `supabase/migrations/`. Χρειάζεται να τρέξουν μία φορά:

**Από τον local σου (πιο εύκολο):**

```bash
# Εγκατέστησε Supabase CLI
npm i -g supabase

# Link στο Supabase project
supabase link --project-ref <ή σε self-hosted, βάλε DB URL απευθείας>

# Σύνδεση με το production DB
export DATABASE_URL="postgresql://postgres:<POSTGRES_PASSWORD>@api.agrotik.gr:5432/postgres"

# Εφαρμογή όλων των migrations με τη σειρά
for f in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done

# Seed regions + starter products
psql "$DATABASE_URL" -f supabase/seed.sql
```

**Ή απευθείας από τον Coolify server:**

```bash
# SSH στον server
cd /path/to/coolify/mounted-volume/supabase
# Ή βρες το DB container:
docker ps | grep supabase.*postgres
docker exec -i <container-name> psql -U postgres < /path/to/init.sql
```

**Επιβεβαίωση:**

```sql
SELECT COUNT(*) FROM public.regions;      -- 74
SELECT COUNT(*) FROM public.products;     -- 12
SELECT COUNT(*) FROM public.app_settings; -- 1
```

---

## Βήμα 5 · Custom domain + HTTPS

Στο DNS provider σου (π.χ. Cloudflare, Namecheap):

```
A     agrotik.gr        → <server-ip>
A     api.agrotik.gr    → <server-ip>
A     www.agrotik.gr    → <server-ip>
CNAME @                 → agrotik.gr (αν χρειάζεται)
```

Στο Coolify:
- App → **Domains** → πρόσθεσε `agrotik.gr` και `www.agrotik.gr`
- Supabase → **Domains** → πρόσθεσε `api.agrotik.gr`
- Auto-TLS με Let's Encrypt ενεργοποιείται αυτόματα (μέσα σε 1-2 λεπτά).

---

## Βήμα 6 · Πρώτος admin login

Ο πρώτος χρήστης που εγγράφεται με το email που έβαλες στο `SEED_ADMIN_EMAIL` γίνεται αυτόματα admin.

1. Πήγαινε στο `https://agrotik.gr/signup`
2. Επίλεξε ρόλο (οποιονδήποτε — θα γίνει admin ούτως ή άλλως)
3. Email: **admin@agrotik.gr** (ή ό,τι έβαλες στο env)
4. Password: **βάλε δυνατό κωδικό** (min 12 chars συνιστάται)
5. Συμπλήρωσε τα υπόλοιπα πεδία
6. Μετά την εγγραφή, θα δεις "Admin" link στο header. Πήγαινε στο `/admin`.

**Κράτησε τον κωδικό ασφαλή** — αν τον χάσεις, μπορείς να τον αλλάξεις μέσω:
```sql
-- Στον server, σε psql:
UPDATE auth.users
SET encrypted_password = crypt('<νέος-κωδικός>', gen_salt('bf'))
WHERE email = 'admin@agrotik.gr';
```

---

## Βήμα 7 · Ρύθμιση Brevo email

1. Πάρε API key από https://app.brevo.com/settings/keys/api (v3 API key)
2. Log in στο AGROTIK ως admin → `/admin/settings`
3. Ενεργοποίησε το **"Ενεργοποίηση αποστολής email μέσω Brevo"**
4. Επικόλλησε το API key
5. Sender email: **info@agrotik.gr** (πρέπει να είναι verified sender στο Brevo)
6. Sender name: **AGROTIK**
7. Ενεργοποίησε τα templates που θέλεις (welcome, price_changed, new_message, password_reset)
8. **Δοκιμαστικό email**: βάλε δικό σου email και πάτησε "Δοκιμαστικό email" για να επιβεβαιώσεις

Οι διαχειριστές μπορούν να προσαρμόσουν το subject/heading/body κάθε template από το ίδιο panel (expandable cards).

---

## Backups & maintenance

**Automated Postgres backups (mandatory):**

Στο Coolify → Supabase → **Backups**:
- Frequency: **Daily at 03:00**
- Retention: **7 days local + 30 days S3** (σύνδεσε S3 bucket)
- Test restore κάθε μήνα σε staging.

**Updates του app:**

Push σε `main` → Coolify auto-deploys (αν έχεις ενεργοποιήσει auto-deploy).

**Database migrations σε production:**

Πρόσθεσε νέο `.sql` file στο `supabase/migrations/`, τρέξε ξανά το βήμα 4 (μόνο τα νέα files).

**Monitoring:**

- Coolify Dashboard δείχνει CPU/RAM/disk για κάθε container
- Health checks: `/` για το app (κάθε 30s στο docker-compose)
- Logs: `docker logs <container>` ή Coolify UI

---

## Env vars reference

| Variable | Where | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | App | — | Public URL of the Supabase API gateway. Baked into client bundle. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | App | — | JWT με role `anon` για client-side reads με RLS. Baked. |
| `SUPABASE_SERVICE_ROLE_KEY` | App | — | JWT με role `service_role` — bypass RLS. **Server-only**. |
| `SEED_ADMIN_EMAIL` | App | `admin@agrotik.gr` | Email που γίνεται αυτόματα admin στην πρώτη εγγραφή. |
| `APP_ORIGIN` | App | `http://localhost:3000` | Χρησιμοποιείται στα password reset emails για το link. |
| `POSTGRES_PASSWORD` | Supabase | — | Postgres superuser password. |
| `JWT_SECRET` | Supabase | — | 40-char secret για signing/verifying όλα τα JWT. |
| `SITE_URL` | Supabase | — | Redirect target για magic links. Ίδιο με `APP_ORIGIN`. |

---

## Troubleshooting

**"Failed to fetch" στον client:**
- Έλεγξε ότι το `NEXT_PUBLIC_SUPABASE_URL` δείχνει σε valid HTTPS endpoint
- CORS: το Kong στο Supabase πρέπει να επιτρέπει το `agrotik.gr` origin

**Password reset email δεν φτάνει:**
- Στο `/admin/settings` πάτα "Δοκιμαστικό email" — δείχνει το error αν αποτύχει
- Έλεγξε ότι το sender email είναι verified στο Brevo (Settings → Senders)

**Supabase migration errors:**
- Τρέξε ένα-ένα τα files με τη σειρά ημερομηνίας
- Αν το `20260830000001_init.sql` fails με "type already exists", drop το schema:
  ```sql
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres;
  GRANT ALL ON SCHEMA public TO public;
  ```

**Storage container unhealthy:**
- Storage είναι απενεργοποιημένο στο default `supabase/config.toml` λόγω γνωστού healthcheck issue σε πολλά systems
- Στην production, ενεργοποίησέ το ξανά (`enabled = true`) και τρέξε το κομμάτι με τα avatars policies από το commented block στο `20260830100000_post_mvp.sql`

**High CPU στο Next.js:**
- Coolify → App → **Resources** → όρισε limits (π.χ. 1 vCPU, 1 GB RAM)
- Αν συνεχίσει, prod build με `next start` (χωρίς turbo/dev) είναι πολύ ελαφρύτερο

**"listen EADDRINUSE" στο app container:**
- Άλλο container ήδη χρησιμοποιεί το port 3000 → άλλαξε το mapping στο docker-compose.yml

---

## Contacts

Για τεχνικά ζητήματα: **info@agrotik.gr** · ☎ **2631028971**

Repo: https://github.com/PanagiotisKotsorgios/agrotik
