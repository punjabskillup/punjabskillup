import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  House,
  MessageCircleQuestion,
  Sparkles,
  UserRound,
} from "lucide-react";
import { CourseCard } from "@/components/course-card";
import { Navbar } from "@/components/navbar";
import { GlassCard } from "@/components/ui/glass-card";
import { IconBadge } from "@/components/ui/icon-badge";
import type { CourseWithLectures } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return (
    <main className="learning-page">
      <Navbar />
      <Suspense
        fallback={
          <section className="dashboard-content" aria-live="polite">
            <p>Loading your learning space...</p>
          </section>
        }
      >
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const [coursesResult, enrollmentResult, profileResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id,title,description,thumbnail_url,price_inr,is_published,created_by,created_at,lectures(id,title,position)")
      .eq("is_published", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("enrollments")
      .select("course_id,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  const name =
    user.user_metadata.full_name ??
    user.user_metadata.name ??
    user.email ??
    "learner";
  const firstName =
    typeof name === "string" && name.trim()
      ? name.trim().split(/\s+/)[0].split("@")[0]
      : "learner";

  const courses = (coursesResult.data ?? []) as CourseWithLectures[];
  const enrollments = enrollmentResult.data ?? [];
  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const enrolledCourses = enrollments
    .map((enrollment) => coursesById.get(enrollment.course_id))
    .filter((course): course is CourseWithLectures => Boolean(course));
  const enrolledCourseIds = new Set(enrolledCourses.map((course) => course.id));
  const exploreCourses = courses.filter((course) => !enrolledCourseIds.has(course.id));
  const firstCourse = enrolledCourses.find((course) => course.lectures.length > 0);
  const firstLecture = firstCourse?.lectures[0];
  const isEditor =
    profileResult.data?.role === "instructor" || profileResult.data?.role === "admin";

  return (
    <div className="dashboard-content" id="dashboard-top">
      <section className="dashboard-intro bg-hero" aria-labelledby="dashboard-welcome">
        <svg
          className="dashboard-intro-arrow hidden md:block"
          viewBox="0 0 800 600"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="dashboard-arrow-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(35,71,213,0.035)" />
              <stop offset="100%" stopColor="rgba(35,71,213,0.18)" />
            </linearGradient>
          </defs>
          <path
            d="M40 550 C190 520 230 420 340 385 S520 240 700 75 M575 70 L700 75 L695 200"
            fill="none"
            stroke="url(#dashboard-arrow-gradient)"
            strokeWidth="64"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div>
          <span className="eyebrow">YOUR LEARNING SPACE</span>
          <h1 id="dashboard-welcome">Welcome back, {firstName}</h1>
          <p>Your next step toward a skill you can use every day.</p>
        </div>
        {isEditor && (
          <Link className="secondary-action" href="/instructor">
            Instructor tools
          </Link>
        )}
      </section>

      {coursesResult.error || enrollmentResult.error || profileResult.error ? (
        <div className="database-notice" role="alert">
          <strong>We couldn&apos;t load your learning space.</strong>
          <p>
            Apply the Supabase migrations and seed data described in the README, then
            refresh this page.
          </p>
        </div>
      ) : (
        <>
          <section className="continue-section" aria-labelledby="continue-heading">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">PICK UP WHERE YOU LEFT OFF</span>
                <h2 id="continue-heading">Continue learning</h2>
              </div>
            </div>
            {enrolledCourses.length > 0 ? (
              <div className="continue-row">
                {enrolledCourses.slice(0, 3).map((course) => (
                  <GlassCard className="dashboard-continue-card" key={course.id}>
                    <Link
                      className="dashboard-continue-link"
                      href={`/courses/${course.id}${course.lectures[0] ? `/lectures/${course.lectures[0].id}` : ""}`}
                    >
                      <div
                        className={`course-thumbnail dashboard-continue-thumbnail${course.thumbnail_url ? " has-thumbnail" : ""}`}
                      >
                        {course.thumbnail_url ? (
                          <Image
                            className="course-thumbnail-image"
                            src={course.thumbnail_url}
                            alt=""
                            fill
                            sizes="(max-width: 767px) 78vw, 33vw"
                            unoptimized
                          />
                        ) : (
                          <span className="thumbnail-mark"><span /><span /><span /></span>
                        )}
                      </div>
                      <div className="dashboard-continue-copy">
                        <h3>{course.title}</h3>
                        <div
                          className="dashboard-progress"
                          role="progressbar"
                          aria-label={`${course.title} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={0}
                        >
                          <span />
                        </div>
                        <div className="dashboard-continue-actions">
                          <span>Ready to resume</span>
                          <span className="dashboard-resume-button">Resume</span>
                        </div>
                      </div>
                    </Link>
                  </GlassCard>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <h3>Your next skill starts here</h3>
                <p>Choose a course and continue learning at your own pace.</p>
                <a className="primary-action" href="#explore-courses">Explore courses</a>
              </div>
            )}
          </section>

          <section className="dashboard-library" id="my-courses" aria-labelledby="my-courses-heading">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">YOUR LEARNING</span>
                <h2 id="my-courses-heading">My courses</h2>
              </div>
              <span className="course-count">
                {enrolledCourses.length} {enrolledCourses.length === 1 ? "course" : "courses"}
              </span>
            </div>
            {enrolledCourses.length > 0 ? (
              <div className="course-grid">
                {enrolledCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <h3>You haven&apos;t joined a course yet</h3>
                <p>Browse the course library and find a skill to start building.</p>
                <a className="primary-action" href="#explore-courses">Explore courses</a>
              </div>
            )}
          </section>

          <section className="dashboard-library" id="explore-courses" aria-labelledby="explore-courses-heading">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">EXPLORE AND GROW</span>
                <h2 id="explore-courses-heading">Explore courses</h2>
              </div>
              <span className="course-count">
                {exploreCourses.length} {exploreCourses.length === 1 ? "course" : "courses"}
              </span>
            </div>
            {exploreCourses.length > 0 ? (
              <div className="course-grid">
                {exploreCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <h3>You&apos;re all caught up</h3>
                <p>There are no new courses to explore right now. Check back soon.</p>
                <Link className="primary-action" href="/">Back to home</Link>
              </div>
            )}
          </section>

          <section className="ask-ai-entry" id="ask-ai" aria-labelledby="ask-ai-heading">
            <IconBadge tone="primary" className="ask-ai-icon">
              <Sparkles className="lucide-icon" strokeWidth={1.8} />
            </IconBadge>
            <div>
              <span className="eyebrow">A QUESTION? ASK AWAY.</span>
              <h2 id="ask-ai-heading">Your AI study partner is in every lecture</h2>
              <p>Summarise the lesson, ask a question or practise with a quiz.</p>
            </div>
            {firstLecture ? (
              <Link
                className="primary-action"
                href={`/courses/${firstCourse.id}/lectures/${firstLecture.id}?tab=ask#ai-tools`}
              >
                Ask AI
              </Link>
            ) : (
              <a className="primary-action" href="#explore-courses">Explore courses</a>
            )}
          </section>
        </>
      )}
      {!coursesResult.error && !enrollmentResult.error && !profileResult.error && (
        <nav className="dashboard-tab-bar" aria-label="Dashboard">
          <Link className="dashboard-tab active" href="#dashboard-top">
            <House aria-hidden="true" strokeWidth={1.8} />
            <span>Home</span>
          </Link>
          <Link className="dashboard-tab" href="#my-courses">
            <BookOpen aria-hidden="true" strokeWidth={1.8} />
            <span>My courses</span>
          </Link>
          {firstLecture ? (
            <Link
              className="dashboard-tab"
              href={`/courses/${firstCourse.id}/lectures/${firstLecture.id}?tab=ask#ai-tools`}
            >
              <MessageCircleQuestion aria-hidden="true" strokeWidth={1.8} />
              <span>Ask AI</span>
            </Link>
          ) : (
            <Link className="dashboard-tab" href="#ask-ai">
              <MessageCircleQuestion aria-hidden="true" strokeWidth={1.8} />
              <span>Ask AI</span>
            </Link>
          )}
          <Link className="dashboard-tab" href="#profile">
            <UserRound aria-hidden="true" strokeWidth={1.8} />
            <span>Profile</span>
          </Link>
        </nav>
      )}
    </div>
  );
}
