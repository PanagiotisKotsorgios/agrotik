import { Card, Eyebrow } from "@/components/ui/card";
import { ExportButtons } from "./buttons";

export default function AdminExports() {
  return (
    <>
      <div className="mb-6">
        <Eyebrow>Δεδομένα</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Εξαγωγές CSV</h1>
        <p className="mt-3 text-brand-muted">
          Κατέβασε στοιχεία χρηστών ή καταχωρήσεων για ανάλυση. Αρχεία σε UTF-8, comma-separated.
        </p>
      </div>
      <Card className="max-w-xl">
        <ExportButtons />
      </Card>
    </>
  );
}
