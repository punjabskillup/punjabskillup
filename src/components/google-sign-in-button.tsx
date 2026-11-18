"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  variant: "outline" | "google" | "primary";
};

function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.74 7.18l7.73 6C44.43 38.05 46.98 31.9 46.98 24.55Z" />
      <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.45-4.88 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export function GoogleSignInButton({ variant }: GoogleSignInButtonProps) {
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = new URL("/auth/callback", window.location.origin);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectTo.toString() },
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error("Google sign-in failed.", error);
      setErrorMessage("We couldn’t connect to Google. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className={`sign-in-control sign-in-control-${variant}`}>
      <Button
        className={`sign-in-button google-sign-in-button-${variant}`}
        variant={variant === "primary" ? "primary" : "outline"}
        type="button"
        onClick={handleSignIn}
        disabled={isLoading}
        aria-busy={isLoading}
      >
        <GoogleMark />
        <span>
          {isLoading
            ? "Connecting..."
            : variant === "outline"
              ? "Sign in"
              : "Continue with Google"}
        </span>
      </Button>
      {errorMessage && (
        <p className="sign-in-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
