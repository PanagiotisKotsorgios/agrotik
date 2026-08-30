// Populate the local database with demo users and listings.
// Usage from WSL: node scripts/seed-demo.mjs
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing env vars");

const svc = createClient(url, key, { auth: { persistSession: false } });

const users = [
  {
    email: "farmer1@agrotik.local",
    password: "farmer123",
    profile: {
      role: "farmer",
      display_name: "Γιώργος Παπαδόπουλος",
      phone: "+306944000001",
      region_code: "MES",
      municipality: "Καλαμάτα",
      bio: "Ελαιοπαραγωγή στην Καλαμάτα, ~15 στρέμματα",
      is_public: true,
    },
  },
  {
    email: "farmer2@agrotik.local",
    password: "farmer123",
    profile: {
      role: "farmer",
      display_name: "Δήμητρα Νικολαΐδου",
      phone: "+306944000002",
      region_code: "HER",
      municipality: "Ηράκλειο",
      bio: "Ελαιοπαραγωγός Κρήτης · Κορωνέικη",
      is_public: true,
    },
  },
  {
    email: "merchant1@agrotik.local",
    password: "merchant123",
    profile: {
      role: "merchant",
      display_name: "Αγροεμπορική Πελοποννήσου",
      phone: "+302710000010",
      region_code: "ARK",
      bio: "Εμπορία ελιάς & ελαιολάδου, Πελοπόννησος",
      website: "https://example.gr",
    },
  },
  {
    email: "factory1@agrotik.local",
    password: "factory123",
    profile: {
      role: "factory",
      display_name: "Ελαιουργείο Κρήτης",
      phone: "+302810000011",
      region_code: "CHA",
      bio: "Τυποποίηση ελαιολάδου, Χανιά",
    },
  },
];

const created = new Map();
for (const u of users) {
  const { data, error } = await svc.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
  });
  if (error && !String(error.message).includes("already been registered")) {
    console.error(u.email, error.message);
    continue;
  }
  const uid =
    data?.user?.id ??
    (await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.find(
      (x) => x.email === u.email,
    )?.id;
  if (!uid) continue;
  created.set(u.email, uid);
  await svc.from("profiles").upsert({ id: uid, ...u.profile }, { onConflict: "id" });
  console.log("✓", u.email, "→", uid);
}

// Some listings
const { data: prods } = await svc.from("products").select("id, slug, unit").eq("status", "active");
const bySlug = new Map(prods.map((p) => [p.slug, p]));

async function insert(table, row) {
  await svc.from(table).delete().eq("owner_id", row.owner_id).eq("product_id", row.product_id);
  await svc.from(table).insert(row);
}

const olives = bySlug.get("olives-kalamon");
const oil = bySlug.get("olive-oil-bulk");
const wheat = bySlug.get("wheat-durum");

if (olives && created.has("merchant1@agrotik.local")) {
  await insert("price_listings", {
    owner_id: created.get("merchant1@agrotik.local"),
    product_id: olives.id,
    region_code: "ARK",
    variants: [
      { attributes: { grade: "101-110" }, price: 2.10, currency: "EUR" },
      { attributes: { grade: "111-120" }, price: 1.95, currency: "EUR" },
      { attributes: { grade: "121-140" }, price: 1.70, currency: "EUR" },
    ],
    notes: "Παραλαβή στο μαγαζί.",
    is_active: true,
  });
}
if (oil && created.has("factory1@agrotik.local")) {
  await insert("price_listings", {
    owner_id: created.get("factory1@agrotik.local"),
    product_id: oil.id,
    region_code: "CHA",
    variants: [
      { attributes: { kind: "Έξτρα Παρθένο" }, price: 4.20, currency: "EUR" },
      { attributes: { kind: "Παρθένο" }, price: 3.80, currency: "EUR" },
    ],
    notes: "Οξύτητα < 0.8%",
    is_active: true,
  });
}

// Production listings
if (olives && created.has("farmer1@agrotik.local")) {
  await insert("production_listings", {
    owner_id: created.get("farmer1@agrotik.local"),
    product_id: olives.id,
    region_code: "MES",
    quantity: 1200,
    unit: "κιλό",
    attributes: { grade: "111-120" },
    available_from: "2026-10-15",
    available_until: "2026-12-31",
    is_active: true,
  });
}
if (oil && created.has("farmer2@agrotik.local")) {
  await insert("production_listings", {
    owner_id: created.get("farmer2@agrotik.local"),
    product_id: oil.id,
    region_code: "HER",
    quantity: 800,
    unit: "λίτρο",
    attributes: { kind: "Έξτρα Παρθένο" },
    is_active: true,
  });
}

console.log("Demo seed complete.");
console.log("Login:");
users.forEach((u) => console.log("  ", u.email, "/", u.password));
