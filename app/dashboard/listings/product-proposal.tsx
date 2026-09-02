"use client";

import { useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { proposeProduct } from "@/lib/actions/products";

export function ProductProposal() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setFeedback(null);
          setOpen(true);
        }}
        className="text-sm font-semibold text-brand-mid hover:text-brand-dark hover:underline underline-offset-2"
      >
        Δεν βρίσκεις το προϊόν; Πρότεινέ το
      </button>
    );
  }

  return (
    <Card className="border-dashed">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-brand-dark">Πρόταση νέου προϊόντος</h2>
          <p className="mt-1 text-sm text-brand-muted">Θα εμφανιστεί στον κατάλογο μετά από έλεγχο διαχειριστή.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Κλείσιμο πρότασης" className="w-11 h-11 inline-flex items-center justify-center rounded-md text-brand-muted hover:bg-brand-bg">
          <Icon name="close" />
        </button>
      </div>
      <form
        ref={formRef}
        className="mt-4 grid sm:grid-cols-3 gap-3"
        action={(formData) => start(async () => {
          setFeedback(null);
          const result = await proposeProduct(formData);
          if (!result.ok) return setFeedback({ ok: false, text: result.error });
          formRef.current?.reset();
          setFeedback({ ok: true, text: "Η πρόταση στάλθηκε για έγκριση." });
        })}
      >
        <div>
          <Label htmlFor="proposal-name">Όνομα προϊόντος</Label>
          <Input id="proposal-name" name="name_el" required maxLength={100} />
        </div>
        <div>
          <Label htmlFor="proposal-category">Κατηγορία</Label>
          <Input id="proposal-category" name="category" required maxLength={80} placeholder="π.χ. Φρούτα" />
        </div>
        <div>
          <Label htmlFor="proposal-unit">Μονάδα μέτρησης</Label>
          <Input id="proposal-unit" name="unit" required maxLength={30} placeholder="κιλό / λίτρο / τόνος" />
        </div>
        {feedback && (
          <p className={`sm:col-span-3 text-sm ${feedback.ok ? "text-emerald-800" : "text-red-700"}`} role={feedback.ok ? "status" : "alert"}>
            {feedback.text}
          </p>
        )}
        <div className="sm:col-span-3 flex gap-2">
          <Button type="submit" size="sm" icon={pending ? "spinner" : "send"} disabled={pending}>
            {pending ? "Αποστολή…" : "Αποστολή πρότασης"}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>Ακύρωση</Button>
        </div>
      </form>
    </Card>
  );
}
