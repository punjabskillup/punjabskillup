import type { Metadata } from "next";
import { FileText, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Notes | PunjabSkillUp",
  robots: { index: false },
};

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: notes, error } = await supabase
    .from("notes")
    .select("id,title,is_free,courses(title)")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  return (
    <section className="catalog-page" aria-labelledby="notes-heading">
      <header className="catalog-heading">
        <h1 id="notes-heading">Notes</h1>
        <p>Review helpful notes from your courses.</p>
      </header>

      {error ? (
        <div className="catalog-error" role="alert">
          We couldn&apos;t load your notes. Please refresh the page and try again.
        </div>
      ) : notes?.length ? (
        <div className="catalog-list">
          {notes.map((note) => (
            <article className="note-card" key={note.id}>
              <span className="catalog-list-icon" aria-hidden="true">
                <FileText />
              </span>
              <div className="catalog-list-copy">
                <h2>{note.title}</h2>
                <p>{note.courses[0]?.title ?? "General notes"}</p>
              </div>
              {note.is_free ? (
                <span className="catalog-badge">Free</span>
              ) : (
                <span className="catalog-lock" aria-label="Premium note">
                  <LockKeyhole aria-hidden="true" />
                </span>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="catalog-empty">
          <h2>Notes are coming soon.</h2>
          <p>Published course notes will appear here when they are ready.</p>
        </div>
      )}
    </section>
  );
}
