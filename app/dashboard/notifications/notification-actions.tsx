"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { clearNotifications, deleteNotification } from "@/lib/actions/notifications";

export function NotificationActions({ id }: { id?: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (id) {
    return (
      <button
        type="button"
        disabled={pending}
        className="shrink-0 rounded-md p-2 text-brand-muted hover:bg-brand-border/40 hover:text-red-700 disabled:opacity-50"
        aria-label="Διαγραφή ειδοποίησης"
        title="Διαγραφή ειδοποίησης"
        onClick={() => start(async () => {
          const result = await deleteNotification(id);
          if (!result.ok) return setError(result.error);
          router.refresh();
        })}
      >
        <Icon name={pending ? "spinner" : "trash"} className={pending ? "animate-spin" : undefined} />
        {error && <span className="sr-only">{error}</span>}
      </button>
    );
  }

  return (
    <div className="text-right">
      <Button
        type="button"
        variant="outline"
        size="sm"
        icon={pending ? "spinner" : "trash"}
        disabled={pending}
        onClick={() => {
          if (!confirm("Διαγραφή όλων των ειδοποιήσεων;")) return;
          start(async () => {
            const result = await clearNotifications();
            if (!result.ok) return setError(result.error);
            router.refresh();
          });
        }}
      >
        Καθαρισμός όλων
      </Button>
      {error && <p className="mt-1 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
