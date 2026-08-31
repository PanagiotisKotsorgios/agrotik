"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DatabaseBackupButton() {
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  async function startBackup() {
    const confirmation = window.prompt(
      "Το πλήρες backup περιέχει προσωπικά δεδομένα, ρυθμίσεις και στοιχεία λογαριασμών. Πληκτρολόγησε BACKUP για λήψη.",
    );
    if (confirmation !== "BACKUP") return;

    setChecking(true);
    setFeedback(null);
    try {
      const check = await fetch("/api/admin/backup?check=1", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const result = (await check.json()) as { ok?: boolean; error?: string };
      if (!check.ok || !result.ok) {
        setFeedback({ ok: false, text: result.error || "Το backup δεν είναι διαθέσιμο." });
        return;
      }

      const link = document.createElement("a");
      link.href = `/api/admin/backup?download=${Date.now()}`;
      link.download = "agrotik-full-backup.dump";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setFeedback({
        ok: true,
        text: "Η δημιουργία ξεκίνησε. Μείνε στη σελίδα μέχρι να ολοκληρωθεί η λήψη.",
      });
    } catch {
      setFeedback({ ok: false, text: "Αδυναμία έναρξης του backup. Δοκίμασε ξανά." });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <Button type="button" icon={checking ? "spinner" : "download"} disabled={checking} onClick={startBackup}>
        {checking ? "Έλεγχος…" : "Λήψη πλήρους database backup"}
      </Button>
      {feedback && (
        <p className={`mt-3 text-sm font-semibold ${feedback.ok ? "text-emerald-800" : "text-red-700"}`} role="status">
          {feedback.text}
        </p>
      )}
    </div>
  );
}
