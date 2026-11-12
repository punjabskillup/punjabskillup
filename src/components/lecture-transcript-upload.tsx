"use client";

import { useState, type FormEvent } from "react";
import { getAiApiError } from "@/lib/ai/client";

export function LectureTranscriptUpload({
  lectureId,
  onUploaded,
}: {
  lectureId: string;
  onUploaded: () => void;
}) {
  const [language, setLanguage] = useState("English");
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  async function uploadTranscript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!file && !transcript.trim()) {
      setMessage("Paste a transcript or choose a .txt file.");
      return;
    }

    const formData = new FormData();
    formData.set("lecture_id", lectureId);
    formData.set("language", language);
    if (file) {
      formData.set("file", file);
    } else {
      formData.set("transcript", transcript);
    }

    setIsUploading(true);
    try {
      const response = await fetch("/api/ai/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw await getAiApiError(response);
      }

      setTranscript("");
      setFile(null);
      setMessage("Transcript saved. Your lecture AI is ready.");
      onUploaded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The transcript could not be processed.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="transcript-upload" aria-labelledby="transcript-upload-heading">
      <div>
        <h3 id="transcript-upload-heading">Add a lecture transcript</h3>
        <p>Paste the lecture text or upload a plain-text .txt file to prepare its AI study tools.</p>
      </div>
      <form className="transcript-upload-form" onSubmit={uploadTranscript}>
        <label>
          Transcript language
          <select value={language} onChange={(event) => setLanguage(event.target.value)}>
            <option>English</option>
            <option>Punjabi</option>
            <option>Hindi</option>
          </select>
        </label>
        <label>
          Paste transcript
          <textarea
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value);
              if (event.target.value) {
                setFile(null);
              }
            }}
            placeholder="Paste the lecture transcript here..."
            maxLength={300_000}
            rows={5}
            disabled={isUploading || Boolean(file)}
          />
        </label>
        <label>
          Or upload a .txt file
          <input
            type="file"
            accept=".txt,text/plain"
            disabled={isUploading || Boolean(transcript)}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button className="ai-submit-quiz" type="submit" disabled={isUploading}>
          {isUploading ? "Processing transcript..." : "Save transcript"}
        </button>
        {message && <p className="ai-upload-message" role="status">{message}</p>}
      </form>
    </section>
  );
}
