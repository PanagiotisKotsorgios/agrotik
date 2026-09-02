"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { deleteOwnAccount } from "@/lib/actions/account-security";

export function DeleteAccountForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Card className="border-red-200">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="display text-xl text-red-900">Διαγραφή λογαριασμού</h2>
          <p className="mt-1 max-w-2xl text-sm text-brand-muted">
            Το δημόσιο προφίλ και οι καταχωρήσεις σου θα απενεργοποιηθούν και τα προσωπικά στοιχεία θα αφαιρεθούν. Η ενέργεια δεν αναιρείται.
          </p>
        </div>
        {!open && <Button type="button" variant="danger" size="sm" onClick={() => setOpen(true)}>Διαγραφή</Button>}
      </div>

      {open && (
        <form
          className="mt-5 max-w-md space-y-3 border-t border-red-100 pt-5"
          action={(formData) => start(async () => {
            setError(null);
            const result = await deleteOwnAccount(formData);
            if (!result.ok) return setError(result.error);
            router.replace("/");
            router.refresh();
          })}
        >
          <div>
            <Label htmlFor="delete-password">Τρέχων κωδικός</Label>
            <Input id="delete-password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <div>
            <Label htmlFor="delete-confirmation">Πληκτρολόγησε ΔΙΑΓΡΑΦΗ</Label>
            <Input id="delete-confirmation" name="confirmation" required autoComplete="off" />
          </div>
          {error && <p className="text-sm text-red-700" role="alert"><Icon name="triangleAlert" /> {error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="danger" disabled={pending} icon={pending ? "spinner" : "trash"}>
              {pending ? "Διαγραφή…" : "Οριστική διαγραφή"}
            </Button>
            <Button type="button" variant="ghost" disabled={pending} onClick={() => { setOpen(false); setError(null); }}>Ακύρωση</Button>
          </div>
        </form>
      )}
    </Card>
  );
}
