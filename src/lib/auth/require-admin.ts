import "server-only";

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAdmin(
  options: { allowBeforeMfa?: boolean } = {},
) {
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

    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assuranceError || !assurance) {
      notFound();
    }

    if (options.allowBeforeMfa) {
      if (
        assurance.currentLevel !== "aal1" &&
        assurance.currentLevel !== "aal2"
      ) {
        notFound();
      }
    } else if (assurance.currentLevel !== "aal2") {
      notFound();
    }

    return { supabase, user, assurance };
  } catch {
    notFound();
  }
}
