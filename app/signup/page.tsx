import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/site/header";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";
import { SignupForm } from "./signup-form";
import type { Region } from "@/lib/db/types";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const { data: regions } = await supabase.from("regions").select("code, name_el").order("name_el");
  const params = await searchParams;
  // Combined roles (farmer_fisher, farmer_stockbreeder, farmer_beekeeper)
  // are set later from the dashboard, not chosen at signup. Old links
  // pointing at ?role=farmer_fisher fall back to `farmer` gracefully.
  const ALLOWED_ROLES = [
    "farmer",
    "fisher",
    "stockbreeder",
    "beekeeper",
    "merchant",
    "factory",
    "agri_supplier",
  ] as const;
  type SignupRole = (typeof ALLOWED_ROLES)[number];
  const initialRole: SignupRole = (ALLOWED_ROLES as readonly string[]).includes(params.role ?? "")
    ? (params.role as SignupRole)
    : "farmer";

  return (
    <>
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-10 sm:py-14">
        <Card className="!p-7 sm:!p-8">
          <div className="mb-6 text-center">
            <Link href="/" aria-label="AGROTIK" className="inline-block mb-4">
              <Logo size={56} />
            </Link>
            <h1 className="display text-3xl text-brand-dark">Δωρεάν εγγραφή</h1>
            <p className="mt-2 text-brand-muted text-[14px]">Καμία μεσιτεία, καμία προμήθεια — μόνο σύνδεση.</p>
          </div>
          <SignupForm regions={(regions as Region[]) ?? []} initialRole={initialRole} />
        </Card>
        <p className="mt-6 text-sm text-brand-muted text-center">
          Έχεις ήδη λογαριασμό;{" "}
          <Link href="/login" className="text-brand-mid hover:underline font-medium">
            Σύνδεση
          </Link>
        </p>
      </div>
    </>
  );
}
