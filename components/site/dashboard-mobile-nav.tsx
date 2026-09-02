"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";
import { LogoutButton } from "./logout-button";
import { useDialogFocus } from "./use-dialog-focus";

interface Item {
  href: string;
  icon: IconName;
  label: string;
}

export function DashboardMobileNav({
  title,
  items,
}: {
  title: string;
  items: Item[];
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const path = usePathname();
  const { dialogRef, triggerRef } = useDialogFocus(open, setOpen);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const matches = items
    .map((it) => ({ it, len: path?.startsWith(it.href) ? it.href.length : -1 }))
    .filter((m) => m.len > 0)
    .sort((a, b) => b.len - a.len);
  const activeHref = matches[0]?.it.href ?? items[0].href;
  const current = items.find((it) => it.href === activeHref) ?? items[0];

  const drawer = open ? (
    <div
      ref={dialogRef}
      tabIndex={-1}
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
      className="md:hidden flex flex-col bg-brand-dark text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex items-center justify-between h-[68px] px-4 border-b border-white/10 shrink-0">
        <div className="font-bold text-lg inline-flex items-center gap-2">
          <Icon name="user" /> {title}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Κλείσιμο"
          data-dialog-autofocus
          className="w-11 h-11 rounded-md hover:bg-white/10 inline-flex items-center justify-center"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3">
        {items.map((it) => {
          const active = it.href === activeHref;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={
                "flex items-center gap-3 px-4 py-3.5 rounded-lg text-[16px] font-semibold transition-colors " +
                (active
                  ? "bg-white text-brand-dark shadow-sm"
                  : "text-white/90 hover:bg-white/10")
              }
            >
              <Icon name={it.icon} className={active ? "text-brand-earth" : "text-white/60"} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <LogoutButton />
      </div>
    </div>
  ) : null;

  return (
    <div className="md:hidden bg-brand-dark text-white sticky top-[88px] z-20">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-3 min-w-0">
          <Icon name="menu" className="text-xl shrink-0" />
          <span className="font-semibold truncate">
            {title} <span className="text-white/60 font-normal">· {current.label}</span>
          </span>
        </span>
        <Icon name="arrowRight" className="text-white/70" />
      </button>
      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </div>
  );
}
