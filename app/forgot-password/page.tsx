import Link from "next/link";
import { Header } from "@/components/site/header";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Επαναφορά κωδικού" };

export default function ForgotPasswordPage() {
  return (
    <>
      <Header />
      <div className="max-w-md mx-auto px-4 py-10 sm:py-14">
        <Card className="!p-7 sm:!p-8">
          <div className="mb-6 text-center">
            <Link href="/" aria-label="AGROTIK" className="inline-block mb-4">
              <Logo size={56} />
            </Link>
            <h1 className="display text-3xl text-brand-dark">Ξέχασες τον κωδικό;</h1>
            <p className="mt-2 text-brand-muted text-[14px]">
              Γράψε το email σου και θα σου στείλουμε σύνδεσμο για να ορίσεις νέο κωδικό.
            </p>
          </div>
          <ForgotForm />
        </Card>
        <p className="mt-6 text-sm text-brand-muted text-center">
          Θυμήθηκες τον κωδικό;{" "}
          <Link href="/login" className="text-brand-mid hover:underline font-semibold">Σύνδεση</Link>
        </p>
      </div>
    </>
  );
}
