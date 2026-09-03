import Link from "next/link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Κόστος" };

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Eyebrow>Χωρίς συνδρομή</Eyebrow>
        <h1 className="display text-5xl sm:text-6xl text-brand-dark mt-2">
          Δωρεάν. Για <em className="not-italic text-brand-earth">όλους</em>.
        </h1>
        <p className="mt-5 text-lg text-brand-muted max-w-2xl mx-auto leading-relaxed">
          Χωρίς προμήθεια, χωρίς κρυφές χρεώσεις, χωρίς όρια σε καταχωρήσεις.
          Το AGROTIK χρηματοδοτείται από κοινοτικές πηγές και εθελοντική
          εργασία — και θα παραμείνει δωρεάν για τους αγρότες, αλιείς, εμπόρους και
          εργοστάσια.
        </p>

        <Card className="mt-10 text-left max-w-lg mx-auto border-2 border-brand-dark">
          <div className="flex items-baseline gap-2">
            <span className="figures display text-6xl text-brand-dark">0€</span>
            <span className="text-brand-muted">/ πάντα</span>
          </div>
          <ul className="mt-6 space-y-3 text-brand-ink">
            {[
              "Απεριόριστες καταχωρήσεις",
              "Πρόσβαση σε όλες τις αναζητήσεις",
              "In-app μηνύματα και ειδοποιήσεις",
              "Αγαπημένα και παρακολούθηση τιμών",
              "Πλήρες δημόσιο προφίλ με φωτογραφίες",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Icon name="check" className="text-brand-mid" /> {f}
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="mt-8 inline-flex items-center gap-2 w-full justify-center px-5 py-3 rounded-md bg-brand-dark text-white font-semibold hover:bg-brand-mid"
          >
            Εγγραφή τώρα <Icon name="arrowRight" />
          </Link>
        </Card>

        <p className="mt-10 text-sm text-brand-muted">
          Έχεις ερωτήσεις;{" "}
          <Link href="/contact" className="text-brand-mid hover:underline">Επικοινώνησε μαζί μας</Link>.
        </p>
      </main>
      <Footer />
    </>
  );
}
