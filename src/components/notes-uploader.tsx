"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { CourseWithLectures } from "@/lib/courses";
import { MAX_NOTE_FILE_BYTES } from "@/lib/notes/files";

type NotesUploaderProps = {
  courses: Pick<CourseWithLectures, "id" | "title">[];
};

export function NotesUploader({ courses }: NotesUploaderProps) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"alert" | "status">("status");
  const [noteUrl, setNoteUrl] = useState("");

  async function uploadNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");
    setNoteUrl("");
    setIsUploading(true);

    try {
      const response = await fetch("/api/notes", {
        method: "POST",
        body: new FormData(form),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof result.message === "string"
            ? result.message
            : "Unable to upload this note.",
        );
      }

      const url = new URL(result.url, window.location.origin).toString();
      setNoteUrl(url);
      setMessageRole("status");
      setMessage("Note uploaded. Share this link from your website:");
      form.reset();
      router.refresh();
    } catch (error) {
      setMessageRole("alert");
      setMessage(
        error instanceof Error ? error.message : "Unable to upload this note.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function copyNoteLink() {
    try {
      await navigator.clipboard.writeText(noteUrl);
      setMessage("Note link copied.");
      setMessageRole("status");
    } catch {
      setMessage("Could not copy the link. Select and copy it below.");
      setMessageRole("alert");
    }
  }

  return (
    <section className="instructor-form-card" aria-labelledby="upload-notes-heading">
      <div className="instructor-form-heading">
        <span className="step-number">03</span>
        <div>
          <h2 id="upload-notes-heading">Upload course notes</h2>
          <p>Upload a PDF or Word document and share its link from this website.</p>
        </div>
      </div>

      {courses.length === 0 ? (
        <p className="instructor-empty">Create or select a course before uploading notes.</p>
      ) : (
        <form className="instructor-form" onSubmit={uploadNote}>
          <label>
            Course
            <select name="course_id" required defaultValue={courses[0].id}>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </label>
          <label>
            Note title
            <input name="title" type="text" maxLength={120} required />
          </label>
          <label>
            Document (PDF, DOC, or DOCX; up to {MAX_NOTE_FILE_BYTES / 1024 / 1024} MB)
            <input
              name="file"
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
            />
          </label>
          <label>
            Access
            <select name="is_free" defaultValue="true" required>
              <option value="true">Free — any signed-in learner</option>
              <option value="false">Enrolled learners only</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input name="is_published" type="checkbox" defaultChecked />
            <span>Publish now</span>
          </label>
          <div className="form-submit-row">
            <button className="primary-action" type="submit" disabled={isUploading}>
              {isUploading ? "Uploading..." : "Upload note"}
            </button>
            {message && <p className="form-feedback" role={messageRole}>{message}</p>}
          </div>
          {noteUrl && (
            <div className="note-share-link">
              <a href={noteUrl}>{noteUrl}</a>
              <button className="text-action" type="button" onClick={copyNoteLink}>
                Copy link
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
