import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "Επικοινωνία",
};

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Eyebrow>Είμαστε εδώ</Eyebrow>
          <h1 className="display text-4xl text-brand-dark mt-1 field-underline">Επικοινωνία</h1>
          <p className="mt-3 text-brand-muted text-lg max-w-2xl">
            Ερωτήσεις για την πλατφόρμα, τεχνική υποστήριξη, συνεργασία ή τύπος.
            Απαντάμε συνήθως εντός μίας εργάσιμης ημέρας.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
          {/* Contact info */}
          <div className="space-y-4">
            <Card>
              <div className="eyebrow mb-2">Τηλέφωνο</div>
              <a
                href="tel:2631028971"
                className="figures text-2xl text-brand-dark hover:text-brand-mid inline-flex items-center gap-2"
              >
                <Icon name="phone" /> 2631028971
              </a>
              <p className="mt-2 text-sm text-brand-muted">Δευτέρα – Παρασκευή · 09:00 – 17:00</p>
            </Card>
            <Card>
              <div className="eyebrow mb-2">Email</div>
              <a
                href="mailto:info@agrotik.gr"
                className="text-xl text-brand-dark hover:text-brand-mid inline-flex items-center gap-2 break-all"
              >
                <Icon name="envelope" /> info@agrotik.gr
              </a>
              <p className="mt-2 text-sm text-brand-muted">Απάντηση συνήθως εντός 24 ωρών</p>
            </Card>
            <Card>
              <div className="eyebrow mb-2">Support</div>
              <p className="text-brand-ink">
                Για τεχνικά θέματα με τον λογαριασμό σου, μπορείς να στείλεις μήνυμα και μέσω του πίνακα διαχείρισης →{" "}
                <a href="/dashboard/messages" className="text-brand-mid hover:underline">Μηνύματα</a>.
              </p>
            </Card>
          </div>

          {/* Form */}
          <Card>
            <h2 className="display text-xl text-brand-dark mb-4">Στείλε μας μήνυμα</h2>
            <ContactForm />
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
