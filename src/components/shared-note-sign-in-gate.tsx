"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export function SharedNoteSignInGate({ noteId }: { noteId: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="shared-note-sign-in-dialog"
      aria-modal="true"
      aria-labelledby="shared-note-sign-in-title"
      onCancel={(event) => event.preventDefault()}
    >
      <span className="shared-note-dialog-mark" aria-hidden="true">PS</span>
      <p className="shared-note-dialog-eyebrow">PunjabSkillUp notes</p>
      <h2 id="shared-note-sign-in-title">Sign in to open this note</h2>
      <p className="shared-note-dialog-copy">
        Sign in to preview or download this shared course document.
      </p>
      <GoogleSignInButton variant="google" returnTo={`/notes/${noteId}`} />
      <p className="shared-note-dialog-legal">
        By continuing, you agree to our <Link href="/terms">Terms</Link> and{" "}
        <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </dialog>
  );
}
