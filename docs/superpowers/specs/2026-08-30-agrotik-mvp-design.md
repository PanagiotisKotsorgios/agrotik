# AGROTIK MVP — Design Spec

**Ημερομηνία:** 2026-08-30
**Status:** Validated design, awaiting implementation plan
**Scope:** MVP (ενότητα 11 του product brief) — τα υπόλοιπα (chat, email/SMS notifications, "καλύτερης τιμής" auto-detect, i18n, OAuth, moderation flows) είναι post-MVP.

---

## 1. Στόχος

Πλατφόρμα σύνδεσης αγροτών, εμπόρων και εργοστασίων. Καμία διαχείριση πληρωμών ή συναλλαγών — μόνο σύνδεση προσφοράς/ζήτησης. Οι δύο πλευρές κλείνουν συμφωνία εκτός πλατφόρμας.

## 2. Locked decisions

| Απόφαση | Επιλογή | Σημείωση |
|---|---|---|
| Products | Global seeded catalog + user-added, admin-approved | Custom προϊόν είναι ορατό μόνο στο δικό του προφίλ μέχρι έγκριση |
| Onboarding moderation | Αμέσως ορατοί, admin μπορεί να suspend/report | Καμία pending-approval φάση για merchants/factories |
| Notifications channels (MVP) | In-app only (καμπανάκι + λίστα) | Email/SMS post-MVP |
| Notification triggers (MVP) | Μόνο αλλαγή τιμής σε favorited merchant/factory | "Νέος έμπορος με καλύτερη τιμή" post-MVP |
| Auth | Email + password | SMS/OTP, Google login post-MVP |
| Stack | Next.js (App Router) + Tailwind + Supabase (Postgres + Auth + Storage) + Vercel | — |
| Γλώσσα | Ελληνικά μόνο | i18n post-MVP |
| Data access | Hybrid: RLS-guarded direct reads για public, Server Actions για writes | — |
| Regions | Seeded 74 Νομοί/Π.Ε. + free-text Δήμος | Πλήρης ιεραρχία Δήμων post-MVP |

## 3. Architecture

### 3.1 Runtime slices

- **Public read path** — αναζήτηση, δημόσια προφίλ, κατάλογος: Server Components fetch από Supabase με anonymous client. RLS επιτρέπει read σε `is_active=true` rows.
- **Authenticated read path** — dashboard, favorites, notifications: Server Components fetch με user-scoped Supabase client (JWT από cookie). RLS φιλτράρει σε `owner=auth.uid()`.
- **Write path** — signup, profile/listings edit, favorite toggle, deal-mark: Server Actions που κάνουν Zod validation, καλούν Supabase με user-scoped client, και triggers side-effects όπως δημιουργία notifications.
- **Real-time delivery** — Supabase Realtime subscription στο `notifications` για τον current user. Καμπανάκι badge counter live-updates.
- **Admin path** — routes με middleware που ελέγχει `profile.role='admin'`. Service-role client μόνο μέσα σε server actions με explicit role check.
- **Storage** — `avatars` bucket, public read + owner write.

### 3.2 Package layout

```
app/
  (public)/           # δημόσιες σελίδες: landing, search, profile[id]
  (auth)/             # login, signup με role selection
  (dashboard)/        # user private area
  admin/              # admin dashboard
  api/                # webhooks μόνο· τα reads γίνονται σε RSC
lib/
  supabase/           # client factories: server, browser, service
  actions/            # server actions ομαδοποιημένα ανά domain
  db/                 # zod schemas + typed queries
  domain/             # pure helpers (variant diffing, sorting)
components/
  ui/                 # design-system primitives
  features/           # domain-specific components
supabase/
  migrations/         # versioned SQL
  seed/               # regions, seed products
```

### 3.3 Εξωτερικές εξαρτήσεις (MVP)

Καμία εκτός Supabase και Vercel. Δεν υπάρχει email provider, SMS gateway, ή search engine.

## 4. Data model

Όλα τα tables ζουν στο `public` schema. Το Supabase Auth κρατάει `auth.users`.

### 4.1 Tables

**`profiles`** — 1-προς-1 με `auth.users`
```
id            uuid PK, FK → auth.users.id
role          enum('farmer','merchant','factory','admin')
display_name  text NOT NULL
phone         text NOT NULL
region_code   text NOT NULL       -- FK → regions.code
municipality  text                 -- free text, optional
avatar_path   text
bio           text
website       text
vat_number    text
is_public     boolean DEFAULT true   -- farmers can set false
is_active     boolean DEFAULT true   -- admin suspend flag
deleted_at    timestamptz
created_at, updated_at
```

**`regions`** — seeded lookup (74 rows, ελληνικοί Νομοί/Περιφερειακές Ενότητες)
```
code    text PK      -- 'GR-ATT-C', 'GR-MES', ...
name_el text NOT NULL
```

**`products`** — global catalog
```
id                uuid PK
slug              text UNIQUE
name_el           text NOT NULL
category          text NOT NULL       -- 'ελιές', 'ελαιόλαδο', 'σιτηρά'
unit              text NOT NULL       -- 'κιλό', 'λίτρο', 'τόνος'
attributes_schema jsonb NOT NULL      -- ορίζει τα quality fields
status            enum('active','pending','rejected') DEFAULT 'pending'
proposed_by       uuid FK → profiles.id  -- null για seeded
created_at
```

Παράδειγμα `attributes_schema` για ελιές:
```json
{
  "grade": {
    "type": "enum",
    "label": "Νούμερο/Καλίμπρο",
    "values": ["101-110", "111-120", "121-140", "141-160", "161-180", "181-200", "201+"]
  }
}
```

Παράδειγμα για ελαιόλαδο:
```json
{
  "acidity_max": {"type": "number", "label": "Οξύτητα max", "unit": "%"},
  "kind": {"type": "enum", "label": "Τύπος", "values": ["χύμα", "τυποποιημένο"]}
}
```

**`price_listings`** — τιμοκατάλογος εμπόρου/εργοστασίου
```
id           uuid PK
owner_id     uuid FK → profiles.id (role in merchant/factory)
product_id   uuid FK → products.id
variants     jsonb NOT NULL   -- [{attributes: {grade: '111-120'}, price: 1.95, currency: 'EUR'}, ...]
region_code  text FK → regions.code
notes        text
is_active    boolean DEFAULT true
created_at, updated_at        -- updated_at = "τελευταία ενημέρωση τιμής"
```

**`production_listings`** — παραγωγή αγρότη
```
id              uuid PK
owner_id        uuid FK → profiles.id (role='farmer')
product_id      uuid FK → products.id
attributes      jsonb           -- {grade: '111-120'} — single quality
quantity        numeric NOT NULL
unit            text            -- overrides product.unit αν χρειάζεται
region_code     text FK → regions.code
available_from  date
available_until date
is_active       boolean DEFAULT true
created_at, updated_at
```

**`favorites`**
```
user_id    uuid FK → profiles.id (farmer)
target_id  uuid FK → profiles.id (merchant/factory)
created_at
PK (user_id, target_id)
```

**`notifications`**
```
id         uuid PK
user_id    uuid FK → profiles.id
kind       enum('price_changed')       -- επεκτάσιμο post-MVP
payload    jsonb NOT NULL              -- {listing_id, target_profile_id, product_id, changed_variants}
read_at    timestamptz
created_at
```

**`deal_marks`** — optional analytics flag
```
id         uuid PK
farmer_id  uuid FK → profiles.id
target_id  uuid FK → profiles.id
product_id uuid FK → products.id
created_at
```

### 4.2 Δείκτες (indexes)

- `profiles(role, is_active, is_public, region_code)` — για search filtering
- `products(status, category)` — για dropdown filtering
- `price_listings(product_id, region_code, is_active)` + GIN index στο `variants`
- `production_listings(product_id, region_code, is_active, available_from, available_until)`
- `favorites(target_id)` — για fan-out στο notification insert
- `notifications(user_id, read_at, created_at DESC)`

### 4.3 RLS policies (high-level)

- **`profiles`**
  - SELECT για anonymous: `is_active=true AND (role IN ('merchant','factory') OR (role='farmer' AND is_public=true))`
  - UPDATE μόνο owner (`auth.uid()=id`)
- **`products`**
  - SELECT anonymous: `status='active'`
  - SELECT authenticated: επιπλέον `status='pending' AND proposed_by=auth.uid()`
  - INSERT authenticated (status='pending', proposed_by=auth.uid())
  - Admin bypass μέσω service-role
- **`price_listings`, `production_listings`**
  - SELECT για όλους (anonymous & authenticated): `is_active=true AND EXISTS (SELECT 1 FROM profiles p WHERE p.id=owner_id AND p.is_active=true AND (p.role IN ('merchant','factory') OR (p.role='farmer' AND p.is_public=true)))`
  - INSERT/UPDATE/DELETE: μόνο owner (`owner_id=auth.uid()`), και επιπλέον role check σε server action (merchant/factory για price_listings, farmer για production_listings)
- **`favorites`, `notifications`, `deal_marks`**
  - SELECT/INSERT/UPDATE/DELETE μόνο ο ίδιος ο user

## 5. Auth & Roles

### 5.1 Signup flow

1. Landing page → επιλογή ρόλου (farmer / merchant / factory) — 3 κάρτες.
2. Multi-step form:
   - Βήμα 1: email, password.
   - Βήμα 2: role-specific υποχρεωτικά:
     - farmer: display_name, region_code, phone
     - merchant/factory: display_name (επωνυμία), region_code, phone, bio (σύντομη περιγραφή δραστηριότητας)
3. `supabase.auth.signUp()` δημιουργεί `auth.users`.
4. Server Action `createProfile()` δημιουργεί `profiles` row.
5. Ο χρήστης γίνεται αμέσως `is_active=true`. Δεν απαιτείται email verification στο MVP (μπορεί να ενεργοποιηθεί μελλοντικά με Supabase config).
6. Redirect στο dashboard.

**Merchants/factories** μπορούν να ξεκινήσουν χωρίς τιμοκατάλογο — το dashboard τους δείχνει CTA "Πρόσθεσε τον πρώτο σου τιμοκατάλογο" μέχρι να έχουν ένα.

### 5.2 Login & session

Standard Supabase Auth (email + password). Session cookie set από Supabase SSR helpers. Password reset μέσω `resetPasswordForEmail`.

### 5.3 Role guards

- Middleware στο `app/(dashboard)/layout.tsx` και `app/admin/layout.tsx` — fetch `profile.role`, redirect αν λάθος ή αν `is_active=false`.
- Server Actions **πάντα** ελέγχουν role από session πριν κάνουν οτιδήποτε — δεν βασιζόμαστε μόνο σε RLS για writes.

### 5.4 Admin bootstrap

`SEED_ADMIN_EMAIL` env var. Το `createProfile` server action ελέγχει: αν το email του νέου user ταιριάζει, το `role` γίνεται `'admin'`. Επόμενοι admins προωθούνται από τον πρώτο admin μέσα από το admin dashboard.

## 6. Search & Public listings

### 6.1 Routes

- `/search/buyers` — "Βρες Αγοραστή" (default για farmers)
- `/search/producers` — "Βρες Παραγωγό" (default για merchants/factories)
- `/profile/[id]` — δημόσια σελίδα προφίλ

Και οι δύο tab-based, και οι δύο public (χωρίς login).

### 6.2 Filters

**"Βρες Αγοραστή":**
- Νομός (dropdown από `regions`)
- Προϊόν (searchable dropdown από `products WHERE status='active'`)
- Ποιότητα (conditional: μόνο όταν προϊόν έχει επιλεχθεί, options από `attributes_schema`)
- Τύπος αγοραστή (multi-checkbox: merchant, factory)
- Sort: τιμή (καλύτερη → χειρότερη), πιο πρόσφατη ενημέρωση

**"Βρες Παραγωγό":**
- Νομός
- Προϊόν
- Date range για `available_from`/`available_until`
- Ελάχιστη ποσότητα

### 6.3 Query implementation

Server Component ανά page:
1. Reads filters από URL search params (server-rendered, shareable URLs).
2. Καλεί typed query helper (`lib/db/searchBuyers.ts`) που κάνει Supabase query με joins. Οι τύποι έρχονται από `supabase gen types typescript` (generated στο `lib/db/database.types.ts`).
3. Το ranking για "καλύτερη τιμή" γίνεται σε SQL μέσω `jsonb_array_elements(variants)` + `ORDER BY (elem->>'price')::numeric ASC` όπου `attributes` ταιριάζουν στο filter.
4. Cursor pagination (`created_at + id`), 20 results/page.

**Δεν** χρησιμοποιούμε full-text search στο MVP.

### 6.4 Result cards

Ανά προφίλ (όχι ανά listing):
- avatar, display_name, νομός, role badge
- best matching variant: "Ελιές Καλαμών 111-120 από 1,95 €/κιλό"
- "Ενημέρωση: πριν 2 μέρες" (από `updated_at`)
- "Δες προφίλ" CTA + ❤️ favorite (αν logged in)

### 6.5 Profile page

`/profile/[id]` — όλες οι listings του χρήστη, στοιχεία επικοινωνίας (phone πάντα ορατό στους logged in χρήστες, email αν δηλωμένο ως δημόσιο). Το "Επικοινωνία" κουμπί απαιτεί login — anonymous βλέπει login-wall. Αυτό αποτρέπει scraping.

## 7. Notifications & Favorites

### 7.1 Favorites

- Farmer πατάει ❤️ σε κάρτα ή profile page.
- Server Action `toggleFavorite(targetId)` κάνει insert/delete στο `favorites`.
- Optimistic UI update.
- `/dashboard/favorites` — λίστα των favorited profiles με τις τρέχουσες τιμές τους.

### 7.2 Notifications (MVP: μόνο price-changed)

**Trigger:** αλλαγή τιμής σε τιμοκατάλογο που έχει favorited τουλάχιστον ένας farmer.

**Flow στο `updatePriceListing(id, newVariants)` server action:**
1. Fetch το existing row.
2. `UPDATE price_listings` με τα νέα variants.
3. Diff variants:
   - Δύο variants ταιριάζουν αν τα `attributes` τους είναι deep-equal (σειριοποιούμε με stable JSON key sort για σύγκριση).
   - Αν βρεθεί variant στο νέο set με τα ίδια attributes αλλά διαφορετικό `price` από το παλιό — προστίθεται στο `changed_variants` με `{attributes, old_price, new_price}`.
   - Νέες variants (attributes που δεν υπήρχαν πριν) και διαγραμμένες variants δεν πυροδοτούν notifications στο MVP.
4. Αν `changed_variants` δεν είναι κενό:
   ```sql
   INSERT INTO notifications (user_id, kind, payload)
   SELECT f.user_id, 'price_changed', $payload
   FROM favorites f
   WHERE f.target_id = $owner_id
   ```
5. `revalidatePath` στο profile & στα dashboards.

Το diffing γίνεται σε application code (καθαρό, testable). Καμία background job — όλα atomic στο ίδιο request.

### 7.3 Delivery UI

- Καμπανάκι στο header, badge = count `notifications WHERE read_at IS NULL`.
- Dropdown με τις 10 τελευταίες. Full page: `/dashboard/notifications`.
- Live update: Supabase Realtime subscription `notifications:user_id=eq.{me}` — new INSERT bumps το badge χωρίς refresh.
- Mark-as-read: automatic όταν ανοίγεις dropdown ή page.
- Deep-link: κάθε notification links στο profile του merchant.

### 7.4 Edge case

Αν κάνεις favorite μετά την αλλαγή τιμής, δεν παίρνεις retroactive notification. Αυτό είναι by design.

## 8. Admin Dashboard

Middleware-guarded `/admin`. Side nav με:

- **Χρήστες** — table filter (ρόλος, νομός, active/suspended). Actions: view profile, suspend, promote to admin, soft delete.
- **Προϊόντα** — 3 tabs:
  - Ενεργά — edit metadata & `attributes_schema`.
  - Εκκρεμούν (`status='pending'`) — approve/reject.
  - "+ Νέο προϊόν" — direct create.
- **Στατιστικά** — cards & simple charts:
  - Users ανά ρόλο
  - Νέες εγγραφές τελευταίες 30 μέρες
  - Ενεργά listings (price + production)
  - Top 5 νομοί
  - Deal marks total
- **Reports** — table από `reports` (schema present στο MVP, UI minimal).
- **Export** — CSV export server actions για users και listings.

Το admin χρησιμοποιεί service-role Supabase client μόνο μέσα σε server actions με explicit `role='admin'` check.

## 9. UI & Design

- **Χρωματική παλέτα** (από brand):
  - Primary dark green `#1B4D2E`
  - Primary mid green `#4C9A3A`
  - Earth brown `#A9652E`
  - Off-white background `#FAFAF7`
  - Text `#1A1A1A`
- **Typography:** Inter (Google Fonts), bold για τίτλους.
- **Layout:** card-based, mobile-first, whitespace-heavy.
- **Navigation:** Αρχική / Αναζήτηση / Προφίλ μου / Αγαπημένα / Ειδοποιήσεις.
- **Icons:** Lucide (outline style).
- **Component library:** shadcn/ui + Tailwind.

## 10. Testing

**3 επίπεδα:**

1. **Unit (Vitest)** — TDD για:
   - Server actions (auth checks, validation, side effects όπως notification diffing)
   - Domain helpers: variant diffing, region parsing, price sorting/ranking
2. **Integration** — Local Supabase (docker) για κρίσιμα flows:
   - Signup → createProfile → login
   - Merchant edits price → farmer με favorite παίρνει notification
   - RLS: anonymous δεν βλέπει suspended profiles, δεν βλέπει άλλων notifications
3. **E2E (Playwright)** — smoke tests μόνο (2-3 flows):
   - Signup ως farmer → search → favorite
   - Merchant edits price → farmer βλέπει notification live

**Δεν** γράφουμε unit tests για UI components στο MVP. Το UI code δεν γράφεται test-first.

## 11. Deployment

- **Vercel:** ένα project, main → production, PRs → preview.
- **Supabase:** ένα project production, ένα staging (ή local docker για dev).
- **Migrations:** `supabase/migrations/*.sql` versioned. CI runs `supabase db push` στο staging πριν το production.
- **Env vars:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SEED_ADMIN_EMAIL`
- **Observability MVP-level:** Vercel Analytics + Supabase logs. Sentry post-MVP.

## 12. Out of scope για MVP

- Email/SMS notifications
- In-app chat/messaging
- "Καλύτερης τιμής" auto-detection notifications
- OTP/SMS auth, Google login
- Bilingual UI (i18n)
- Full-text search
- Complex reporting/moderation flow beyond suspend
- Πλήρης ιεραρχία Δήμων (μόνο free text)
- Payment processing (never — per product spec)

## 13. Sitemap

- `/` — landing
- `/auth/signup?role=farmer|merchant|factory`
- `/auth/login`
- `/auth/reset-password`
- `/search/buyers` — public
- `/search/producers` — public
- `/profile/[id]` — public view (contact login-walled)
- `/dashboard` — role-dependent home
- `/dashboard/profile` — edit profile
- `/dashboard/listings` — my price/production listings (edit)
- `/dashboard/favorites`
- `/dashboard/notifications`
- `/admin/*` — admin only
