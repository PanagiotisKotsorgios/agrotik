import Link from "next/link";
import { Logo } from "./logo";
import { Icon } from "@/components/ui/icon";
import { NotificationBell } from "./notification-bell";
import { MobileNav } from "./mobile-nav";
import { hasFisherRole, isProducerRole } from "@/lib/utils";
import { getSession } from "@/lib/auth/session";

export async function Header() {
  const { userId, profile, unreadNotifications: unreadNotif, unreadMessages: unreadMsg } = await getSession();

  return (
    <header className="bg-brand-surface/95 backdrop-blur border-b border-brand-border sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 h-[88px] flex items-center justify-between gap-4">
        <Link
          href="/"
          prefetch
          className="flex items-center shrink-0"
          aria-label="AGROTIK — Αρχική"
        >
          <Logo size={72} />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <NavItem href="/search/buyers" icon="store" label="Αγοραστές" />
          <NavItem href="/search/producers" icon="seedling" label="Παραγωγοί & Αλιείς" />
          <NavItem href="/contact" icon="envelope" label="Επικοινωνία" />
        </nav>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <NotificationBell
                initialCount={unreadNotif}
                initialMessages={unreadMsg}
                userId={userId!}
                messageHref={profile.role === "admin" ? "/admin/messages" : "/dashboard/messages"}
                notificationHref={profile.role === "admin" ? "/admin" : "/dashboard/notifications"}
              />
              {profile.role === "admin" && (
                <Link
                  href="/admin"
                  prefetch
                  className="hidden sm:inline-flex items-center gap-2 text-[15px] font-semibold px-4 py-2.5 rounded-md border border-brand-border text-brand-dark hover:bg-brand-dark hover:text-white hover:border-brand-dark transition-colors"
                >
                  <Icon name="shield" /> Admin
                </Link>
              )}
              <Link
                href={profile.role === "admin" ? "/admin" : "/dashboard"}
                prefetch
                className="inline-flex items-center gap-2 text-[15px] font-semibold px-4 py-2.5 rounded-md bg-brand-dark text-white hover:bg-brand-mid"
              >
                <Icon name={profile.role === "admin" ? "shield" : "user"} />
                <span className="hidden sm:inline">{profile.display_name.split(" ")[0]}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                prefetch
                className="hidden sm:inline-flex items-center text-[15px] font-semibold px-4 py-2.5 rounded-md text-brand-dark border-2 border-brand-mid hover:bg-brand-mid hover:text-white transition-colors"
              >
                Σύνδεση
              </Link>
              <Link
                href="/signup"
                prefetch
                className="hidden sm:inline-flex items-center text-[15px] font-semibold px-4 py-2.5 rounded-md bg-brand-dark text-white hover:bg-brand-mid"
              >
                Δωρεάν εγγραφή
              </Link>
            </>
          )}
          {/* Hamburger at the right for mobile */}
          <MobileNav
            authed={!!profile}
            isAdmin={profile?.role === "admin"}
            isProducer={isProducerRole(profile?.role)}
            isFisher={hasFisherRole(profile?.role)}
            isDualProducer={profile?.role === "farmer_fisher"}
            displayName={profile?.display_name}
          />
        </div>
      </div>
    </header>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: any; label: string }) {
  return (
    <Link
      href={href}
      prefetch
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-[16px] font-semibold text-brand-ink/85 hover:text-brand-dark hover:bg-brand-border/40 transition-colors"
    >
      <Icon name={icon} className="text-brand-muted" />
      {label}
    </Link>
  );
}
