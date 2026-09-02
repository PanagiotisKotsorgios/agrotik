import { cache } from "react";
import { createSupabaseServer } from "@/lib/supabase/server";

export interface SessionProfile {
  id: string;
  role: string;
  display_name: string;
  is_active: boolean;
  is_verified?: boolean;
}

export interface SessionInfo {
  userId: string | null;
  email: string | null;
  profile: SessionProfile | null;
  unreadNotifications: number;
  unreadMessages: number;
}

// Cached for the current request tree — layout, header, notification bell,
// and page all share the same result rather than each re-hitting Supabase.
export const getSession = cache(async (): Promise<SessionInfo> => {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null, email: null, profile: null, unreadNotifications: 0, unreadMessages: 0 };
  }
  const [profileRes, notifRes, msgRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, role, display_name, is_active, is_verified")
      .eq("id", user.id)
      .single(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);
  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profileRes.data as SessionProfile | null) ?? null,
    unreadNotifications: notifRes.count ?? 0,
    unreadMessages: msgRes.count ?? 0,
  };
});
