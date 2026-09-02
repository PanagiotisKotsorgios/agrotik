import "server-only";

import { createHash } from "node:crypto";
import { createSupabaseService } from "@/lib/supabase/service";

/** Database-backed fixed-window limiter shared by every application instance. */
export async function consumeRateLimit(
  bucket: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const keyHash = createHash("sha256").update(identity.trim().toLocaleLowerCase()).digest("hex");
  const service = createSupabaseService();
  const { data, error } = await service.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    // Keep rolling deployments compatible while the additive migration reaches
    // every environment. The error is visible to operators.
    console.error("[rate limit]", error.message);
    return true;
  }
  return data === true;
}
