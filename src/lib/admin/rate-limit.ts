import "server-only";

import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;
export type AdminRateLimitBucket = "admin-actions" | "admin-mfa";

export async function consumeAdminRateLimit(
  supabase: ServerClient,
  bucket: AdminRateLimitBucket,
) {
  const { data, error } = await supabase.rpc("consume_admin_rate_limit", {
    p_bucket: bucket,
  });

  return !error && data === true;
}
