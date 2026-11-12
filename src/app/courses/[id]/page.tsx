import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Play, Sparkles } from "lucide-react";
import { EnrollButton } from "@/components/enroll-button";
import { PaidEnrollButton } from "@/components/paid-enroll-button";
import { Navbar } from "@/components/navbar";
import { IconBadge } from "@/components/ui/icon-badge";
import type { CourseWithLectures } from "@/lib/courses";
import { formatCoursePrice } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Course | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default async function CoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="learning-page">
      <Navbar />
      <Suspense
        fallback={
          <section className="course-detail-content" aria-live="polite">
            <p>Loading course...</p>
          </section>
        }
      >
        <CourseContent params={params} />
      </Suspense>
    </main>
  );
}

async function CourseContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id: courseId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const { data, error } = await supabase
    .from("courses")
    .select("id,title,description,thumbnail_url,price_inr,is_published,created_by,created_at,lectures(id,title,position,video_provider,video_ref,duration_seconds,created_at)")
    .eq("id", courseId)
    .maybeSingle();

  if (error) {
    return (
      <div className="database-notice course-detail-content" role="alert">
        <strong>We couldn&apos;t load this course.</strong>
        <p>Check that the course migrations have been applied and try again.</p>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  const course = data as CourseWithLectures;
  const lectures = [...course.lectures].sort((a, b) => a.position - b.position);
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("created_at")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  if (enrollmentError) {
    return (
      <div className="database-notice course-detail-content" role="alert">
        <strong>We couldn&apos;t check your enrollment.</strong>
        <p>Please refresh this page and try again.</p>
      </div>
    );
  }

  return (
    <div className="course-detail-content">
      <Link className="back-link" href="/dashboard">
        <ArrowLeft className="lucide-icon" strokeWidth={1.8} /> Back to courses
      </Link>
      <section className="course-overview">
        <div className="course-overview-copy">
          <span className="eyebrow">COURSE OVERVIEW</span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="course-overview-meta">
            <span>{lectures.length} {lectures.length === 1 ? "lecture" : "lectures"}</span>
            <span className="price-badge">{formatCoursePrice(course.price_inr)}</span>
          </div>
          {enrollment ? (
            <span className="enrolled-label" role="status">You&apos;re enrolled</span>
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
        <div
          className={`course-overview-art${course.thumbnail_url ? " has-thumbnail" : ""}`}
        >
          {course.thumbnail_url ? (
            <Image
              className="course-overview-image"
              src={course.thumbnail_url}
              alt={`${course.title} course`}
              fill
              sizes="(max-width: 680px) 100vw, 40vw"
              unoptimized
            />
          ) : (
            <Sparkles className="lucide-icon" strokeWidth={1.8} aria-hidden="true" />
          )}
        </div>
      </section>

      <section className="lecture-list-section" aria-labelledby="lectures-heading">
        <div className="section-title-row">
          <div>
            <span className="eyebrow">COURSE CONTENT</span>
            <h2 id="lectures-heading">Lectures</h2>
          </div>
          <span className="course-count">
            {lectures.length} {lectures.length === 1 ? "lesson" : "lessons"}
          </span>
        </div>
        {lectures.length > 0 ? (
          <ol className="lecture-list">
            {lectures.map((lecture, index) => (
              <li key={lecture.id}>
                <Link
                  className="lecture-list-link"
                  href={`/courses/${course.id}/lectures/${lecture.id}`}
                >
                  <IconBadge tone="primary" className="lecture-play">
                    <Play className="lucide-icon" strokeWidth={1.8} />
                  </IconBadge>
                  <span className="lecture-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lecture-title">{lecture.title}</span>
                  <span className="lecture-open">
                    Watch lecture <ArrowRight className="lucide-icon" strokeWidth={1.8} />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        ) : (
          <div className="library-empty">
            <h3>Lectures are being prepared</h3>
            <p>Check back soon for the first lesson in this course.</p>
          </div>
        )}
      </section>
    </div>
  );
}
