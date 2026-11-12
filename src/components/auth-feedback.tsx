"use client";

import { useSearchParams } from "next/navigation";

export function AuthFeedback() {
  const auth = useSearchParams().get("auth");
  const message =
    auth === "configuration-required"
      ? "The learning dashboard is unavailable because Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart the development server."
      : auth === "missing-code"
      ? "Google sign-in did not return an authorization code. Please try again."
      : auth === "callback-error"
        ? "We could not complete Google sign-in. Please try again."
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
