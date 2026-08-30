import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/site/header";
import { Card, Eyebrow } from "@/components/ui/card";
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
  const initialRole = ["farmer", "merchant", "factory"].includes(params.role ?? "")
    ? (params.role as "farmer" | "merchant" | "factory")
    : "farmer";

  return (
    <>
      <Header />
      <div className="max-w-lg mx-auto px-4 py-14">
        <div className="mb-6">
          <Eyebrow>Ένταξη</Eyebrow>
          <h1 className="display text-3xl text-brand-dark mt-1">Εγγραφή στο AGROTIK</h1>
          <p className="mt-3 text-brand-muted">
            Δωρεάν · καμία μεσιτεία · καμία προμήθεια. Χρειάζονται λίγα βασικά στοιχεία.
          </p>
        </div>
        <Card>
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
