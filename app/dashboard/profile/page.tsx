import { createSupabaseServer } from "@/lib/supabase/server";
import { getRegions } from "@/lib/db/queries";
import { Eyebrow } from "@/components/ui/card";
import { ProfileEditor } from "./profile-editor";
import { ChangePasswordForm } from "./change-password-form";

import { redirect } from "next/navigation";
export default async function DashboardProfile() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const regions = await getRegions();

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Δημόσιο προφίλ</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Στοιχεία μου</h1>
        <p className="mt-3 text-brand-muted">
          Ό,τι συμπληρώνεις εδώ εμφανίζεται στην κάρτα προφίλ σου. Πληροφορίες επικοινωνίας είναι ορατές μόνο σε συνδεδεμένους χρήστες.
        </p>
      </div>
      <ProfileEditor profile={profile!} regions={regions} />
      <div className="mt-6">
        <ChangePasswordForm />
      </div>
    </>
  );
}
