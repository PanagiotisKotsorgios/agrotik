import Link from "next/link";
import { Header } from "@/components/site/header";
import { Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <>
      <Header />
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <Eyebrow>404</Eyebrow>
        <h1 className="display text-4xl text-brand-dark mt-2">Δε βρήκαμε τη σελίδα</h1>
        <p className="mt-3 text-brand-muted">Ίσως έχει μεταφερθεί ή δεν υπήρξε ποτέ.</p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-md bg-brand-dark text-white font-medium hover:bg-brand-mid"
        >
          <Icon name="arrowLeft" /> Επιστροφή στην αρχική
        </Link>
      </div>
    </>
  );
}
