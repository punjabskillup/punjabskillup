"use client";

import { useEffect, useState } from "react";

export function NotePdfPreview({ noteId }: { noteId: string }) {
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPdf() {
      try {
        const response = await fetch(`/api/notes/${noteId}/file`, {
          signal: controller.signal,
          credentials: "same-origin",
        });
        if (!response.ok) {
          throw new Error(
            response.status === 401 || response.status === 403
              ? "Sign in with an account that can access this note, then try again."
              : "We couldn’t load this PDF. Please try again or download it instead.",
          );
        }
        const pdf = await response.blob();
        if (controller.signal.aborted) return;
        const objectUrl = URL.createObjectURL(pdf);
        window.location.replace(objectUrl);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "We couldn’t load this PDF. Please try again.",
          );
        }
      }
    }

    void loadPdf();
    return () => {
      controller.abort();
    };
  }, [noteId]);

  return (
    <main className="pdf-preview-page" aria-live="polite" aria-busy={!error}>
      {error ? (
        <div className="pdf-preview-message" role="alert">
          <span className="pdf-preview-mark" aria-hidden="true">PDF</span>
          <p className="pdf-preview-kicker">PunjabSkillUp · Document preview</p>
          <h1>Preview unavailable</h1>
          <p>{error}</p>
          <a className="pdf-preview-download" href={`/api/notes/${noteId}/file?download=1`}>
            Download PDF
          </a>
          <button type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      ) : (
        <div className="pdf-preview-message">
          <span className="pdf-preview-mark" aria-hidden="true">PDF</span>
          <p className="pdf-preview-kicker">PunjabSkillUp · Document preview</p>
          <h1>Preparing your document</h1>
          <p>Your PDF is loading. This can take a moment.</p>
          <div className="pdf-preview-progress" role="progressbar" aria-label="Loading PDF">
            <span />
          </div>
        </div>
      )}
    </main>
  );
}
