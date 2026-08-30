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
      className="w-full inline-flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg text-[15px] font-semibold bg-[#7A1A1A] text-white hover:bg-[#902828] transition-colors disabled:opacity-60"
    >
      <Icon name="logout" />
      {pending ? "Αποσύνδεση…" : "Αποσύνδεση"}
    </button>
  );
}
