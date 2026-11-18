import "server-only";

import type { createClient } from "@/lib/supabase/server";

export type NoteAccessRecord = {
  course_id: string | null;
  is_free: boolean;
  is_published: boolean;
};

export async function canAccessNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  note: NoteAccessRecord,
) {
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError) {
    throw new Error("Unable to verify note access.");
  }
  if (isAdmin) {
    return true;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) {
    throw new Error("Unable to verify note access.");
  }

  let ownsCourse = false;
  if (note.course_id && ["instructor", "admin"].includes(profile?.role ?? "")) {
    const { data: course, error: courseError } = await supabase
      .from("courses")
      .select("created_by")
      .eq("id", note.course_id)
      .maybeSingle();
    if (courseError) {
      throw new Error("Unable to verify note access.");
    }
    ownsCourse = course?.created_by === userId;
  }

  if (ownsCourse) {
    return true;
  }
  if (!note.is_published) {
    return false;
  }
  if (note.is_free) {
    return true;
  }
  if (!note.course_id) {
    return false;
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId)
    .eq("course_id", note.course_id)
    .maybeSingle();
  if (enrollmentError) {
    throw new Error("Unable to verify note access.");
  }
  return Boolean(enrollment);
}
