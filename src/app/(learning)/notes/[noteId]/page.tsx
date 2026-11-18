import type { Metadata } from "next";
import Link from "next/link";
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
      <header className="catalog-heading">
        <h1>{note.title}</h1>
        <p>{course?.title ?? "General notes"}</p>
      </header>
      {note.body && <p className="note-body">{note.body}</p>}
      {note.file_path && note.file_name && (
        <a
          className="manage-primary-link"
          href={`/api/notes/${note.id}/file`}
        >
          Download {note.file_name}
        </a>
      )}
      {!note.body && !note.file_path && (
        <div className="catalog-error" role="alert">
          This note does not have any content available.
        </div>
      )}
    </section>
  );
}
