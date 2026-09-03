import Link from "next/link";
import { Logo } from "./logo";
import { Icon } from "@/components/ui/icon";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NotificationBell } from "./notification-bell";
import { MobileNav } from "./mobile-nav";
import { hasBeekeeperRole, hasFisherRole, hasStockbreederRole, isProducerRole } from "@/lib/utils";

export async function Header() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: { id: string; role: string; display_name: string } | null = null;
  let unreadNotif = 0;
  let unreadMsg = 0;
  if (user) {
    const [p, n, m] = await Promise.all([
      supabase.from("profiles").select("id, role, display_name").eq("id", user.id).single(),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null),
      supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null),
    ]);
    profile = p.data;
    unreadNotif = n.count ?? 0;
    unreadMsg = m.count ?? 0;
  }

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

        <nav className="hidden lg:flex items-center gap-1">
          <NavItem href="/search/buyers" icon="store" label="Αγοραστές" />
          <NavItem href="/search/producers" icon="seedling" label="Παραγωγοί" />
          <NavItem href="/search/suppliers" icon="listCheck" label="Αγροεφόδια" />
          <NavItem href="/contact" icon="envelope" label="Επικοινωνία" />
        </nav>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <NotificationBell
                initialCount={unreadNotif}
                initialMessages={unreadMsg}
                userId={user!.id}
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
            isStockbreeder={hasStockbreederRole(profile?.role)}
            isBeekeeper={hasBeekeeperRole(profile?.role)}
            isDualProducer={
              profile?.role === "farmer_fisher" ||
              profile?.role === "farmer_stockbreeder" ||
              profile?.role === "farmer_beekeeper"
            }
            role={profile?.role}
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
