import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/site/header";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
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
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-brand-dark/8 text-brand-dark inline-flex items-center justify-center mb-4">
            <Icon name="unlock" className="text-xl" />
          </div>
          <h1 className="display text-4xl text-brand-dark">Σύνδεση</h1>
          <p className="mt-3 text-brand-muted text-[15px]">
            Καλωσόρισες πίσω στο AGROTIK.
          </p>
        </div>
        <Card>
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
