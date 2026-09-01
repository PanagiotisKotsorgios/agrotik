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

const roleCardStyles: Record<
  Role,
  { idle: string; active: string; idleIcon: string; activeIcon: string; idleDescription: string }
> = {
  farmer: {
    idle: "border-green-800/70 bg-green-50/70 text-green-950 hover:border-green-950 hover:bg-green-50",
    active: "border-green-950 bg-green-900 text-white shadow-md shadow-green-950/15",
    idleIcon: "bg-green-100 text-green-900 ring-1 ring-inset ring-green-800/20",
    activeIcon: "bg-white/15 text-white ring-1 ring-inset ring-white/20",
    idleDescription: "text-green-800",
  },
  fisher: {
    idle: "border-sky-800/70 bg-sky-50/80 text-sky-950 hover:border-sky-950 hover:bg-sky-100/70",
    active: "border-sky-950 bg-sky-900 text-white shadow-md shadow-sky-950/15",
    idleIcon: "bg-sky-100 text-sky-900 ring-1 ring-inset ring-sky-800/20",
    activeIcon: "bg-white/15 text-white ring-1 ring-inset ring-white/20",
    idleDescription: "text-sky-800",
  },
  farmer_fisher: {
    idle: "border-teal-800/70 bg-gradient-to-r from-green-50/90 to-sky-50/90 text-teal-950 hover:border-teal-950",
    active: "border-teal-950 bg-gradient-to-r from-green-900 to-sky-900 text-white shadow-md shadow-teal-950/15",
    idleIcon: "bg-teal-100 text-teal-900 ring-1 ring-inset ring-teal-800/20",
    activeIcon: "bg-white/15 text-white ring-1 ring-inset ring-white/20",
    idleDescription: "text-teal-800",
  },
  merchant: {
    idle: "border-brand-dark/70 bg-green-50/50 text-brand-dark hover:border-brand-dark hover:bg-green-50",
    active: "border-brand-dark bg-brand-dark text-white shadow-md shadow-brand-dark/15",
    idleIcon: "bg-green-100 text-brand-dark ring-1 ring-inset ring-brand-dark/20",
    activeIcon: "bg-white/15 text-white ring-1 ring-inset ring-white/20",
    idleDescription: "text-green-800",
  },
  factory: {
    idle: "border-brand-dark/70 bg-green-50/50 text-brand-dark hover:border-brand-dark hover:bg-green-50",
    active: "border-brand-dark bg-brand-dark text-white shadow-md shadow-brand-dark/15",
    idleIcon: "bg-green-100 text-brand-dark ring-1 ring-inset ring-brand-dark/20",
    activeIcon: "bg-white/15 text-white ring-1 ring-inset ring-white/20",
    idleDescription: "text-green-800",
  },
};

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
          {roleCards.map((r) => {
            const selected = role === r.value;
            const styles = roleCardStyles[r.value];

            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                aria-pressed={selected}
                className={cn(
                  "w-full min-w-0 min-h-[76px] sm:min-h-[150px] p-3.5 sm:p-4 rounded-lg border-2 text-left transition-all duration-200",
                  r.value === "farmer_fisher" && "sm:col-span-2 sm:min-h-[112px]",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mid focus-visible:ring-offset-2",
                  selected ? styles.active : styles.idle,
                )}
              >
                <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                  <span
                    className={cn(
                      "w-10 h-10 shrink-0 rounded-lg inline-flex items-center justify-center transition-colors",
                      selected ? styles.activeIcon : styles.idleIcon,
                    )}
                  >
                    <Icon name={r.icon} className="text-lg" />
                  </span>
                  <span className="min-w-0 block">
                    <span
                      className={cn(
                        "block text-[16px] leading-tight font-bold break-words",
                        selected ? "text-white" : "text-current",
                      )}
                    >
                      {r.label}
                    </span>
                    <span
                      className={cn(
                        "block text-[13px] leading-snug mt-1 font-medium break-words",
                        selected ? "text-white/85" : styles.idleDescription,
                      )}
                    >
                      {r.desc}
                    </span>
                  </span>
                </div>
              </button>
            );
          })}
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
