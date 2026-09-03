"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { login } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          setError(null);
          const res = await login(fd);
          if (!res.ok) setError(res.error);
          else router.push("/dashboard");
        })
      }
    >
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="π.χ. onoma@example.gr" />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Κωδικός</Label>
          <a href="/forgot-password" className="text-[13px] text-brand-mid hover:text-brand-dark hover:underline">
            Ξέχασες τον κωδικό;
          </a>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
            aria-pressed={showPassword}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md inline-flex items-center justify-center",
              "text-brand-muted hover:text-brand-dark hover:bg-brand-bg transition-colors"
            )}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} />
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-700 inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-md w-full">
          <Icon name="triangleAlert" /> {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg" icon={pending ? "spinner" : "unlock"}>
        {pending ? "Σύνδεση…" : "Σύνδεση στον λογαριασμό μου"}
      </Button>
    </form>
  );
}
