import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileText, Eye } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { canAccessNote } from "@/lib/notes/access";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Course note | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default async function NotePage({
  params,
}: {
  params: Promise<{ noteId: string }>;
}) {
  const { noteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect("/");
  }

  const { data: note, error } = await supabase
    .from("notes")
    .select(
      "id,title,body,course_id,is_free,is_published,file_path,file_name,content_type,courses(id,title)",
    )
    .eq("id", noteId)
    .maybeSingle();

  if (error) {
    return (
      <section className="catalog-page">
        <div className="catalog-error" role="alert">
          We couldn&apos;t load this note. Please try again later.
        </div>
      </section>
    );
  }
  if (!note) {
    notFound();
  }

  let allowed: boolean;
  try {
    allowed = await canAccessNote(supabase, user.id, note);
  } catch {
    return (
      <section className="catalog-page">
        <div className="catalog-error" role="alert">
          We couldn&apos;t verify your access to this note.
        </div>
      </section>
    );
  }

  const course = note.courses[0] ?? null;
  if (!allowed) {
    return (
      <section className="catalog-page">
        <Link className="catalog-back-link" href="/notes">Back to notes</Link>
        <div className="catalog-empty">
          <h1>{note.title}</h1>
          <p>
            Enroll in {course?.title ?? "this course"} to access this note.
          </p>
          {course && (
            <Link className="text-action" href={`/courses/${course.id}`}>
              View course
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="catalog-page">
      <Link className="catalog-back-link" href="/notes">Back to notes</Link>
      <article className="note-detail">
        <header className="note-detail-header">
          <span className="catalog-list-icon" aria-hidden="true"><FileText /></span>
          <div className="note-detail-title">
            <p className="note-detail-eyebrow">{course?.title ?? "General notes"}</p>
            <h1>{note.title}</h1>
            {note.file_name && <p className="note-detail-filename">{note.file_name}</p>}
          </div>
          {note.file_path && note.file_name && (
            <div className="note-file-actions">
              {note.content_type === "application/pdf" && (
                <a
                  className="note-preview-link note-action-primary"
                  href={`/notes/${note.id}/preview`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Eye aria-hidden="true" /> Preview
                </a>
              )}
              <a className="note-download-link note-action-secondary" href={`/api/notes/${note.id}/file?download=1`}>
                <Download aria-hidden="true" /> Download
              </a>
            </div>
          )}
        </header>
        {note.body && <p className="note-body">{note.body}</p>}
        {note.file_path && note.content_type !== "application/pdf" && (
          <div className="note-file-callout">
            <FileText aria-hidden="true" />
            <div><strong>Document ready</strong><p>Download this file to open it on your device.</p></div>
          </div>
        )}
      </article>
      {!note.body && !note.file_path && (
        <div className="catalog-error" role="alert">
          This note does not have any content available.
        </div>
      )}
    </section>
  );
}
