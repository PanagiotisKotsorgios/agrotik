import { redirect } from "next/navigation";
import { Header } from "@/components/site/header";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/site/logout-button";
import { DashboardMobileNav } from "@/components/site/dashboard-mobile-nav";
import { SidebarNav } from "@/components/site/sidebar-nav";
import { Icon, type IconName } from "@/components/ui/icon";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) {
    return (
      <>
        <Header />
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-700 flex items-center justify-center mx-auto">
            <Icon name="lock" className="text-lg" />
          </div>
          <h1 className="display text-2xl text-brand-dark mt-4">Ο λογαριασμός έχει απενεργοποιηθεί</h1>
          <p className="mt-2 text-brand-muted">Επικοινώνησε με τον διαχειριστή.</p>
          <div className="mt-6"><LogoutButton /></div>
        </div>
      </>
    );
  }

  const isFarmer = profile.role === "farmer";
  const items: { href: string; icon: IconName; label: string }[] = [
    { href: "/dashboard", icon: "chart", label: "Αρχική" },
    { href: "/dashboard/profile", icon: "user", label: "Προφίλ" },
    {
      href: "/dashboard/listings",
      icon: isFarmer ? "wheat" : "tag",
      label: isFarmer ? "Παραγωγή" : "Τιμοκατάλογος",
    },
    isFarmer
      ? { href: "/dashboard/network", icon: "heart", label: "Οι έμποροί μου" }
      : { href: "/dashboard/network", icon: "users", label: "Οι παραγωγοί μου" },
    ...(!isFarmer
      ? [{ href: "/dashboard/purchases", icon: "box" as IconName, label: "Αγορές" }]
      : []),
    { href: "/dashboard/messages", icon: "chat", label: "Μηνύματα" },
    { href: "/dashboard/notifications", icon: "bell", label: "Ειδοποιήσεις" },
  ];

  return (
    <>
      <Header />
      <DashboardMobileNav title="Ο λογαριασμός μου" items={items} />
      <div className="min-h-[calc(100vh-88px)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-6 md:py-8 md:grid md:grid-cols-[260px_1fr] md:gap-8">
          <aside className="hidden md:block">
            <div className="sticky top-[104px] bg-brand-dark text-white rounded-2xl p-4 shadow-elev">
              <div className="px-3 pb-3">
                <div className="text-[11px] uppercase tracking-widest text-white/60 font-semibold">Ο λογαριασμός μου</div>
                <div className="mt-1 text-[15px] font-semibold text-white truncate">{profile.display_name}</div>
              </div>
              <SidebarNav items={items} />
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

