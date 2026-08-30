import { Card, Eyebrow } from "@/components/ui/card";
import { getBrevoSettings } from "@/lib/brevo";
import { BrevoSettingsForm } from "./brevo-form";

export default async function AdminSettingsPage() {
  const brevo = await getBrevoSettings();

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Ρυθμίσεις πλατφόρμας</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Email & εξωτερικά</h1>
        <p className="mt-3 text-brand-muted max-w-2xl">
          Οι ρυθμίσεις αποθηκεύονται στη βάση και δεν χρειάζονται restart. Οι
          διαχειριστές μπορούν να αλλάξουν το κλειδί Brevo και τα ενεργά email
          templates χωρίς πρόσβαση στον server.
        </p>
      </div>

      <Card className="max-w-3xl">
        <div className="mb-4">
          <div className="eyebrow">Transactional emails</div>
          <h2 className="display text-xl text-brand-dark mt-1">Brevo (Sendinblue)</h2>
        </div>
        <BrevoSettingsForm initial={brevo} />
      </Card>
    </>
  );
}
