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
  const isBuyer = profile.role === "merchant" || profile.role === "factory";

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-0.5 md:sticky md:top-20 self-start">
          <div className="eyebrow text-brand-muted px-3 pb-2">Το προφίλ μου</div>
          <NavLink href="/dashboard" icon="chart">Αρχική</NavLink>
          <NavLink href="/dashboard/profile" icon="user">Στοιχεία προφίλ</NavLink>
          <NavLink href="/dashboard/listings" icon={isFarmer ? "wheat" : "tag"}>
            {isFarmer ? "Παραγωγή" : "Τιμοκατάλογος"}
          </NavLink>
          {isFarmer && <NavLink href="/dashboard/favorites" icon="heart">Αγαπημένα</NavLink>}
          <NavLink href="/dashboard/messages" icon="chat">Μηνύματα</NavLink>
          <NavLink href="/dashboard/notifications" icon="bell">Ειδοποιήσεις</NavLink>
          <div className="pt-4"><LogoutButton /></div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-md text-[15px] font-semibold text-brand-ink/85 hover:bg-brand-border/50 hover:text-brand-dark"
    >
      <Icon name={icon} className="text-brand-muted w-5 text-center" />
      {children}
    </Link>
  );
}
