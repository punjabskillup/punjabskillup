"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { consumeAdminRateLimit } from "@/lib/admin/rate-limit";
import {
  InvalidThumbnailError,
  processThumbnail,
} from "@/lib/admin/thumbnail";
import { MAX_THUMBNAIL_BYTES } from "@/lib/admin/thumbnail-constants";
import { requireAdmin } from "@/lib/auth/require-admin";

const courseIdSchema = z.string().uuid();
const courseFieldsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  priceInr: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(1_000_000_000)),
  isPublished: z.boolean(),
});

const uploadSchema = z.object({
  courseId: courseIdSchema,
  file: z.instanceof(File).refine(
    (file) => file.size > 0 && file.size <= MAX_THUMBNAIL_BYTES,
  ),
});

type ThumbnailActionResult = {
  success: boolean;
  message: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseCourseForm(formData: FormData) {
  return courseFieldsSchema.safeParse({
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    priceInr: getString(formData, "price_inr"),
    isPublished: formData.get("is_published") === "on",
  });
}

function makeSlug(title: string) {
  const base =
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 72) || "course";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function isOwnedThumbnailPath(courseId: string, path: string) {
  return (
    path.startsWith(`courses/${courseId}/`) &&
    !path.split("/").some((segment) => segment === "." || segment === "..")
  );
}

async function canPerformAdminAction(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
) {
  return consumeAdminRateLimit(supabase, "admin-actions");
}

export async function createCourseAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  if (!(await canPerformAdminAction(supabase))) {
    redirect("/manage/courses/new?error=unavailable");
  }

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    redirect("/manage/courses/new?error=invalid");
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      slug: makeSlug(parsed.data.title),
      title: parsed.data.title,
      description: parsed.data.description,
      price_inr: parsed.data.priceInr,
      is_published: parsed.data.isPublished,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("Admin course creation failed.", error?.message);
    redirect("/manage/courses/new?error=save");
  }

  revalidatePath("/explore");
  redirect(`/manage/courses/${data.id}`);
}

export async function updateCourseAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = courseIdSchema.safeParse(getString(formData, "course_id"));
  if (!courseId.success) {
    redirect("/manage/courses?error=invalid");
  }

  if (!(await canPerformAdminAction(supabase))) {
    redirect(`/manage/courses/${courseId.data}?error=unavailable`);
  }

  const parsed = parseCourseForm(formData);
  if (!parsed.success) {
    redirect(`/manage/courses/${courseId.data}?error=invalid`);
  }

  const { data, error } = await supabase
    .from("courses")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      price_inr: parsed.data.priceInr,
      is_published: parsed.data.isPublished,
    })
    .eq("id", courseId.data)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Admin course update failed.", error?.message);
    redirect(`/manage/courses/${courseId.data}?error=save`);
  }

  revalidatePath("/explore");
  revalidatePath(`/courses/${courseId.data}`);
  redirect(`/manage/courses/${courseId.data}?saved=1`);
}

export async function deleteCourseAction(formData: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = courseIdSchema.safeParse(getString(formData, "course_id"));
  if (!courseId.success) {
    redirect("/manage/courses?error=invalid");
  }

  if (!(await canPerformAdminAction(supabase))) {
    redirect(`/manage/courses/${courseId.data}?error=unavailable`);
  }

  const { data: course, error: lookupError } = await supabase
    .from("courses")
    .select("thumbnail_path")
    .eq("id", courseId.data)
    .maybeSingle();

  if (lookupError || !course) {
    console.error("Admin course deletion lookup failed.", lookupError?.message);
    redirect(`/manage/courses/${courseId.data}?error=delete`);
  }

  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId.data)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    console.error("Admin course deletion failed.", error?.message);
    redirect(`/manage/courses/${courseId.data}?error=delete`);
  }

  let cleanupFailed = false;
  if (course.thumbnail_path) {
    if (!isOwnedThumbnailPath(courseId.data, course.thumbnail_path)) {
      cleanupFailed = true;
    } else {
      const { error: storageError } = await supabase.storage
        .from("course-thumbnails")
        .remove([course.thumbnail_path]);
      if (storageError) {
        console.error("Admin course thumbnail cleanup failed.", storageError.message);
        cleanupFailed = true;
      }
    }
  }

  revalidatePath("/explore");
  redirect(cleanupFailed ? "/manage/courses?notice=cleanup" : "/manage/courses");
}

export async function uploadCourseThumbnailAction(
  formData: FormData,
): Promise<ThumbnailActionResult> {
  const { supabase } = await requireAdmin();
  if (!(await canPerformAdminAction(supabase))) {
    return { success: false, message: "Request limit reached. Try again shortly." };
  }

  const parsed = uploadSchema.safeParse({
    courseId: getString(formData, "course_id"),
    file: formData.get("file"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Choose a JPEG, PNG, or WebP image up to 3 MB.",
    };
  }

  const { courseId, file } = parsed.data;
  const { data: course, error: lookupError } = await supabase
    .from("courses")
    .select("thumbnail_path")
    .eq("id", courseId)
    .maybeSingle();

  if (lookupError || !course) {
    console.error("Admin thumbnail course lookup failed.", lookupError?.message);
    return { success: false, message: "Thumbnail upload failed." };
  }
  if (
    course.thumbnail_path &&
    !isOwnedThumbnailPath(courseId, course.thumbnail_path)
  ) {
    return { success: false, message: "Thumbnail upload failed." };
  }

  let output: Buffer;
  try {
    output = await processThumbnail(file);
  } catch (error) {
    if (!(error instanceof InvalidThumbnailError)) {
      console.error("Admin thumbnail processing failed.", error);
    }
    return {
      success: false,
      message: "Choose a valid JPEG, PNG, or WebP image up to 3 MB.",
    };
  }

  const newPath = `courses/${courseId}/${crypto.randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("course-thumbnails")
    .upload(newPath, output, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Admin thumbnail storage upload failed.", uploadError.message);
    return { success: false, message: "Thumbnail upload failed." };
  }

  const { data: updatedCourse, error: updateError } = await supabase
    .from("courses")
    .update({ thumbnail_path: newPath })
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedCourse) {
    console.error("Admin thumbnail path update failed.", updateError?.message);
    const { error: cleanupError } = await supabase.storage
      .from("course-thumbnails")
      .remove([newPath]);
    if (cleanupError) {
      console.error("Admin failed-thumbnail cleanup failed.", cleanupError.message);
    }
    return { success: false, message: "Thumbnail upload failed." };
  }

  if (course.thumbnail_path) {
    const { error: removeError } = await supabase.storage
      .from("course-thumbnails")
      .remove([course.thumbnail_path]);
    if (removeError) {
      console.error("Previous thumbnail cleanup failed.", removeError.message);
      revalidatePath("/explore");
      revalidatePath(`/courses/${courseId}`);
      return {
        success: true,
        message: "Thumbnail updated. Previous image cleanup is pending.",
      };
    }
  }

  revalidatePath("/explore");
  revalidatePath(`/courses/${courseId}`);
  return { success: true, message: "Thumbnail updated." };
}

export async function removeCourseThumbnailAction(
  courseIdValue: string,
): Promise<ThumbnailActionResult> {
  const { supabase } = await requireAdmin();
  if (!(await canPerformAdminAction(supabase))) {
    return { success: false, message: "Request limit reached. Try again shortly." };
  }

  const parsedId = courseIdSchema.safeParse(courseIdValue);
  if (!parsedId.success) {
    return { success: false, message: "Thumbnail removal failed." };
  }

  const courseId = parsedId.data;
  const { data: course, error: lookupError } = await supabase
    .from("courses")
    .select("thumbnail_path")
    .eq("id", courseId)
    .maybeSingle();

  if (lookupError || !course) {
    console.error("Admin thumbnail removal lookup failed.", lookupError?.message);
    return { success: false, message: "Thumbnail removal failed." };
  }
  if (!course.thumbnail_path) {
    return { success: true, message: "No thumbnail is set." };
  }
  if (!isOwnedThumbnailPath(courseId, course.thumbnail_path)) {
    return { success: false, message: "Thumbnail removal failed." };
  }

  const { data: updatedCourse, error: updateError } = await supabase
    .from("courses")
    .update({ thumbnail_path: null })
    .eq("id", courseId)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedCourse) {
    console.error("Admin thumbnail path removal failed.", updateError?.message);
    return { success: false, message: "Thumbnail removal failed." };
  }

  const { error: removeError } = await supabase.storage
    .from("course-thumbnails")
    .remove([course.thumbnail_path]);

  revalidatePath("/explore");
  revalidatePath(`/courses/${courseId}`);

  if (removeError) {
    console.error("Admin thumbnail storage removal failed.", removeError.message);
    return {
      success: false,
      message: "Thumbnail removed from the course. File cleanup is pending.",
    };
  }

  return { success: true, message: "Thumbnail removed." };
}
