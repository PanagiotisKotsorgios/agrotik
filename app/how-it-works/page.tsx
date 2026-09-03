import Link from "next/link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Eyebrow, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";

export const metadata = { title: "Πώς λειτουργεί" };

export default function HowItWorksPage() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <Eyebrow>Οδηγός</Eyebrow>
        <h1 className="display text-4xl sm:text-5xl text-brand-dark mt-2 field-underline">
          Πώς λειτουργεί το AGROTIK
        </h1>
        <p className="mt-4 text-lg text-brand-muted max-w-2xl leading-relaxed">
          Τρία βήματα σε λιγότερο από 5 λεπτά — από την εγγραφή μέχρι την πρώτη
          συμφωνία. Δωρεάν, χωρίς προμήθεια, χωρίς μεσάζοντες.
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-3 list-none">
          <StepCard n={1} icon="user" title="Δημιούργησε προφίλ" body="Επίλεξε ρόλο (αγρότης, αλιέας, αγρότης & αλιέας, έμπορος ή εργοστάσιο), συμπλήρωσε βασικά στοιχεία και ξεκίνα." />
          <StepCard n={2} icon="tag" title="Καταχώρησε δεδομένα" body="Αγρότες και αλιείς: διαθέσιμα προϊόντα. Έμποροι και εργοστάσια: τιμοκατάλογο ανά προϊόν, είδος και ποιότητα." />
          <StepCard n={3} icon="chat" title="Επικοινώνησε άμεσα" body="Δες προφίλ, στείλε μήνυμα, πάρε τηλέφωνο. Η συμφωνία κλείνει μεταξύ σας — χωρίς προμήθεια από εμάς." />
        </ol>

        <section className="mt-16">
          <h2 className="display text-2xl text-brand-dark mb-6">Για κάθε ρόλο</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <RoleDetails
              icon="seedling"
              title="Αγρότες"
              points={[
                "Καταχωρείς προϊόν, ποσότητα, ποιότητα και ημερομηνία διαθεσιμότητας.",
                "Παρακολουθείς αγοραστές — παίρνεις ειδοποίηση όταν αλλάξει τιμή.",
                "Επικοινωνείς με ένα κλικ, χωρίς προμήθεια.",
              ]}
            />
            <RoleDetails
              icon="fish"
              title="Αλιείς"
              points={[
                "Καταχωρείς ελεύθερα είδος αλιεύματος, ποσότητα, κατάσταση και προέλευση.",
                "Συγκρίνεις τις καταχωρισμένες τιμές εμπόρων και εργοστασίων.",
                "Επικοινωνείς και πουλάς απευθείας, χωρίς προμήθεια πλατφόρμας.",
              ]}
            />
            <RoleDetails
              icon="store"
              title="Έμποροι"
              points={[
                "Ανεβάζεις τιμοκατάλογο με τιμές ανά ποιότητα/νούμερο.",
                "Ενημερώνεις τιμές κάθε μέρα — αγρότες και αλιείς βλέπουν πραγματικά δεδομένα.",
                "Ψάχνεις παραγωγή και αλιεύματα ανά περιοχή, είδος, ποσότητα και ημερομηνία.",
              ]}
            />
            <RoleDetails
              icon="industry"
              title="Εργοστάσια"
              points={[
                "Δείχνεις τι αγοράζεις χωρίς μεσάζοντες.",
                "Δηλώνεις περιοχές παραλαβής και τεχνικές προδιαγραφές (οξύτητα, νούμερα, κ.λπ.).",
                "Χτίζεις μακροπρόθεσμες σχέσεις με παραγωγούς και αλιείς.",
              ]}
            />
          </div>
        </section>

        <section className="mt-16 p-8 rounded-card bg-brand-dark text-white">
          <div className="max-w-2xl">
            <h2 className="display text-3xl">Έτοιμος να ξεκινήσεις;</h2>
            <p className="mt-2 text-white/80">Δωρεάν εγγραφή σε 60 δευτερόλεπτα.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-brand-mid text-white font-semibold hover:bg-brand-light hover:text-brand-dark"
              >
                Ξεκίνα τώρα <Icon name="arrowRight" />
              </Link>
              <Link
                href="/faq"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-md border border-white/25 text-white font-semibold hover:bg-white/10"
              >
                Δες τις συχνές ερωτήσεις
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function StepCard({ n, icon, title, body }: { n: number; icon: IconName; title: string; body: string }) {
  return (
    <li>
      <Card className="relative h-full">
        <div className="flex items-start justify-between">
          <div className="w-11 h-11 rounded-md bg-brand-dark text-white flex items-center justify-center">
            <Icon name={icon} className="text-lg" />
          </div>
          <span className="display text-4xl text-brand-earth/40 leading-none">{n}</span>
        </div>
        <CardTitle className="mt-5 text-xl">{title}</CardTitle>
        <p className="mt-2 text-brand-muted leading-relaxed">{body}</p>
      </Card>
    </li>
  );
}

function RoleDetails({ icon, title, points }: { icon: IconName; title: string; points: string[] }) {
  return (
    <Card>
      <div className="flex items-center gap-2 text-brand-dark">
        <Icon name={icon} className="text-lg" />
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <ul className="mt-3 space-y-2 text-brand-ink/85 text-[15px]">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <Icon name="check" className="text-brand-mid mt-1 shrink-0" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
