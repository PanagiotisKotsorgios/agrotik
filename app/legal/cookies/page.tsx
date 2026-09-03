import { ProsePage } from "@/components/site/prose-page";

export const metadata = { title: "Πολιτική Cookies" };

export default function CookiesPage() {
  return (
    <ProsePage eyebrow="Νομικά" title="Πολιτική Cookies" updatedAt="30 Αυγούστου 2026">
      <p>
        Χρησιμοποιούμε αυστηρά τα απολύτως απαραίτητα cookies για τη λειτουργία
        της πλατφόρμας. Δεν χρησιμοποιούμε cookies παρακολούθησης, διαφημιστικά
        δίκτυα ή third-party analytics.
      </p>

      <h2>Τι cookies υπάρχουν</h2>
      <ul>
        <li>
          <strong>Session cookies (Supabase Auth)</strong> — κρατούν τη σύνδεσή
          σου ενεργή. Λήγουν όταν κάνεις αποσύνδεση ή όταν σβήσεις το browser
          σου.
        </li>
        <li>
          <strong>Προτιμήσεις UI</strong> (τοπικά στον browser) — π.χ. τελευταία
          κριτήρια αναζήτησης. Δεν αποστέλλονται στον server.
        </li>
      </ul>

      <h2>Έλεγχος</h2>
      <p>
        Μπορείς να διαγράψεις τα cookies μέσα από τις ρυθμίσεις του browser σου.
        Η αποσύνδεση θα σε αποσυνδέσει από όλες τις συνεδρίες.
      </p>
    </ProsePage>
  );
}
