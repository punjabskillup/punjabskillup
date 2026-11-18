import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin() {
  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    supabase = await createClient();
  } catch {
    notFound();
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      notFound();
    }

    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_admin");
    if (adminError || isAdmin !== true) {
      notFound();
    }

    return { supabase, user };
  } catch {
    notFound();
  }
}
