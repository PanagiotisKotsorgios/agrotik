import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow } from "@/components/ui/card";
import { ReportForm } from "./report-form";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const p = await searchParams;
  const target = (p.target as any) || "profile";
  const id = p.id;
  if (!id) redirect("/dashboard");

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Αναφορά</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">
          Ανέφερε στους διαχειριστές
        </h1>
        <p className="mt-3 text-brand-muted">
          Χρησιμοποίησε τη φόρμα για να αναφέρεις προφίλ ή καταχώρηση που φαίνεται παραπλανητική, spam ή προσβλητική.
        </p>
      </div>

      <Card className="max-w-2xl">
        <ReportForm targetType={target} targetId={id} />
      </Card>
    </>
  );
}
