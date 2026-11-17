import type { Metadata } from "next";
import { CatalogCourseCard } from "@/components/catalog-course-card";
import { CatalogError } from "@/components/catalog-error";
import { createSignedThumbnailUrls } from "@/lib/catalog";
import { formatCoursePrice } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Explore courses | PunjabSkillUp",
  robots: { index: false },
};

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id,slug,title,description,price_inr,thumbnail_path,created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <section className="catalog-page" aria-labelledby="explore-heading">
        <PageHeading
          title="Explore courses"
          description="Pick a course and start learning."
          id="explore-heading"
        />
        <CatalogError />
      </section>
    );
  }

  if (!courses?.length) {
    return (
      <section className="catalog-page" aria-labelledby="explore-heading">
        <PageHeading
          title="Explore courses"
          description="Pick a course and start learning."
          id="explore-heading"
        />
        <div className="catalog-empty">
          <h2>No courses yet</h2>
          <p>New courses are on the way. Please check back soon.</p>
        </div>
      </section>
    );
  }

  const { urls, error: thumbnailError } = await createSignedThumbnailUrls(
    supabase,
    courses.map((course) => course.thumbnail_path),
  );

  if (thumbnailError) {
    return (
      <section className="catalog-page" aria-labelledby="explore-heading">
        <PageHeading
          title="Explore courses"
          description="Pick a course and start learning."
          id="explore-heading"
        />
        <CatalogError message="We couldn't load course thumbnails. Please refresh the page." />
      </section>
    );
  }

  return (
    <section className="catalog-page" aria-labelledby="explore-heading">
      <PageHeading
        title="Explore courses"
        description="Pick a course and start learning."
        id="explore-heading"
      />
      <div className="catalog-course-grid">
        {courses.map((course, index) => (
          <CatalogCourseCard
            key={course.id}
            course={course}
            thumbnailUrl={urls[index] ?? null}
            priceLabel={formatCoursePrice(course.price_inr)}
          />
        ))}
      </div>
    </section>
  );
}

function PageHeading({
  title,
  description,
  id,
}: {
  title: string;
  description: string;
  id: string;
}) {
  return (
    <header className="catalog-heading">
      <h1 id={id}>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
