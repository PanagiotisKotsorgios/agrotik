import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getRegions, getActiveProducts } from "@/lib/db/queries";
import { Eyebrow } from "@/components/ui/card";
import { PriceListingsManager } from "./price-manager";
import { ProductionListingsManager } from "./production-manager";
import {
  hasBeekeeperRole,
  hasFisherRole,
  hasStockbreederRole,
  isProducerRole,
} from "@/lib/utils";

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
    const isStockbreeder = hasStockbreederRole(profile?.role);
    const isBeekeeper = hasBeekeeperRole(profile?.role);
    const isDualFarmerFisher = profile?.role === "farmer_fisher";
    const isDualFarmerStockbreeder = profile?.role === "farmer_stockbreeder";
    const isDualFarmerBeekeeper = profile?.role === "farmer_beekeeper";
    const isDualProducer =
      isDualFarmerFisher || isDualFarmerStockbreeder || isDualFarmerBeekeeper;

    const SEAFOOD = "Αλιευτικά είδη";
    const LIVESTOCK = "Κτηνοτροφικά προϊόντα";
    const BEEKEEPING = "Μελισσοκομικά προϊόντα";

    const producerProducts = products.filter((product) => {
      if (isDualFarmerFisher) return product.category !== LIVESTOCK && product.category !== BEEKEEPING;
      if (isDualFarmerStockbreeder) return product.category !== SEAFOOD && product.category !== BEEKEEPING;
      if (isDualFarmerBeekeeper) return product.category !== SEAFOOD && product.category !== LIVESTOCK;
      if (isFisher) return product.category === SEAFOOD;
      if (isStockbreeder) return product.category === LIVESTOCK;
      if (isBeekeeper) return product.category === BEEKEEPING;
      // pure farmer — crops only
      return product.category !== SEAFOOD && product.category !== LIVESTOCK && product.category !== BEEKEEPING;
    });
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
            {isDualFarmerFisher
              ? "Η παραγωγή & τα αλιεύματά μου"
              : isDualFarmerStockbreeder
                ? "Η παραγωγή & τα κτηνοτροφικά μου"
                : isDualFarmerBeekeeper
                  ? "Η παραγωγή & τα μελισσοκομικά μου"
                  : isBeekeeper
                    ? "Τα μελισσοκομικά μου"
                    : isStockbreeder
                      ? "Τα κτηνοτροφικά μου"
                      : isFisher
                        ? "Τα αλιεύματά μου"
                        : "Η παραγωγή μου"}
          </h1>
          <p className="mt-3 text-brand-muted">
            {isDualProducer
              ? "Καταχώρισε δύο διαφορετικές δραστηριότητες από τον ίδιο λογαριασμό. Κάθε καταχώρηση εμφανίζεται στα σωστά φίλτρα αναζήτησης."
              : isBeekeeper
                ? "Δήλωσε το είδος μελιού ή προϊόντος κυψέλης, την ποσότητα και τη διαθεσιμότητα. Η καταχώρηση γίνεται αμέσως ορατή στους αγοραστές."
                : isStockbreeder
                  ? "Δήλωσε το κτηνοτροφικό προϊόν, την ποσότητα και τη διαθεσιμότητα. Η καταχώρηση γίνεται αμέσως ορατή στους αγοραστές."
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
