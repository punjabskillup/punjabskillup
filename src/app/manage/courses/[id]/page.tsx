import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ThumbnailUploader } from "@/components/thumbnail-uploader";
import { ManagePage } from "@/components/manage-page";
import { updateCourseAction, deleteCourseAction } from "@/app/manage/courses/actions";
import { createSignedThumbnailUrls } from "@/lib/catalog";
import { requireAdmin } from "@/lib/auth/require-admin";
import { formatCoursePrice } from "@/lib/courses";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Edit course | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  return (
    <Suspense fallback={<ManagePage><p className="manage-muted">Loading course...</p></ManagePage>}>
      <EditCourseContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function EditCourseContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await connection();
  const { supabase } = await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { data: course, error } = await supabase
    .from("courses")
    .select("id,slug,title,description,price_inr,is_published,thumbnail_path")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <ManagePage>
        <p className="manage-message" role="alert">
          Course details are unavailable. Try again later.
        </p>
      </ManagePage>
    );
  }
  if (!course) {
    notFound();
  }

  const { urls, error: thumbnailError } = await createSignedThumbnailUrls(
    supabase,
    [course.thumbnail_path],
  );

  return (
    <ManagePage>
      <Link className="manage-secondary-link" href="/manage/courses">
        Back to courses
      </Link>
      <header className="manage-heading">
        <span className="manage-eyebrow">EDIT COURSE</span>
        <h1>{course.title}</h1>
        <p>
          {course.slug} · {formatCoursePrice(course.price_inr)}
        </p>
      </header>

      {query.error && (
        <p className="manage-message" role="alert">
          The change could not be completed. Check the fields and try again.
        </p>
      )}
      {query.saved && (
        <p className="manage-message is-success" role="status">
          Course updated.
        </p>
      )}

      {thumbnailError ? (
        <p className="manage-message" role="alert">
          Thumbnail preview is unavailable.
        </p>
      ) : (
        <ThumbnailUploader
          courseId={course.id}
          imageUrl={urls[0] ?? null}
          hasThumbnail={Boolean(course.thumbnail_path)}
        />
      )}

      <form action={updateCourseAction} className="manage-form">
        <input name="course_id" type="hidden" value={course.id} />
        <label className="manage-field">
          Title
          <input
            name="title"
            type="text"
            maxLength={120}
            defaultValue={course.title}
            required
          />
        </label>
        <label className="manage-field">
          Description
          <textarea
            name="description"
            rows={5}
            maxLength={2000}
            defaultValue={course.description}
          />
        </label>
        <label className="manage-field manage-price-field">
          Price (INR)
          <input
            name="price_inr"
            type="number"
            min={0}
            step={1}
            defaultValue={course.price_inr}
            required
          />
          <span>Enter 0 for a free course.</span>
        </label>
        <label className="manage-checkbox">
          <input
            name="is_published"
            type="checkbox"
            defaultChecked={course.is_published}
          />
          <span>Published</span>
        </label>
        <button className="manage-primary-button" type="submit">
          Save course
        </button>
      </form>

      <form action={deleteCourseAction} className="manage-delete-form">
        <input name="course_id" type="hidden" value={course.id} />
        <button className="manage-danger-button" type="submit">
          Delete course
        </button>
      </form>
    </ManagePage>
  );
}
