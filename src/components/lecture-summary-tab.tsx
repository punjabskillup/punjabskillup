"use client";

import { useEffect, useRef, useState } from "react";
import { AiRequestError } from "@/lib/ai/errors";
import { postAiJson } from "@/lib/ai/client";

export function LectureSummaryTab({
  active,
  lectureId,
  transcriptVersion,
  onTranscriptMissing,
}: {
  active: boolean;
  lectureId: string;
  transcriptVersion: number;
  onTranscriptMissing: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<"idle" | "loaded" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const requestRef = useRef<{ key: string; promise: Promise<{ summary: string }> } | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let cancelled = false;
    const requestKey = `${lectureId}:${transcriptVersion}:${retryKey}`;
    if (requestRef.current?.key !== requestKey) {
      requestRef.current = {
        key: requestKey,
        promise: postAiJson<{ summary: string }>("/api/ai/summary", {
          lecture_id: lectureId,
        }),
      };
    }

    requestRef.current.promise
      .then((data) => {
        if (!cancelled) {
          setSummary(data.summary);
          setStatus("loaded");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          if (error instanceof AiRequestError && error.status === 409) {
            onTranscriptMissing();
          }
          setErrorMessage(
            error instanceof Error ? error.message : "The summary could not be loaded.",
          );
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [active, lectureId, onTranscriptMissing, retryKey, transcriptVersion]);

  function retry() {
    requestRef.current = null;
    setSummary("");
    setErrorMessage("");
    setStatus("idle");
    setRetryKey((current) => current + 1);
  }

  return (
    <div className="ai-summary-content ai-tab-content" hidden={!active}>
      {status === "idle" && (
        <div className="ai-loading-skeleton" aria-label="Creating your lecture summary" aria-busy="true">
          <span className="ai-skeleton-line ai-skeleton-line-wide" />
          <span className="ai-skeleton-line" />
          <span className="ai-skeleton-line" />
          <span className="ai-skeleton-line ai-skeleton-line-medium" />
          <span className="ai-skeleton-line" />
          <span className="ai-skeleton-line ai-skeleton-line-short" />
        </div>
      )}
      {status === "error" && (
        <div className="ai-inline-error" role="alert">
          <p>{errorMessage}</p>
          <button className="ai-retry-button" type="button" onClick={retry}>Try again</button>
        </div>
      )}
      {status === "loaded" && (
        <div className="ai-summary-text" aria-live="polite">{summary}</div>
      )}
    </div>
  );
}
