"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteSavedSearch, toggleSavedSearchAlerts } from "@/lib/actions/saved-searches";

export function SavedSearchActions({ id, alertsEnabled }: { id: string; alertsEnabled: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap gap-1">
        <Button
          type="button"
          variant={alertsEnabled ? "outline" : "secondary"}
          size="sm"
          icon={alertsEnabled ? "eyeOff" : "bell"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await toggleSavedSearchAlerts(id, !alertsEnabled);
              if (!res.ok) return setError(res.error);
              router.refresh();
            })
          }
        >
          {alertsEnabled ? "Παύση" : "Ειδοποιήσεις"}
        </Button>
        <Button
          type="button"
          variant="danger"
          size="sm"
          icon="trash"
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (!confirm("Διαγραφή αποθηκευμένης αναζήτησης;")) return;
              setError(null);
              const res = await deleteSavedSearch(id);
              if (!res.ok) return setError(res.error);
              router.refresh();
            })
          }
        >
          Διαγραφή
        </Button>
      </div>
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
