import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import { AiStudyPanel } from "@/components/ai-study-panel";
import { Navbar } from "@/components/navbar";
import { IconBadge } from "@/components/ui/icon-badge";
import { VideoPlayer } from "@/components/video-player";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Lecture | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string; lectureId: string }>;
}) {
  return (
    <main className="learning-page">
      <Navbar />
      <Suspense
        fallback={
          <section className="lecture-page-content" aria-live="polite">
            <p>Loading lecture...</p>
          </section>
        }
      >
        <LectureContent params={params} />
      </Suspense>
    </main>
  );
}

async function LectureContent({
  params,
}: {
  params: Promise<{ id: string; lectureId: string }>;
}) {
  await connection();
  const { id: courseId, lectureId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,title,price_inr,created_by")
    .eq("id", courseId)
    .maybeSingle();
  const { data: lecture, error: lectureError } = await supabase
    .from("lectures")
    .select("id,title,position,video_provider,video_ref,duration_seconds")
    .eq("id", lectureId)
    .eq("course_id", courseId)
    .maybeSingle();
  const { data: courseLectures, error: courseLecturesError } = await supabase
    .from("lectures")
    .select("id,title,position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (courseError || lectureError || enrollmentError || courseLecturesError) {
    return (
      <div className="database-notice lecture-page-content" role="alert">
        <strong>We couldn&apos;t load this lecture.</strong>
        <p>Check that the course migrations have been applied and try again.</p>
      </div>
    );
  }

  if (!course || !lecture) {
    notFound();
  }

  const instructorName =
    course.created_by === user.id
      ? (user.user_metadata.full_name ?? user.user_metadata.name ?? "Instructor")
      : "Course instructor";

  return (
    <div className="lecture-page-content">
      <div className="lecture-breadcrumbs">
        <Link href="/dashboard">Dashboard</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/courses/${course.id}`}>{course.title}</Link>
      </div>
      <div className="lecture-workspace">
        <div className="lecture-main">
          {enrollment && (course.price_inr === 0 || lecture.video_provider === "bunny") ? (
            <VideoPlayer
              lectureId={lecture.id}
              videoProvider={lecture.video_provider}
              videoRef={lecture.video_ref}
              title={lecture.title}
            />
          ) : enrollment ? (
            <div className="video-unavailable" role="status">
              This paid lecture needs to be migrated to Bunny Stream before it can be watched.
            </div>
          ) : (
            <section className="ai-enrollment-notice">
              <h2>Enroll to watch this lecture</h2>
              <p>
                {course.price_inr > 0
                  ? "Purchase this course to unlock its lectures and AI study tools."
                  : "Enroll in this free course to unlock its lectures and AI study tools."}
              </p>
              <Link className="primary-action" href={`/courses/${course.id}`}>
                View course
              </Link>
            </section>
          )}
          <div className="lecture-heading">
            <span className="eyebrow">{course.title}</span>
            <h1 className="lecture-page-title">{lecture.title}</h1>
            <p>Instructor: {instructorName}</p>
          </div>
          <div className="lecture-footer">
            <span>Lecture {lecture.position}</span>
            <Link href={`/courses/${course.id}`}>View course content</Link>
          </div>
        </div>
        <aside className="lecture-ai-column" id="ai-tools">
          {enrollment ? (
            <Suspense fallback={<p className="ai-panel-loading">Loading study tools...</p>}>
              <AiStudyPanel lectureId={lecture.id} />
            </Suspense>
          ) : (
            <section className="ai-enrollment-notice">
              <IconBadge tone="primary" className="ai-panel-mark">
                <Sparkles className="lucide-icon" strokeWidth={1.8} />
              </IconBadge>
              <h2>Unlock your AI study partner</h2>
              <p>Enroll in this course to get summaries, lecture Q&amp;A, and quizzes.</p>
              <Link className="primary-action" href={`/courses/${course.id}`}>
                View course
              </Link>
            </section>
          )}
          <details className="lecture-list-section lecture-list-collapsible" open>
            <summary>
              <span>
                <span className="eyebrow">COURSE CONTENT</span>
                <strong>Lectures</strong>
              </span>
              <span className="course-count">
                {courseLectures?.length ?? 0} {(courseLectures?.length ?? 0) === 1 ? "lesson" : "lessons"}
              </span>
            </summary>
            {courseLectures && courseLectures.length > 0 ? (
              <ol className="lecture-list">
                {courseLectures.map((item, index) => (
                  <li key={item.id}>
                    <Link
                      className={`lecture-list-link${item.id === lecture.id ? " is-current" : ""}`}
                      href={`/courses/${course.id}/lectures/${item.id}`}
                      aria-current={item.id === lecture.id ? "page" : undefined}
                    >
                      <IconBadge tone="primary" className="lecture-play">
                        <Play className="lucide-icon" strokeWidth={1.8} />
                      </IconBadge>
                      <span className="lecture-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="lecture-title">{item.title}</span>
                      {item.id !== lecture.id && (
                        <span className="lecture-open">
                          Watch <ArrowRight className="lucide-icon" strokeWidth={1.8} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="lecture-list-empty">No lectures are available yet.</p>
            )}
          </details>
        </aside>
      </div>
    </div>
  );
}
