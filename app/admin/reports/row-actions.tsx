"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { updateReport } from "@/lib/actions/reports";

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

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {currentStatus === "open" && (
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() => start(() => updateReport(id, { status: "reviewing" }).then(() => location.reload()))}
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
              onClick={() => start(() => updateReport(id, { status: "resolved", admin_note: note }).then(() => location.reload()))}
            >
              Επιλύθηκε
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={pending}
              onClick={() => start(() => updateReport(id, { status: "dismissed", admin_note: note }).then(() => location.reload()))}
            >
              Απόρριψη
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
