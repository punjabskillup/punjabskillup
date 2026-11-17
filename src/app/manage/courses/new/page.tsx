import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { ManagePage } from "@/components/manage-page";
import { createCourseAction } from "@/app/manage/courses/actions";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create course | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default function NewCoursePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense fallback={<ManagePage><p className="manage-muted">Loading course form...</p></ManagePage>}>
      <NewCourseContent searchParams={searchParams} />
    </Suspense>
  );
}

async function NewCourseContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  await requireAdmin();
  const params = await searchParams;

  return (
    <ManagePage>
      <Link className="manage-secondary-link" href="/manage/courses">
        Back to courses
      </Link>
      <header className="manage-heading">
        <span className="manage-eyebrow">NEW COURSE</span>
        <h1>Create a course</h1>
      </header>
      {params.error && (
        <p className="manage-message" role="alert">
          Course could not be saved. Check the fields and try again.
        </p>
      )}
      <form action={createCourseAction} className="manage-form">
        <label className="manage-field">
          Title
          <input name="title" type="text" maxLength={120} required />
        </label>
        <label className="manage-field">
          Description
          <textarea name="description" rows={5} maxLength={2000} />
        </label>
        <label className="manage-field manage-price-field">
          Price (INR)
          <input name="price_inr" type="number" min={0} step={1} defaultValue={0} required />
          <span>Enter 0 for a free course.</span>
        </label>
        <label className="manage-checkbox">
          <input name="is_published" type="checkbox" />
          <span>Publish course</span>
        </label>
        <button className="manage-primary-button" type="submit">
          Create course
        </button>
      </form>
    </ManagePage>
  );
}
