import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstructorWorkspace } from "@/components/instructor-workspace";
import { Navbar } from "@/components/navbar";
import type { CourseWithLectures } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Instructor workspace | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default function InstructorPage() {
  return (
    <main className="learning-page">
      <Navbar />
      <Suspense
        fallback={
          <section className="instructor-content" aria-live="polite">
            <p>Loading instructor tools...</p>
          </section>
        }
      >
        <InstructorContent />
      </Suspense>
    </main>
  );
}

async function InstructorContent() {
  await connection();
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <section className="instructor-content">
        <div className="database-notice" role="alert">
          <strong>We couldn&apos;t verify your instructor access.</strong>
          <p>Check that the profile migration has been applied, then try again.</p>
        </div>
      </section>
    );
  }

  if (!profile || !["instructor", "admin"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const { data, error } = await supabase
    .from("courses")
    .select("id,title,description,thumbnail_url,price_inr,is_published,created_by,created_at,lectures(id,title,position)")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <section className="instructor-content">
      <div className="instructor-heading">
        <span className="eyebrow">INSTRUCTOR SPACE</span>
        <h1>Create a course</h1>
        <p>Build your course library and add YouTube lectures for learners.</p>
      </div>
      {error ? (
        <div className="database-notice" role="alert">
          <strong>We couldn&apos;t load your courses.</strong>
          <p>Check that the course migrations have been applied and try again.</p>
        </div>
      ) : (
        <InstructorWorkspace courses={(data ?? []) as CourseWithLectures[]} />
      )}
    </section>
  );
}
