"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      router.replace("/");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to sign out.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="sign-out-control">
      <Button
        className="sign-out-button"
        variant="outline"
        type="button"
        onClick={handleSignOut}
        disabled={isLoading}
      >
        {isLoading ? "Signing out..." : "Sign out"}
      </Button>
      {errorMessage && <p className="sign-in-error" role="alert">{errorMessage}</p>}
    </div>
  );
}
