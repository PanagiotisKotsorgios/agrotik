"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { signup } from "@/lib/actions/auth";
import type { Region } from "@/lib/db/types";
import { cn } from "@/lib/utils";

type Role = "farmer" | "fisher" | "farmer_fisher" | "merchant" | "factory";

const roleCards: { value: Role; label: string; icon: IconName; desc: string }[] = [
  { value: "farmer", label: "Αγρότης", icon: "seedling", desc: "Παράγω & πουλάω" },
  { value: "fisher", label: "Αλιέας", icon: "fish", desc: "Αλιεύω & πουλάω" },
  { value: "farmer_fisher", label: "Αγρότης & Αλιέας", icon: "fish", desc: "Παράγω, αλιεύω & πουλάω" },
  { value: "merchant", label: "Έμπορος", icon: "store", desc: "Αγοράζω παραγωγή" },
  { value: "factory", label: "Εργοστάσιο", icon: "industry", desc: "Επεξεργάζομαι" },
];

export function SignupForm({ regions, initialRole }: { regions: Region[]; initialRole: Role }) {
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-5"
      action={(fd) =>
        start(async () => {
          setError(null);
          fd.set("role", role);
          const res = await signup(fd);
          if (!res.ok) setError(res.error);
          else router.push("/dashboard");
        })
      }
    >
      <div>
        <Label>Είμαι…</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {roleCards.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRole(r.value)}
              aria-pressed={role === r.value}
              className={cn(
                "w-full min-w-0 min-h-[76px] sm:min-h-[150px] p-3.5 sm:p-4 rounded-lg border text-left transition-all",
                r.value === "farmer_fisher" && "sm:col-span-2 sm:min-h-[112px]",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mid focus-visible:ring-offset-2",
                role === r.value
                  ? r.value === "fisher" || r.value === "farmer_fisher"
                    ? "border-sky-950 bg-sky-900 text-white"
                    : "border-brand-dark bg-brand-dark text-white"
                  : "border-brand-border bg-brand-surface hover:border-brand-dark/40",
              )}
            >
              <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                <span
                  className={cn(
                    "w-10 h-10 shrink-0 rounded-lg inline-flex items-center justify-center",
                    role === r.value ? "bg-white/12 text-white" : "bg-brand-bg text-brand-dark",
                  )}
                >
                  <Icon name={r.icon} className="text-lg" />
                </span>
                <span className="min-w-0 block">
                  <span
                    className={cn(
                      "block text-[16px] leading-tight font-semibold break-words",
                      role === r.value ? "text-white" : "text-brand-ink",
                    )}
                  >
                    {r.label}
                  </span>
                  <span
                    className={cn(
                      "block text-[13px] leading-snug mt-1 break-words",
                      role === r.value ? "text-white/75" : "text-brand-muted",
                    )}
                  >
                    {r.desc}
                  </span>
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>

      <div>
        <Label htmlFor="password">Κωδικός (min 6 χαρακτήρες)</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="new-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
            aria-pressed={showPassword}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md inline-flex items-center justify-center",
              "text-brand-muted hover:text-brand-dark hover:bg-brand-bg transition-colors",
            )}
          >
            <Icon name={showPassword ? "eyeOff" : "eye"} />
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="display_name">
          {role === "farmer" || role === "farmer_fisher"
            ? "Ονοματεπώνυμο / όνομα εκμετάλλευσης"
            : role === "fisher"
              ? "Ονοματεπώνυμο / όνομα αλιευτικής επιχείρησης"
              : "Επωνυμία επιχείρησης"}
        </Label>
        <Input id="display_name" name="display_name" required />
      </div>

      <div>
        <Label htmlFor="phone">Τηλέφωνο</Label>
        <Input id="phone" name="phone" type="tel" required />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="region_code">Νομός / Π.Ε.</Label>
          <Select id="region_code" name="region_code" required defaultValue="">
            <option value="" disabled>— Επίλεξε —</option>
            {regions.map((r) => (
              <option key={r.code} value={r.code}>
                {r.name_el}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="municipality">Δήμος / πόλη / χωριό</Label>
          <Input
            id="municipality"
            name="municipality"
            required
            minLength={2}
            placeholder="π.χ. Μεσολόγγι, Καλαμάτα, Χανιά"
          />
          <p className="mt-1 text-[12px] text-brand-muted">Πιο συγκεκριμένη περιοχή — βοηθά τους αγοραστές να σε βρουν.</p>
        </div>
      </div>

      {role !== "farmer" && role !== "fisher" && role !== "farmer_fisher" && (
        <div>
          <Label htmlFor="bio">Σύντομη περιγραφή δραστηριότητας</Label>
          <Textarea id="bio" name="bio" rows={3} placeholder="π.χ. Εμπορία ελιάς & ελαιολάδου, Πελοπόννησος" />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700 inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-md">
          <Icon name="triangleAlert" /> {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full" size="lg" icon={pending ? "spinner" : "check"}>
        {pending ? "Δημιουργία λογαριασμού…" : "Δωρεάν εγγραφή"}
      </Button>
    </form>
  );
}
