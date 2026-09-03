"use client";

import { useRef, useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { changePassword } from "@/lib/actions/account-security";

type PasswordFieldName = "current_password" | "new_password" | "confirm_password";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [visible, setVisible] = useState<Record<PasswordFieldName, boolean>>({
    current_password: false,
    new_password: false,
    confirm_password: false,
  });
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  function toggle(field: PasswordFieldName) {
    setVisible((current) => ({ ...current, [field]: !current[field] }));
  }

  return (
    <Card>
      <h2 className="display text-xl text-brand-dark mb-1">Ασφάλεια λογαριασμού</h2>
      <p className="text-sm text-brand-muted mb-5">
        Για την αλλαγή απαιτείται πρώτα επιβεβαίωση του τρέχοντος κωδικού σου.
      </p>

      <form
        ref={formRef}
        className="max-w-xl space-y-4"
        action={(formData) =>
          start(async () => {
            setFeedback(null);
            const result = await changePassword(formData);
            if (!result.ok) {
              setFeedback({ ok: false, text: result.error });
              return;
            }
            formRef.current?.reset();
            setVisible({ current_password: false, new_password: false, confirm_password: false });
            setFeedback({ ok: true, text: "Ο κωδικός άλλαξε επιτυχώς." });
          })
        }
      >
        <PasswordField
          id="current-password"
          name="current_password"
          label="Τρέχων κωδικός"
          autoComplete="current-password"
          visible={visible.current_password}
          onToggle={() => toggle("current_password")}
        />
        <PasswordField
          id="new-password"
          name="new_password"
          label="Νέος κωδικός (τουλάχιστον 6 χαρακτήρες)"
          autoComplete="new-password"
          minLength={6}
          visible={visible.new_password}
          onToggle={() => toggle("new_password")}
        />
        <PasswordField
          id="confirm-password"
          name="confirm_password"
          label="Επιβεβαίωση νέου κωδικού"
          autoComplete="new-password"
          minLength={6}
          visible={visible.confirm_password}
          onToggle={() => toggle("confirm_password")}
        />

        {feedback && (
          <p
            className={cn(
              "text-sm font-semibold rounded-md border px-3 py-2",
              feedback.ok
                ? "text-emerald-800 bg-emerald-50 border-emerald-200"
                : "text-red-700 bg-red-50 border-red-200",
            )}
            role="status"
          >
            {feedback.text}
          </p>
        )}

        <Button type="submit" icon={pending ? "spinner" : "lock"} disabled={pending}>
          {pending ? "Αλλαγή…" : "Αλλαγή κωδικού"}
        </Button>
      </form>
    </Card>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  minLength,
  visible,
  onToggle,
}: {
  id: string;
  name: PasswordFieldName;
  label: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          className="pr-12"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={visible ? `Απόκρυψη: ${label}` : `Εμφάνιση: ${label}`}
          aria-pressed={visible}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-md inline-flex items-center justify-center text-brand-muted hover:text-brand-dark hover:bg-brand-bg transition-colors"
        >
          <Icon name={visible ? "eyeOff" : "eye"} />
        </button>
      </div>
    </div>
  );
}
