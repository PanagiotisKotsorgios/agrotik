import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/site/header";
import { createSupabaseServer } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/site/logout-button";
import { Icon, type IconName } from "@/components/ui/icon";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-6 grid md:grid-cols-[240px_1fr] gap-6">
        <aside className="space-y-0.5 md:sticky md:top-20 self-start">
          <div className="eyebrow text-brand-muted px-3 pb-2 inline-flex items-center gap-2">
            <Icon name="shield" /> Admin
          </div>
          <A href="/admin" icon="chart">Στατιστικά</A>
          <A href="/admin/users" icon="users">Χρήστες</A>
          <A href="/admin/products" icon="box">Προϊόντα</A>
          <A href="/admin/reports" icon="flag">Αναφορές</A>
          <A href="/admin/settings" icon="gear">Ρυθμίσεις</A>
          <A href="/admin/exports" icon="download">Εξαγωγές</A>
          <div className="pt-4"><LogoutButton /></div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </>
  );
}

function A({ href, icon, children }: { href: string; icon: IconName; children: React.ReactNode }) {
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
