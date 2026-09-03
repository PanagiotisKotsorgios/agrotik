import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getRegions, getActiveProducts } from "@/lib/db/queries";
import { Eyebrow } from "@/components/ui/card";
import { PriceListingsManager } from "./price-manager";
import { ProductionListingsManager } from "./production-manager";
import { hasFisherRole, isProducerRole } from "@/lib/utils";

export default async function ListingsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const [regions, products] = await Promise.all([getRegions(), getActiveProducts()]);

  if (isProducerRole(profile?.role)) {
    const isFisher = hasFisherRole(profile?.role);
    const isDualProducer = profile?.role === "farmer_fisher";
    const producerProducts = products.filter((product) =>
      isDualProducer
        ? true
        : isFisher
          ? product.category === "Αλιευτικά είδη"
          : product.category !== "Αλιευτικά είδη",
    );
    const { data: listings } = await supabase
      .from("production_listings")
      .select("*, products(name_el, unit, attributes_schema), regions(name_el)")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false });

    return (
      <>
        <div className="mb-6">
          <Eyebrow>Καταχώρηση</Eyebrow>
          <h1 className="display text-3xl text-brand-dark mt-1 field-underline">
            {isDualProducer ? "Η παραγωγή & τα αλιεύματά μου" : isFisher ? "Τα αλιεύματά μου" : "Η παραγωγή μου"}
          </h1>
          <p className="mt-3 text-brand-muted">
            {isDualProducer
              ? "Καταχώρισε αγροτική παραγωγή ή αλιεύματα από τον ίδιο λογαριασμό. Κάθε καταχώρηση εμφανίζεται στα σωστά φίλτρα αναζήτησης."
              : isFisher
              ? "Δήλωσε το είδος αλιεύματος, την ποσότητα και τη διαθεσιμότητα. Η καταχώρηση γίνεται αμέσως ορατή στους αγοραστές."
              : "Δήλωσε τι έχεις έτοιμο και σε τι ποσότητα. Οι εγγραφές γίνονται αμέσως ορατές στην αναζήτηση αγοραστών."}
          </p>
        </div>
        <ProductionListingsManager
          initialListings={(listings as any[]) ?? []}
          products={producerProducts}
          regions={regions}
          isFisher={isFisher}
          isDualProducer={isDualProducer}
        />
      </>
    );
  }

  const { data: listings } = await supabase
    .from("price_listings")
    .select("*, products(name_el, unit, attributes_schema), regions(name_el)")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });

  const isFactory = profile?.role === "factory";

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Τιμοκατάλογοι</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">
          {isFactory ? "Οι τιμοκατάλογοί μου" : "Οι τιμές που αγοράζω"}
        </h1>
        <p className="mt-3 text-brand-muted">
          {isFactory
            ? "Μπορείς να έχεις πολλαπλούς τιμοκαταλόγους: αγοράς από παραγωγό ή έμπορο, χονδρικής/λιανικής πώλησης. Καθένας εμφανίζεται στους σωστούς χρήστες."
            : "Ενημέρωσε συχνά — οι αγρότες και αλιείς που σε παρακολουθούν λαμβάνουν ειδοποίηση όταν αλλάζεις τιμή."}
        </p>
      </div>
      <PriceListingsManager
        initialListings={(listings as any[]) ?? []}
        products={products}
        regions={regions}
        role={profile?.role as "merchant" | "factory"}
      />
    </>
  );
}
