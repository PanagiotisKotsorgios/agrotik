import Link from "next/link";
import { Header } from "@/components/site/header";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/site/logo";
import { Icon } from "@/components/ui/icon";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Νέος κωδικός" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <>
      <Header />
      <div className="max-w-md mx-auto px-4 py-10 sm:py-14">
        <Card className="!p-7 sm:!p-8">
          <div className="mb-6 text-center">
            <Link href="/" aria-label="AGROTIK" className="inline-block mb-4">
              <Logo size={56} />
            </Link>
            <h1 className="display text-3xl text-brand-dark">Νέος κωδικός</h1>
            <p className="mt-2 text-brand-muted text-[14px]">
              Όρισε καινούριο κωδικό για τον λογαριασμό σου.
            </p>
          </div>
          {token ? (
            <ResetForm token={token} />
          ) : (
            <div className="text-center py-4">
              <Icon name="triangleAlert" className="text-red-700 text-2xl mb-2" />
              <p className="text-brand-ink">Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.</p>
              <Link href="/forgot-password" className="mt-4 inline-block text-brand-mid hover:underline font-semibold">
                Ζήτησε καινούριο σύνδεσμο
              </Link>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
