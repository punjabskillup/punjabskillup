"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, X } from "lucide-react";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { SignOutButton } from "@/components/sign-out-button";
import { createClient } from "@/lib/supabase/client";

type SignInTriggerProps = {
  children: React.ReactNode;
  className?: string;
};

export function SignInTrigger({ children, className = "" }: SignInTriggerProps) {
  return (
    <button
      className={className}
      type="button"
      onClick={() => window.dispatchEvent(new Event("open-sign-in"))}
    >
      {children}
    </button>
  );
}

function getUserName(user: User) {
  const name = user.user_metadata.full_name ?? user.user_metadata.name;
  return typeof name === "string" && name.trim()
    ? name.trim()
    : user.email ?? "Account";
}

function getAvatarUrl(user: User) {
  const avatar = user.user_metadata.avatar_url ?? user.user_metadata.picture;
  return typeof avatar === "string" && avatar.trim() ? avatar : null;
}

export function Navbar() {
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!hasSupabaseConfig);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const handleOpenSignIn = () => dialogRef.current?.showModal();
    window.addEventListener("open-sign-in", handleOpenSignIn);

    if (!hasSupabaseConfig) {
      return () => window.removeEventListener("open-sign-in", handleOpenSignIn);
    }

    const supabase = createClient();
    let receivedAuthEvent = false;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      receivedAuthEvent = true;
      setUser(session?.user ?? null);
      setAuthReady(true);
      setAuthError("");
    });

    void supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        if (error.name === "AuthSessionMissingError") {
          if (!receivedAuthEvent) {
            setUser(null);
            setAuthReady(true);
          }
          return;
        }

        console.error("Unable to load the navbar user.", error);
        setAuthReady(true);
        setAuthError("We couldn’t load your account. Please refresh the page.");
        return;
      }

      if (!receivedAuthEvent) {
        setUser(data.user);
        setAuthReady(true);
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("open-sign-in", handleOpenSignIn);
    };
  }, [hasSupabaseConfig]);

  function openSignInDialog() {
    if (!dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }

  function trapDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      dialogRef.current?.close();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    const focusable = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (!first || !last) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }

  const avatarUrl = user ? getAvatarUrl(user) : null;
  const userName = user ? getUserName(user) : "";

  return (
    <>
      <header className="site-header navbar">
        <div className="navbar-inner">
          <Link className="navbar-brand" href="/" aria-label="PunjabSkillUp home">
            Punjab<span>Skill</span>Up
          </Link>

          {user ? (
            <div className="navbar-signed-in">
              <Link className="navbar-teach-link" href="/teach">
                Teach with us
              </Link>
              <button
                className="navbar-join-button navbar-mobile-join-button"
                type="button"
                onClick={openSignInDialog}
              >
                Join free
              </button>
              <div className="navbar-account" id="profile">
                <button
                  className="navbar-avatar-button"
                  type="button"
                  aria-label={`Open ${userName} account menu`}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((open) => !open)}
                >
                  {avatarUrl ? (
                    <Image
                      className="navbar-avatar"
                      src={avatarUrl}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                    />
                  ) : (
                    <span className="navbar-avatar navbar-avatar-fallback">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <ChevronDown className="navbar-chevron" aria-hidden="true" />
                </button>
                {menuOpen && (
                  <div className="navbar-menu" aria-label="Account">
                    <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <SignOutButton />
                  </div>
                )}
              </div>
            </div>
          ) : authReady ? (
            <nav className="navbar-actions" aria-label="Main navigation">
              <Link className="navbar-teach-link" href="/teach">
                Teach with us
              </Link>
              <button
                className="navbar-sign-in"
                type="button"
                onClick={openSignInDialog}
              >
                Sign in
              </button>
              <button
                className="navbar-join-button"
                type="button"
                onClick={openSignInDialog}
              >
                Join free
              </button>
            </nav>
          ) : (
            <nav className="navbar-actions" aria-label="Main navigation">
              <span className="navbar-actions-placeholder" aria-hidden="true" />
              <button
                className="navbar-join-button"
                type="button"
                onClick={openSignInDialog}
              >
                Join free
              </button>
            </nav>
          )}
        </div>
      </header>

      {authError && <p className="navbar-auth-error" role="alert">{authError}</p>}

      <dialog
        ref={dialogRef}
        className="navbar-sign-in-dialog"
        aria-modal="true"
        aria-labelledby="navbar-sign-in-title"
        onKeyDown={trapDialogFocus}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            dialogRef.current.close();
          }
        }}
      >
        <div className="navbar-dialog-content">
          <button
            className="navbar-dialog-close"
            type="button"
            aria-label="Close sign-in dialog"
            onClick={() => dialogRef.current?.close()}
          >
            <X aria-hidden="true" />
          </button>
          <Link className="navbar-dialog-brand" href="/" aria-label="PunjabSkillUp home">
            Punjab<span>Skill</span>Up
          </Link>
          <h2 id="navbar-sign-in-title">Welcome to PunjabSkillUp</h2>
          <p>Sign in with Google to continue learning.</p>
          <GoogleSignInButton variant="google" />
          <p className="navbar-dialog-legal">
            By continuing, you agree to our <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </div>
      </dialog>
    </>
  );
}
