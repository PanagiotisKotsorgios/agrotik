"use client";
import { useState, useTransition } from "react";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { requestPasswordReset } from "@/lib/actions/password-reset";

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="text-center py-6">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center justify-center mb-4">
          <Icon name="ok" className="text-xl" />
        </div>
        <h2 className="display text-xl text-brand-dark">Έλεγξε το email σου</h2>
        <p className="mt-2 text-brand-muted text-[14px]">
          Αν υπάρχει λογαριασμός με αυτό το email, θα λάβεις σύνδεσμο για επαναφορά κωδικού μέσα σε λίγα λεπτά.
        </p>
        <p className="mt-3 text-[13px] text-brand-muted">
          Δεν το βρίσκεις; Δες τον φάκελο ανεπιθύμητης αλληλογραφίας.
        </p>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await requestPasswordReset(fd);
          if (!res.ok) setError(res.error);
          else setSent(true);
        })
      }
    >
      <div>
        <Label htmlFor="fp-email">Email</Label>
        <Input id="fp-email" name="email" type="email" required autoComplete="email" placeholder="π.χ. onoma@example.gr" />
      </div>
      {error && (
        <p className="text-sm text-red-700 inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-md w-full">
          <Icon name="triangleAlert" /> {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg" icon={pending ? "spinner" : "send"}>
        {pending ? "Αποστολή…" : "Στείλε μου σύνδεσμο επαναφοράς"}
      </Button>
    </form>
  );
}
