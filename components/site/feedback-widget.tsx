"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label, Select, Textarea } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { submitFeedback } from "@/lib/actions/feedback";

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => { setSent(false); setError(null); setOpen(true); }}
        className="fixed bottom-4 right-4 z-40 h-12 w-12 rounded-full bg-brand-dark text-white shadow-elev flex items-center justify-center hover:bg-brand-mid focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-mid"
        aria-label="Στείλε feedback"
      >
        <Icon name="chat" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Στείλε feedback"
          onClick={() => setOpen(false)}
        >
          <form
            ref={dialogRef}
            className="w-full max-w-md bg-white rounded-2xl border border-brand-border p-5"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              start(async () => {
                setError(null);
                const res = await submitFeedback({
                  kind: String(fd.get("kind") ?? "other"),
                  message: String(fd.get("message") ?? ""),
                  page_path: pathname,
                });
                if (!res.ok) return setError(res.error);
                setSent(true);
                (event.target as HTMLFormElement).reset();
              });
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="display text-lg text-brand-dark">Το feedback σου βοηθάει</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Κλείσιμο" className="text-brand-muted hover:text-brand-dark p-1">
                <Icon name="close" />
              </button>
            </div>
            {sent ? (
              <p className="mt-4 text-sm text-emerald-800 inline-flex items-center gap-2">
                <Icon name="ok" /> Ευχαριστούμε! Το μήνυμά σου καταχωρήθηκε.
              </p>
            ) : (
              <>
                <div className="mt-3">
                  <Label htmlFor="fb-kind">Τύπος</Label>
                  <Select id="fb-kind" name="kind" defaultValue="idea">
                    <option value="bug">Πρόβλημα / σφάλμα</option>
                    <option value="idea">Ιδέα / πρόταση</option>
                    <option value="praise">Καλός λόγος</option>
                    <option value="other">Άλλο</option>
                  </Select>
                </div>
                <div className="mt-3">
                  <Label htmlFor="fb-msg">Μήνυμα</Label>
                  <Textarea id="fb-msg" name="message" rows={5} maxLength={4000} required placeholder="Πες μας τι σκέφτεσαι..." />
                </div>
                {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Άκυρο</Button>
                  <Button type="submit" icon={pending ? "spinner" : "send"} disabled={pending}>Αποστολή</Button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
