import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CatalogThumbnail } from "@/components/catalog-thumbnail";
import { CatalogError } from "@/components/catalog-error";
import { createSignedThumbnailUrls } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Free lectures | PunjabSkillUp",
  robots: { index: false },
};

export default async function FreeLecturesPage() {
  const supabase = await createClient();
  const { data: lectures, error } = await supabase
    .from("lectures")
    .select(
      "id,title,duration_seconds,created_at,courses!inner(id,slug,title,thumbnail_path)",
    )
    .eq("is_free", true)
    .eq("is_published", true)
    .eq("courses.is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <section className="catalog-page" aria-labelledby="free-lectures-heading">
        <header className="catalog-heading">
          <h1 id="free-lectures-heading">Free lectures</h1>
          <p>Learn something new with a free lecture.</p>
        </header>
        <CatalogError />
      </section>
    );
  }

  if (!lectures?.length) {
    return (
      <section className="catalog-page" aria-labelledby="free-lectures-heading">
        <header className="catalog-heading">
          <h1 id="free-lectures-heading">Free lectures</h1>
          <p>Learn something new with a free lecture.</p>
        </header>
        <div className="catalog-empty">
          <h2>Free lectures are coming soon.</h2>
          <p>Free lessons from published courses will appear here.</p>
        </div>
      </section>
    );
  }

  const joinedLectures = lectures.flatMap((lecture) => {
    const course = lecture.courses[0];
    return course ? [{ ...lecture, course }] : [];
  });

  if (joinedLectures.length !== lectures.length) {
    return (
      <section className="catalog-page" aria-labelledby="free-lectures-heading">
        <header className="catalog-heading">
          <h1 id="free-lectures-heading">Free lectures</h1>
          <p>Learn something new with a free lecture.</p>
        </header>
        <CatalogError message="We couldn't load the course for a free lecture. Please refresh the page." />
      </section>
    );
  }

  const { urls, error: thumbnailError } = await createSignedThumbnailUrls(
    supabase,
    joinedLectures.map((lecture) => lecture.course.thumbnail_path),
  );

  if (thumbnailError) {
    return (
      <section className="catalog-page" aria-labelledby="free-lectures-heading">
        <header className="catalog-heading">
          <h1 id="free-lectures-heading">Free lectures</h1>
          <p>Learn something new with a free lecture.</p>
        </header>
        <CatalogError message="We couldn't load lecture thumbnails. Please refresh the page." />
      </section>
    );
  }

  return (
    <section className="catalog-page" aria-labelledby="free-lectures-heading">
      <header className="catalog-heading">
        <h1 id="free-lectures-heading">Free lectures</h1>
        <p>Learn something new with a free lecture.</p>
      </header>
      <div className="free-lecture-grid">
        {joinedLectures.map((lecture, index) => (
          <Link
            className="free-lecture-card"
            href={`/courses/${lecture.course.id}/lectures/${lecture.id}`}
            key={lecture.id}
          >
            <CatalogThumbnail
              src={urls[index] ?? null}
              title={lecture.course.title}
              className="free-lecture-thumbnail"
            />
            <div className="free-lecture-copy">
              <h2>{lecture.title}</h2>
              <p>{lecture.course.title}</p>
              <span>{formatDuration(lecture.duration_seconds)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function formatDuration(seconds: number | null) {
  if (seconds === null) {
    return "Duration not available";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;
}
