"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { sendMessage } from "@/lib/actions/messages";

export function MessageComposer({ recipientId }: { recipientId: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await sendMessage({ recipient_id: recipientId, body: text.trim() });
          if (!res.ok) return setError(res.error);
          window.dispatchEvent(new CustomEvent("agrotik:message-sent", { detail: res.message }));
          setText("");
          router.refresh();
        });
      }}
    >
      <Textarea
        placeholder="Γράψε ένα μήνυμα…"
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={4000}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            (e.currentTarget.form as HTMLFormElement).requestSubmit();
          }
        }}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-brand-muted">Ctrl+Enter για αποστολή</span>
        {error && <span className="text-xs text-red-700">{error}</span>}
        <Button type="submit" disabled={pending || text.trim().length === 0} icon={pending ? "spinner" : "send"} size="sm">
          {pending ? "Αποστολή…" : "Αποστολή"}
        </Button>
      </div>
    </form>
  );
}
