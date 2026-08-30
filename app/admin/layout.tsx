import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/site/logout-button";
import { DashboardMobileNav } from "@/components/site/dashboard-mobile-nav";
import { Icon, type IconName } from "@/components/ui/icon";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const items: { href: string; icon: IconName; label: string }[] = [
    { href: "/admin", icon: "chart", label: "Στατιστικά" },
    { href: "/admin/users", icon: "users", label: "Χρήστες" },
    { href: "/admin/products", icon: "box", label: "Προϊόντα" },
    { href: "/admin/reports", icon: "flag", label: "Αναφορές" },
    { href: "/admin/settings", icon: "gear", label: "Ρυθμίσεις" },
    { href: "/admin/exports", icon: "download", label: "Εξαγωγές" },
  ];

  return (
    <>
      <Header />
      <DashboardMobileNav title="Admin panel" items={items} />
      <div className="min-h-[calc(100vh-88px)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 md:grid md:grid-cols-[260px_1fr] md:gap-8">
          <aside className="hidden md:block">
            <div className="sticky top-[104px] bg-brand-dark text-white rounded-2xl p-4 shadow-elev">
              <div className="px-3 pb-3 flex items-center gap-2 text-white/70">
                <Icon name="shield" />
                <span className="text-[11px] uppercase tracking-widest font-semibold">Admin</span>
              </div>
              <nav className="space-y-0.5">
                {items.map((it) => (
                  <SideLink key={it.href} href={it.href} icon={it.icon}>{it.label}</SideLink>
                ))}
              </nav>
              <div className="mt-4 pt-4 border-t border-white/10">
                <LogoutButton />
              </div>
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </>
  );
}

function SideLink({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[15px] font-semibold text-white/85 hover:bg-white/10 hover:text-white transition-colors"
    >
      <Icon name={icon} className="text-white/60 w-5 text-center text-[1.05em]" />
      {children}
    </Link>
  );
}
