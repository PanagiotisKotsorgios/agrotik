import { Card, Eyebrow } from "@/components/ui/card";
import { ExportButtons } from "./buttons";
import { DatabaseBackupButton } from "./database-backup-button";

export default function AdminExports() {
  return (
    <>
      <div className="mb-6">
        <Eyebrow>Δεδομένα</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Εξαγωγές & αντίγραφα ασφαλείας</h1>
        <p className="mt-3 text-brand-muted">
          Κατέβασε επιμέρους CSV ή ένα πλήρες αντίγραφο της βάσης δεδομένων.
        </p>
      </div>
      <div className="space-y-5 max-w-2xl">
        <Card>
          <h2 className="font-semibold text-brand-dark text-lg">Εξαγωγές CSV</h2>
          <p className="mt-1 mb-4 text-sm text-brand-muted">Αρχεία UTF-8 για ανάλυση χρηστών και καταχωρήσεων.</p>
          <ExportButtons />
        </Card>
        <Card>
          <h2 className="font-semibold text-brand-dark text-lg">Πλήρες database backup</h2>
          <p className="mt-1 mb-2 text-sm text-brand-muted">
            Δημιουργεί read-only PostgreSQL custom-format dump με όλα τα schemas και όλα τα δεδομένα της βάσης.
          </p>
          <p className="mb-4 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Περιέχει ευαίσθητα προσωπικά δεδομένα και στοιχεία authentication. Φύλαξέ το κρυπτογραφημένο και μην το κοινοποιήσεις.
          </p>
          <DatabaseBackupButton />
        </Card>
      </div>
    </>
  );
}
