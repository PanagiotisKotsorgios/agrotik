import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Header } from "@/components/site/header";
import { Card, Eyebrow } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <Header />
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="mb-6">
          <Eyebrow>Επιστροφή στο σύστημα</Eyebrow>
          <h1 className="display text-3xl text-brand-dark mt-1">Σύνδεση</h1>
        </div>
        <Card>
          <LoginForm />
        </Card>
        <p className="mt-6 text-sm text-brand-muted text-center">
          Δεν έχεις λογαριασμό;{" "}
          <Link href="/signup" className="text-brand-mid hover:underline font-medium">
            Δωρεάν εγγραφή
          </Link>
        </p>
      </div>
    </>
  );
}
