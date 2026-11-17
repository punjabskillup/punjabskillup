import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Play } from "lucide-react";
import { EnrollButton } from "@/components/enroll-button";
import { LearningNavigation } from "@/components/learning-navigation";
import { PaidEnrollButton } from "@/components/paid-enroll-button";
import { createSignedThumbnailUrls } from "@/lib/catalog";
import { formatCoursePrice } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Course | PunjabSkillUp",
  robots: { index: false },
};

export default function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="learning-main" aria-live="polite">
          <p className="learning-loading">Loading course...</p>
        </main>
      }
    >
      <CourseContent params={params} />
    </Suspense>
  );
}

async function CourseContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: identifier } = await params;
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      identifier,
    );
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,slug,title,description,price_inr,thumbnail_path")
    .eq(isUuid ? "id" : "slug", identifier)
    .eq("is_published", true)
    .maybeSingle();

  if (courseError) {
    return (
      <CourseError message="We couldn't load this course. Please refresh the page and try again." />
    );
  }

  if (!course) {
    notFound();
  }

  const [
    { data: lectures, error: lecturesError },
    { data: enrollment, error: enrollmentError },
    { urls, error: thumbnailError },
  ] = await Promise.all([
    supabase
      .from("lectures")
      .select("id,title,position")
      .eq("course_id", course.id)
      .eq("is_published", true)
      .order("position", { ascending: true }),
    supabase
      .from("enrollments")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle(),
    createSignedThumbnailUrls(supabase, [course.thumbnail_path]),
  ]);

  if (lecturesError || enrollmentError) {
    return (
      <CourseError message="We couldn't load this course. Please refresh the page and try again." />
    );
  }

  if (thumbnailError) {
    return (
      <CourseError message="We couldn't load the course thumbnail. Please refresh the page and try again." />
    );
  }

  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  const name =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : user.email ?? "Learner";
  const thumbnailUrl = urls[0] ?? null;

  return (
    <>
      <LearningNavigation name={name} />
      <main className="learning-main">
        <section className="course-page-content" aria-labelledby="course-title">
          <Link className="catalog-back-link" href="/explore">
            <ArrowLeft aria-hidden="true" /> Back to courses
          </Link>
          <article className="course-detail-card">
            <div className="course-detail-thumbnail">
              {thumbnailUrl ? (
                <Image
                  alt=""
                  className="catalog-thumbnail-image"
                  fill
                  sizes="(max-width: 767px) 100vw, 42vw"
                  src={thumbnailUrl}
                />
              ) : (
                <div
                  className="catalog-thumbnail-placeholder"
                  role="img"
                  aria-label={`${course.title} thumbnail`}
                >
                  <BookOpen aria-hidden="true" strokeWidth={1.6} />
                </div>
              )}
            </div>
            <div className="course-detail-copy">
              <span className="catalog-badge">{formatCoursePrice(course.price_inr)}</span>
              <h1 id="course-title">{course.title}</h1>
              <p>{course.description}</p>
              {enrollment ? (
                <span className="course-enrolled-label" role="status">
                  You&apos;re enrolled
                </span>
              ) : course.price_inr === 0 ? (
                <EnrollButton courseId={course.id} />
              ) : (
                <PaidEnrollButton
                  courseId={course.id}
                  courseTitle={course.title}
                  priceInr={course.price_inr}
                />
              )}
            </div>
          </article>

          {lectures?.length ? (
            <section className="course-lectures" aria-labelledby="course-lectures-heading">
              <h2 id="course-lectures-heading">Lectures</h2>
              <ol>
                {lectures.map((lecture, index) => (
                  <li key={lecture.id}>
                    <Link href={`/courses/${course.id}/lectures/${lecture.id}`}>
                      <span className="course-lecture-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{lecture.title}</span>
                      <Play aria-hidden="true" />
                      <ArrowRight className="course-lecture-arrow" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : (
            <div className="course-lectures-empty">
              <h2>Lectures are coming soon</h2>
              <p>Check back soon for lessons in this course.</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function CourseError({ message }: { message: string }) {
  return (
    <main className="learning-main">
      <div className="catalog-error" role="alert">
        {message}
      </div>
    </main>
  );
}
