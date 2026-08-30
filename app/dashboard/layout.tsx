import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/site/logout-button";
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

  return (
    <>
      <Header />
      <div className="min-h-[calc(100vh-76px)] bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 grid md:grid-cols-[260px_1fr] gap-8">
          <aside className="space-y-1 md:sticky md:top-24 self-start">
            <div className="eyebrow text-brand-muted px-3.5 pb-3 text-[13px]">Το προφίλ μου</div>
            <NavLink href="/dashboard" icon="chart">Αρχική</NavLink>
            <NavLink href="/dashboard/profile" icon="user">Στοιχεία προφίλ</NavLink>
            <NavLink href="/dashboard/listings" icon={isFarmer ? "wheat" : "tag"}>
              {isFarmer ? "Παραγωγή" : "Τιμοκατάλογος"}
            </NavLink>
            {isFarmer && <NavLink href="/dashboard/network" icon="heart">Οι έμποροί μου</NavLink>}
            {!isFarmer && <NavLink href="/dashboard/network" icon="users">Οι παραγωγοί μου</NavLink>}
            {!isFarmer && <NavLink href="/dashboard/purchases" icon="box">Αγορές & σεζόν</NavLink>}
            <NavLink href="/dashboard/messages" icon="chat">Μηνύματα</NavLink>
            <NavLink href="/dashboard/notifications" icon="bell">Ειδοποιήσεις</NavLink>

            <div className="pt-6 mt-4 border-t border-brand-border">
              <LogoutButton />
            </div>
          </aside>
          <main className="min-w-0">{children}</main>
        </div>
      </div>
    </>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch
      className="flex items-center gap-3.5 px-3.5 py-3 rounded-lg text-[16px] font-semibold text-brand-ink hover:bg-brand-bg hover:text-brand-dark transition-colors"
    >
      <Icon name={icon} className="text-brand-muted w-5 text-center text-[1.05em]" />
      {children}
    </Link>
  );
}
