"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { updateReport } from "@/lib/actions/reports";
import { useRouter } from "next/navigation";

export function ReportRowActions({
  id,
  currentStatus,
}: {
  id: string;
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const run = (patch: Parameters<typeof updateReport>[1]) => start(async () => {
    setError(null);
    const result = await updateReport(id, patch);
    if (!result.ok) return setError(result.error);
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {currentStatus === "open" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => run({ status: "reviewing" })}
        >
          Σε εξέταση
        </Button>
      )}
      <Button
        size="sm"
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "Ακύρωση" : "Απάντηση"}
      </Button>
      {open && (
        <div className="w-64 space-y-2">
          <Textarea rows={2} placeholder="Σημείωση διαχειριστή…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="primary"
              disabled={pending}
              onClick={() => run({ status: "resolved", admin_note: note })}
            >
              Επιλύθηκε
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => run({ status: "dismissed", admin_note: note })}
            >
              Απόρριψη
            </Button>
          </div>
        </div>
      )}
      {error && <p className="max-w-64 text-xs text-red-700" role="alert">{error}</p>}
    </div>
  );
}
