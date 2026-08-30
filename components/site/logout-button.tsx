"use client";
import { useTransition } from "react";
import { logout } from "@/lib/actions/auth";
import { Icon } from "@/components/ui/icon";

export function LogoutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() => start(() => logout())}
      disabled={pending}
      className="w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-brand-muted hover:bg-red-50 hover:text-red-700"
    >
      <Icon name="logout" className="w-4 text-center" />
      {pending ? "Αποσύνδεση…" : "Αποσύνδεση"}
    </button>
  );
}
