import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ManagePage } from "@/components/manage-page";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCoursePrice } from "@/lib/courses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Manage courses | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default function ManageCoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  return (
    <Suspense fallback={<ManagePage><p className="manage-muted">Loading courses...</p></ManagePage>}>
      <ManageCoursesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ManageCoursesContent({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  await connection();
  const { supabase } = await requireAdmin();
  const params = await searchParams;
  const { data: courses, error } = await supabase
    .from("courses")
    .select("id,slug,title,price_inr,is_published,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <ManagePage>
        <p className="manage-message" role="alert">
          Courses are unavailable. Try again later.
        </p>
      </ManagePage>
    );
  }

  return (
    <ManagePage>
      <header className="manage-heading">
        <span className="manage-eyebrow">ADMINISTRATION</span>
        <h1>Courses</h1>
        <p>Manage course details, publishing, pricing and thumbnails.</p>
        <Link className="manage-primary-link" href="/manage/courses/new">
          Create course
        </Link>
      </header>

      {params.notice === "cleanup" && (
        <p className="manage-message" role="status">
          Course deleted. Thumbnail file cleanup is pending.
        </p>
      )}

      {courses?.length ? (
        <div className="manage-table-wrap">
          <table className="manage-table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Status</th>
                <th scope="col">Price</th>
                <th scope="col"><span className="visually-hidden">Edit</span></th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <th scope="row">{course.title}</th>
                  <td>
                    <span
                      className={`manage-status${course.is_published ? " is-published" : ""}`}
                    >
                      {course.is_published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td>{formatCoursePrice(course.price_inr)}</td>
                  <td>
                    <Link
                      className="manage-table-link"
                      href={`/manage/courses/${course.id}`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="manage-empty">
          <h2>No courses yet</h2>
          <p>Create a course to begin building the catalog.</p>
        </div>
      )}
    </ManagePage>
  );
}
