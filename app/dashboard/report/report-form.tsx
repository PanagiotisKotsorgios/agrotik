"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { submitReport } from "@/lib/actions/reports";

export function ReportForm({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setMsg(null);
          const res = await submitReport({ target_type: targetType, target_id: targetId, reason });
          if (!res.ok) return setMsg({ ok: false, text: res.error });
          setMsg({ ok: true, text: "Ευχαριστούμε — η αναφορά υποβλήθηκε." });
          setReason("");
          setTimeout(() => router.push("/dashboard"), 1500);
        });
      }}
    >
      <div>
        <Label htmlFor="reason">Περιέγραψε τι συμβαίνει</Label>
        <Textarea
          id="reason"
          rows={5}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={3}
          maxLength={1000}
          required
          placeholder="Π.χ. Ψεύτικες τιμές, παραπλανητική περιγραφή…"
        />
      </div>
      {msg && (
        <p className={"text-sm inline-flex items-center gap-2 px-3 py-2 rounded-md border " +
          (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700")}>
          <Icon name={msg.ok ? "ok" : "triangleAlert"} /> {msg.text}
        </p>
      )}
      <Button type="submit" disabled={pending} icon={pending ? "spinner" : "flag"}>
        {pending ? "Υποβολή…" : "Υποβολή αναφοράς"}
      </Button>
    </form>
  );
}
