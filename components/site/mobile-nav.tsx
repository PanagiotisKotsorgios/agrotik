"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/icon";

interface Props {
  authed: boolean;
  isAdmin: boolean;
  isFarmer: boolean;
  displayName?: string;
}

export function MobileNav({ authed, isAdmin, isFarmer, displayName }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const path = usePathname();
  const hideMobileTrigger = path?.startsWith("/dashboard") || path?.startsWith("/admin");

  useEffect(() => setMounted(true), []);

  // Close on route change (skip first fire on mount)
  useEffect(() => {
    setOpen(false);
  }, [path]);

  // Scroll lock while open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  const drawer = open ? (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 100 }}
      className="md:hidden bg-brand-bg flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Μενού"
    >
      <div className="flex items-center justify-between h-[68px] px-4 border-b border-brand-border bg-brand-surface shrink-0">
        <div className="font-bold text-brand-dark text-lg">Μενού</div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Κλείσιμο"
          className="w-11 h-11 rounded-md text-brand-ink hover:bg-brand-border/40 inline-flex items-center justify-center"
        >
          <Icon name="close" className="text-xl" />
        </button>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
        <MobileGroup title="Αναζήτηση">
          <MobileLink href="/search/buyers" icon="store">Βρες Αγοραστή</MobileLink>
          <MobileLink href="/search/producers" icon="seedling">Βρες Παραγωγό</MobileLink>
        </MobileGroup>

        <MobileGroup title="Πληροφορίες">
          <MobileLink href="/how-it-works" icon="listCheck">Πώς λειτουργεί</MobileLink>
          <MobileLink href="/pricing" icon="tag">Κόστος</MobileLink>
          <MobileLink href="/faq" icon="info">Συχνές ερωτήσεις</MobileLink>
          <MobileLink href="/contact" icon="envelope">Επικοινωνία</MobileLink>
        </MobileGroup>

        {authed && (
          <MobileGroup title={displayName ? `Λογαριασμός · ${displayName}` : "Λογαριασμός"}>
            <MobileLink href="/dashboard" icon="chart">Αρχική</MobileLink>
            <MobileLink href="/dashboard/profile" icon="user">Στοιχεία προφίλ</MobileLink>
            <MobileLink href="/dashboard/listings" icon={isFarmer ? "wheat" : "tag"}>
              {isFarmer ? "Παραγωγή" : "Τιμοκατάλογος"}
            </MobileLink>
            {isFarmer && <MobileLink href="/dashboard/network" icon="heart">Οι έμποροί μου</MobileLink>}
            {!isFarmer && <MobileLink href="/dashboard/network" icon="users">Οι παραγωγοί μου</MobileLink>}
            {!isFarmer && <MobileLink href="/dashboard/purchases" icon="box">Αγορές & σεζόν</MobileLink>}
            <MobileLink href="/dashboard/messages" icon="chat">Μηνύματα</MobileLink>
            <MobileLink href="/dashboard/notifications" icon="bell">Ειδοποιήσεις</MobileLink>
            {isAdmin && <MobileLink href="/admin" icon="shield">Admin panel</MobileLink>}
          </MobileGroup>
        )}

        <MobileGroup title="Υποστήριξη">
          <a
            href="tel:2631028971"
            className="flex items-center gap-3 px-3 py-3 rounded-md text-[16px] font-semibold text-brand-ink hover:bg-brand-border/40 hover:text-brand-dark"
          >
            <Icon name="phone" className="text-brand-muted w-5 text-center" />
            <span className="figures">2631028971</span>
          </a>
          <a
            href="mailto:info@agrotik.gr"
            className="flex items-center gap-3 px-3 py-3 rounded-md text-[16px] font-semibold text-brand-ink hover:bg-brand-border/40 hover:text-brand-dark"
          >
            <Icon name="envelope" className="text-brand-muted w-5 text-center" />
            info@agrotik.gr
          </a>
        </MobileGroup>
      </nav>

      <div className="border-t border-brand-border bg-brand-surface p-4 shrink-0">
        {authed ? (
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-brand-dark text-white font-semibold text-[16px] hover:bg-brand-mid"
          >
            <Icon name="user" /> Στον λογαριασμό μου
          </Link>
        ) : (
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md border-2 border-brand-mid text-brand-dark font-semibold text-[16px] hover:bg-brand-mid hover:text-white"
            >
              Σύνδεση
            </Link>
            <Link
              href="/signup"
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-md bg-brand-dark text-white font-semibold text-[16px] hover:bg-brand-mid"
            >
              Εγγραφή
            </Link>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {!hideMobileTrigger && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Άνοιγμα μενού"
          aria-expanded={open}
          className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-brand-dark hover:bg-brand-border/40"
        >
          <Icon name="menu" className="text-xl" />
        </button>
      )}

      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}

function MobileGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="pt-3">
      <div className="eyebrow text-brand-muted px-3 pb-2">{title}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function MobileLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: IconName;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-3 rounded-md text-[16px] font-semibold text-brand-ink hover:bg-brand-border/40 hover:text-brand-dark"
    >
      <Icon name={icon} className="text-brand-muted w-5 text-center" />
      {children}
    </Link>
  );
}
