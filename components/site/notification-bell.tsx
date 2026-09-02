"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { createSupabaseBrowser } from "@/lib/supabase/browser";

export function NotificationBell({
  initialCount,
  initialMessages,
  userId,
  messageHref = "/dashboard/messages",
  notificationHref = "/dashboard/notifications",
}: {
  initialCount: number;
  initialMessages: number;
  userId: string;
  messageHref?: string;
  notificationHref?: string;
}) {
  const [count, setCount] = useState(initialCount);
  const [msgs, setMsgs] = useState(initialMessages);

  useEffect(() => setCount(initialCount), [initialCount]);
  useEffect(() => setMsgs(initialMessages), [initialMessages]);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const c1 = supabase
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setCount((c) => c + 1),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          if ((payload.new as { read_at?: string | null }).read_at) {
            setCount((current) => Math.max(0, current - 1));
          }
        },
      )
      .subscribe();
    const c2 = supabase
      .channel(`msg:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        () => setMsgs((m) => m + 1),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `recipient_id=eq.${userId}` },
        (payload) => {
          if ((payload.new as { read_at?: string | null }).read_at) {
            setMsgs((current) => Math.max(0, current - 1));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(c1);
      supabase.removeChannel(c2);
    };
  }, [userId]);

  return (
    <div className="flex items-center gap-1">
      <Link
        href={messageHref}
        aria-label={`Μηνύματα (${msgs} νέα)`}
        className="relative p-2 text-brand-ink/70 hover:text-brand-dark rounded-md hover:bg-brand-border/40"
      >
        <Icon name="chat" />
        {msgs > 0 && <Dot count={msgs} tone="olive" />}
      </Link>
      <Link
        href={notificationHref}
        aria-label={`Ειδοποιήσεις (${count} νέες)`}
        className="relative p-2 text-brand-ink/70 hover:text-brand-dark rounded-md hover:bg-brand-border/40"
      >
        <Icon name="bell" />
        {count > 0 && <Dot count={count} tone="earth" />}
      </Link>
    </div>
  );
}

function Dot({ count, tone }: { count: number; tone: "earth" | "olive" }) {
  const bg = tone === "earth" ? "bg-brand-earth" : "bg-brand-olive";
  return (
    <span
      className={`absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 text-[10px] font-bold text-white ${bg} rounded-full flex items-center justify-center leading-none figures`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
