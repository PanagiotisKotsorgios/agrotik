"use client";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { formatRelative } from "@/lib/utils";

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

export function LiveThread({
  userId,
  peerId,
  initial,
}: {
  userId: string;
  peerId: string;
  initial: Msg[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const ch = supabase
      .channel(`thread:${userId}:${peerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Msg;
          const relevant =
            (m.sender_id === userId && m.recipient_id === peerId) ||
            (m.sender_id === peerId && m.recipient_id === userId);
          if (!relevant) return;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, peerId]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  return (
    <div ref={scrollerRef} className="h-[420px] overflow-y-auto p-4 space-y-3 bg-brand-surface">
      {messages.length === 0 ? (
        <div className="text-center text-brand-muted text-sm py-8">Δεν υπάρχουν μηνύματα ακόμα.</div>
      ) : (
        messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[75%] rounded-2xl px-4 py-2 text-sm " +
                  (mine
                    ? "bg-brand-dark text-white rounded-br-sm"
                    : "bg-brand-bg border border-brand-border text-brand-ink rounded-bl-sm")
                }
              >
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div
                  className={
                    "eyebrow mt-1 " + (mine ? "text-white/60" : "text-brand-muted")
                  }
                >
                  {formatRelative(m.created_at)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
