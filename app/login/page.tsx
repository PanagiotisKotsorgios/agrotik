import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/site/header";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Σύνδεση" };

export default async function LoginPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <Header />
      <div className="max-w-md mx-auto px-4 py-10 sm:py-14">
        <Card className="!p-7 sm:!p-8">
          <div className="mb-6 text-center">
            <Link href="/" aria-label="AGROTIK" className="inline-block mb-4">
              <Logo size={56} />
            </Link>
            <h1 className="display text-3xl text-brand-dark">Σύνδεση</h1>
            <p className="mt-2 text-brand-muted text-[14px]">Καλωσόρισες πίσω στο AGROTIK.</p>
          </div>
          <LoginForm />
        </Card>
        <p className="mt-6 text-sm text-brand-muted text-center">
          Δεν έχεις λογαριασμό;{" "}
          <Link href="/signup" className="text-brand-mid hover:underline font-semibold">
            Δωρεάν εγγραφή
          </Link>
        </p>
      </div>
    </>
  );
}
