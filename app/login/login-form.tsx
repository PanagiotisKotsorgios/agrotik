"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
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
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Κωδικός</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {error && (
        <p className="text-sm text-red-700 inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
          <Icon name="triangleAlert" /> {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg" icon={pending ? "spinner" : "unlock"}>
        {pending ? "Σύνδεση…" : "Σύνδεση"}
      </Button>
    </form>
  );
}
