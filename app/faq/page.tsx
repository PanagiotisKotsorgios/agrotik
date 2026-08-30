import Link from "next/link";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export const metadata = { title: "Συχνές ερωτήσεις" };

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "Πληρώνω κάτι για να χρησιμοποιήσω το AGROTIK;",
    a: <>Όχι. Η εγγραφή και η χρήση είναι εντελώς <strong>δωρεάν</strong>. Καμία προμήθεια σε συναλλαγές.</>,
  },
  {
    q: "Παίρνει το AGROTIK προμήθεια πάνω στη συμφωνία;",
    a: <>Όχι. Η συμφωνία γίνεται απευθείας μεταξύ αγρότη και αγοραστή. Δεν παρεμβαίνουμε.</>,
  },
  {
    q: "Πώς δηλώνω παραγωγή αν είμαι αγρότης;",
    a: (
      <>Μπες στον λογαριασμό σου → <strong>Παραγωγή</strong> → <strong>Νέα καταχώρηση</strong>. Επίλεξε προϊόν, ποσότητα, ποιότητα και ημερομηνία διαθεσιμότητας.</>
    ),
  },
  {
    q: "Πώς λαμβάνω ειδοποίηση όταν αλλάζει τιμή;",
    a: (
      <>Πάτα το κουμπί «Παρακολούθηση» στο προφίλ του αγοραστή. Κάθε φορά που ενημερώνει τιμή, θα δεις ειδοποίηση στην καμπάνα (και email αν το έχει ενεργοποιήσει ο διαχειριστής).</>
    ),
  },
  {
    q: "Είμαι έμπορος. Πώς φαίνομαι στην αναζήτηση;",
    a: (
      <>Μόλις καταχωρήσεις τιμοκατάλογο με έστω μία τιμή, εμφανίζεσαι αυτόματα στην αναζήτηση «Βρες Αγοραστή» των αγροτών.</>
    ),
  },
  {
    q: "Μπορώ να είμαι ανώνυμος αγρότης;",
    a: (
      <>Ναι. Στο προφίλ σου μπορείς να απενεργοποιήσεις την επιλογή «Εμφάνιση στην αναζήτηση» για να μη σε βρίσκουν οι έμποροι.</>
    ),
  },
  {
    q: "Πόσο ασφαλή είναι τα δεδομένα μου;",
    a: (
      <>Χρησιμοποιούμε Supabase Auth για κρυπτογραφημένα passwords και HTTPS end-to-end. Δείτε την <Link href="/legal/privacy" className="text-brand-mid hover:underline">Πολιτική απορρήτου</Link>.</>
    ),
  },
  {
    q: "Πώς επικοινωνώ με άλλον χρήστη;",
    a: (
      <>Από το προφίλ του: κουμπί «Στείλε μήνυμα» για in-app chat, ή απευθείας κλήση στο τηλέφωνο που έχει δηλώσει.</>
    ),
  },
  {
    q: "Ποια προϊόντα υποστηρίζονται;",
    a: (
      <>Ξεκινήσαμε με ελιές, ελαιόλαδο, σιτηρά, εσπεριδοειδή, ροδάκινα, ντομάτα βιομηχανική, βαμβάκι. Νέα προϊόντα μπορούν να προταθούν από κάθε χρήστη — εγκρίνονται από τους διαχειριστές πριν φανούν στη δημόσια λίστα.</>
    ),
  },
  {
    q: "Πώς αναφέρω παραπλανητική καταχώρηση;",
    a: (
      <>Στο προφίλ ή στην καταχώρηση, θα βρεις link «Αναφορά». Οι διαχειριστές εξετάζουν κάθε αναφορά.</>
    ),
  },
];

export default function FaqPage() {
  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-12">
        <Eyebrow>Βοήθεια</Eyebrow>
        <h1 className="display text-4xl sm:text-5xl text-brand-dark mt-2 field-underline">
          Συχνές ερωτήσεις
        </h1>
        <p className="mt-4 text-lg text-brand-muted">
          Δεν βρήκες αυτό που ψάχνεις;{" "}
          <Link href="/contact" className="text-brand-mid hover:underline">Επικοινώνησε μαζί μας</Link>.
        </p>

        <div className="mt-8 space-y-3">
          {faqs.map((f, i) => (
            <details key={i} className="group bg-brand-surface border border-brand-border rounded-card overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none hover:bg-brand-bg">
                <span className="font-semibold text-brand-dark text-[16px]">{f.q}</span>
                <Icon name="plus" className="text-brand-muted transition-transform group-open:rotate-45" />
              </summary>
              <div className="px-5 pb-5 text-brand-ink/85 leading-relaxed">{f.a}</div>
            </details>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
