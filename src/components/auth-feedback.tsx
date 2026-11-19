"use client";

import { useSearchParams } from "next/navigation";

export function AuthFeedback() {
  const searchParams = useSearchParams();
  const auth = searchParams.get("auth");
  const reason = searchParams.get("reason");
  const message =
    auth === "configuration-required"
      ? "The learning dashboard is unavailable because Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the development server."
      : auth === "missing-code"
      ? "Google sign-in did not return an authorization code. Please try again."
      : auth === "callback-error"
        ? reason === "supabase-unreachable"
          ? "Your local server cannot reach Supabase. Check the computer’s internet, VPN, or firewall, then retry sign-in."
          : reason === "missing-verifier"
            ? "Google sign-in verification was lost before returning to this browser. Start again from the same localhost address."
            : reason === "invalid-verifier"
              ? "Google sign-in verification did not match. Clear site data for localhost:3000, then start sign-in again."
              : "Google sign-in code exchange failed. Check the local dev terminal for the OAuth error code, then verify this app's Supabase URL and publishable key come from the same project."
        : null;

  if (!message) {
    return null;
  }

  return (
    <p className="auth-feedback" role="alert">
      {message}
    </p>
  );
}
