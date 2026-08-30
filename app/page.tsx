// Server-only page — never SSG. Requires runtime env (Supabase URL + keys).
export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Eyebrow, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Ticker, type TickerItem } from "@/components/site/ticker";
import { ProfilesCarousel, type CarouselProfile } from "@/components/site/profiles-carousel";
import { createSupabaseService } from "@/lib/supabase/service";
import { bestVariant } from "@/lib/domain/variants";

async function safeFetchLandingData() {
  try {
    const svc = createSupabaseService();
    return await Promise.all([
      svc
        .from("price_listings")
        .select(
          `id, updated_at, variants, region_code,
           products(name_el, unit),
           profiles!inner(id, display_name, role, is_active),
           regions(name_el)`,
        )
        .eq("is_active", true)
        .eq("profiles.is_active", true)
        .order("updated_at", { ascending: false })
        .limit(12),
      svc
        .from("profiles")
        .select("id, display_name, role, region_code, municipality, bio, is_active, is_public, deleted_at, regions(name_el)")
        .eq("is_active", true)
        .neq("role", "admin")
        .or("role.in.(merchant,factory),and(role.eq.farmer,is_public.eq.true)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(8),
    ]);
  } catch (e) {
    console.error("[landing] Supabase unavailable:", e);
    return [{ data: [] as any[] }, { data: [] as any[] }] as const;
  }
}

export default async function LandingPage() {
  const [{ data: latest }, { data: newestUsers }] = await safeFetchLandingData();

  const ticker: TickerItem[] = ((latest as any[]) ?? [])
    .map((row) => {
      const bv = bestVariant(row.variants ?? []);
      if (!bv) return null;
      return {
        profileId: row.profiles.id,
        productName: row.products.name_el,
        price: bv.price,
        unit: row.products.unit,
        regionName: row.regions?.name_el ?? row.region_code,
        updatedAt: row.updated_at,
      } as TickerItem;
    })
    .filter(Boolean) as TickerItem[];

  const carousel: CarouselProfile[] = ((newestUsers as any[]) ?? []).map((p) => ({
    id: p.id,
    display_name: p.display_name,
    role: p.role,
    region_name: p.regions?.name_el ?? p.region_code,
    municipality: p.municipality,
    bio: p.bio,
  }));

  return (
    <>
      <Header />

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center -z-10"
        />
        {/* Gradient overlay for legibility */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(20, 40, 25, 0.72) 0%, rgba(20, 40, 25, 0.68) 40%, rgba(15, 30, 20, 0.88) 100%)",
          }}
          aria-hidden
        />
        {/* Subtle green tint */}
        <div className="absolute inset-0 -z-10 bg-brand-dark/20" aria-hidden />

        <div className="max-w-6xl mx-auto px-4 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
          <div className="max-w-3xl animate-fade-in-up">
            <div className="eyebrow !text-white/90">
              Ελληνική αγροτική αγορά · πραγματικές τιμές
            </div>
            <h1 className="display mt-4 text-[46px] sm:text-[68px] leading-[0.98] font-semibold text-white tracking-tight">
              Η γη <em className="not-italic text-brand-earth" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}>συναντά</em> την αγορά.
            </h1>
            <p className="mt-6 text-white/85 text-[18px] sm:text-[20px] max-w-2xl leading-relaxed">
              Το AGROTIK συνδέει αγρότες με εμπόρους και εργοστάσια — άμεσα.
              Ενημερωμένες τιμές, δημόσια προφίλ, καμία μεσιτεία. Απλά μια γέφυρα
              για να κλείσετε τη συμφωνία σας.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md bg-brand-mid text-white text-[16px] font-semibold hover:bg-brand-light hover:text-brand-dark transition-colors shadow-lg shadow-black/20"
              >
                Δωρεάν εγγραφή
                <Icon name="arrowRight" />
              </Link>
              <Link
                href="/search/buyers"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-md bg-white/10 backdrop-blur-sm border-2 border-white/25 text-white text-[16px] font-semibold hover:bg-white hover:text-brand-dark transition-colors"
              >
                <Icon name="search" />
                Δες τιμές αγοραστών
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-5 text-white/70 text-[13px]">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" className="text-brand-light" /> Δωρεάν
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="check" className="text-brand-light" /> Χωρίς προμήθεια
              </span>
              <span className="inline-flex items-center gap-1.5 hidden sm:inline-flex">
                <Icon name="check" className="text-brand-light" /> Ελληνική υποστήριξη
              </span>
            </div>
          </div>
        </div>
      </section>

      <Ticker items={ticker} />

      {carousel.length > 0 && <ProfilesCarousel profiles={carousel} />}

      {/* Public search hub — big, plain-language shortcuts for elderly users */}
      <section className="max-w-6xl mx-auto px-4 py-14">
        <div className="mb-8">
          <Eyebrow>Ξεκίνα εδώ</Eyebrow>
          <h2 className="display mt-2 text-3xl sm:text-4xl text-brand-dark field-underline">
            Τι ψάχνεις σήμερα;
          </h2>
          <p className="mt-3 text-brand-muted text-[16px] max-w-2xl">
            Δεν χρειάζεσαι λογαριασμό για να δεις τιμές και παραγωγή. Πάτησε αυτό που ταιριάζει σε εσένα.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <SearchCta
            icon="store"
            eyebrow="Είμαι αγρότης"
            title="Ψάχνω αγοραστή"
            body="Δες τιμές που δίνουν έμποροι και εργοστάσια στην περιοχή σου. Φιλτράρισε ανά προϊόν, νομό ή δήμο."
            href="/search/buyers"
            cta="Δες αγοραστές"
            tone="dark"
          />
          <SearchCta
            icon="seedling"
            eyebrow="Είμαι έμπορος ή εργοστάσιο"
            title="Ψάχνω παραγωγό / προμηθευτή"
            body="Βρες αγρότες με διαθέσιμη παραγωγή. Φιλτράρισε ανά προϊόν, ποσότητα και ημερομηνία."
            href="/search/producers"
            cta="Δες παραγωγούς"
            tone="olive"
          />
        </div>

        {/* Quick category shortcuts */}
        <div className="mt-6">
          <div className="eyebrow mb-3">Γρήγορη επιλογή προϊόντος</div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Ελιές", cat: "Ελιές", icon: "seedling" as const },
              { label: "Ελαιόλαδο", cat: "Ελαιόλαδο", icon: "wheat" as const },
              { label: "Σιτηρά", cat: "Σιτηρά", icon: "wheat" as const },
              { label: "Εσπεριδοειδή", cat: "Εσπεριδοειδή", icon: "seedling" as const },
              { label: "Λαχανικά", cat: "Λαχανικά", icon: "seedling" as const },
              { label: "Πυρηνόκαρπα", cat: "Πυρηνόκαρπα", icon: "seedling" as const },
            ].map((c) => (
              <Link
                key={c.cat}
                href={`/search/buyers?product_category=${encodeURIComponent(c.cat)}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-brand-surface border border-brand-border text-[15px] font-semibold text-brand-dark hover:border-brand-dark hover:bg-brand-dark hover:text-white transition-colors"
              >
                <Icon name={c.icon} className="opacity-80" />
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="max-w-6xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Eyebrow>Πώς λειτουργεί</Eyebrow>
          <h2 className="display mt-2 text-3xl text-brand-dark field-underline">
            Τρεις πλευρές. Μία πλατφόρμα.
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <RoleCard
            icon="seedling"
            title="Αγρότης"
            body="Καταχώρησε την παραγωγή σου, δες ποιος αγοράζει καλύτερα στην περιοχή σου, και πάρε ειδοποιήσεις όταν αλλάζουν οι τιμές."
            href="/signup?role=farmer"
          />
          <RoleCard
            icon="store"
            title="Έμπορος"
            body="Ανέβασε τον τιμοκατάλογό σου, εμφανίσου σε αγρότες που ψάχνουν αγοραστή, και κλείσε τη συμφωνία απευθείας."
            href="/signup?role=merchant"
          />
          <RoleCard
            icon="industry"
            title="Εργοστάσιο"
            body="Δείξε τι αγοράζεις χωρίς μεσάζοντες. Ενημέρωσε τιμές και περιοχές παραλαβής σε πραγματικό χρόνο."
            href="/signup?role=factory"
          />
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-t border-brand-border py-14 bg-brand-surface">
        <div className="max-w-6xl mx-auto px-4 grid sm:grid-cols-3 gap-8 text-[15px]">
          <Feature icon="scale" title="Καμία προμήθεια" body="Κερδίζεις εσύ, όχι ο μεσάζοντας. Ελεύθερη πρόσβαση για όλους." />
          <Feature icon="bell" title="Ενημέρωση σε αλλαγή τιμής" body="Παρακολούθησε αγοραστές· ειδοποίηση όταν αλλάζει τιμή σε αγαπημένους." />
          <Feature icon="mapLocation" title="Ελληνική γεωγραφία" body="74 νομοί / περιφερειακές ενότητες, από την Ήπειρο ως την Κρήτη." />
        </div>
      </section>

      <Footer />
    </>
  );
}

function RoleCard({
  icon,
  title,
  body,
  href,
}: {
  icon: IconName;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <Card className="flex flex-col h-full">
      <div className="w-12 h-12 rounded-md bg-brand-dark/8 text-brand-dark flex items-center justify-center">
        <Icon name={icon} className="text-xl" />
      </div>
      <CardTitle className="mt-5 text-xl">{title}</CardTitle>
      <p className="mt-2 text-[15px] text-brand-muted leading-relaxed flex-1">{body}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 text-brand-dark hover:text-brand-mid text-sm font-semibold"
      >
        Εγγραφή <Icon name="arrowRight" className="text-[0.85em]" />
      </Link>
    </Card>
  );
}

function SearchCta({
  icon,
  eyebrow,
  title,
  body,
  href,
  cta,
  tone,
}: {
  icon: IconName;
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  tone: "dark" | "olive";
}) {
  const styles =
    tone === "dark"
      ? "bg-brand-dark text-white border-brand-dark"
      : "bg-brand-olive/95 text-white border-brand-olive";
  return (
    <Link
      href={href}
      className={
        "group block p-6 sm:p-8 rounded-2xl border shadow-card hover:shadow-elev transition-all hover:-translate-y-0.5 " +
        styles
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div className="w-14 h-14 rounded-xl bg-white/12 text-white flex items-center justify-center shrink-0">
          <Icon name={icon} className="text-2xl" />
        </div>
        <Icon name="arrowRight" className="text-white/70 text-xl mt-2 group-hover:translate-x-1 transition-transform" />
      </div>
      <div className="text-[13px] font-semibold uppercase tracking-widest text-white/70 mt-5">{eyebrow}</div>
      <h3 className="display text-2xl sm:text-3xl mt-1 leading-tight">{title}</h3>
      <p className="mt-2 text-white/85 text-[15px] leading-relaxed">{body}</p>
      <div className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-white text-brand-dark text-[15px] font-semibold shadow-sm">
        {cta} <Icon name="arrowRight" />
      </div>
    </Link>
  );
}

function Feature({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-brand-dark">
        <Icon name={icon} />
        <span className="font-semibold text-[16px]">{title}</span>
      </div>
      <p className="mt-2 text-brand-muted leading-relaxed">{body}</p>
    </div>
  );
}
