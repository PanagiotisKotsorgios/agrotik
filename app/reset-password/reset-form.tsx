"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { applyPasswordReset } from "@/lib/actions/password-reset";
import { cn } from "@/lib/utils";

export function ResetForm({ token }: { token: string }) {
  const [show, setShow] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (ok) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center justify-center mb-3">
          <Icon name="ok" className="text-xl" />
        </div>
        <h2 className="display text-xl text-brand-dark">Ο κωδικός άλλαξε</h2>
        <p className="mt-2 text-brand-muted text-[14px]">Μπορείς τώρα να συνδεθείς με τον νέο κωδικό.</p>
        <Button
          className="mt-5"
          size="lg"
          icon="unlock"
          onClick={() => router.push("/login")}
        >
          Σύνδεση
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          setError(null);
          fd.set("token", token);
          const res = await applyPasswordReset(fd);
          if (!res.ok) setError(res.error);
          else setOk(true);
        })
      }
    >
      <div>
        <Label htmlFor="rp-password">Νέος κωδικός (τουλάχιστον 6 χαρακτήρες)</Label>
        <div className="relative">
          <Input
            id="rp-password"
            name="password"
            type={show ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Απόκρυψη" : "Εμφάνιση"}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md inline-flex items-center justify-center",
              "text-brand-muted hover:text-brand-dark hover:bg-brand-bg transition-colors",
            )}
          >
            <Icon name={show ? "eyeOff" : "eye"} />
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-700 inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-md w-full">
          <Icon name="triangleAlert" /> {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg" icon={pending ? "spinner" : "check"}>
        {pending ? "Αποθήκευση…" : "Αλλαγή κωδικού"}
      </Button>
    </form>
  );
}
