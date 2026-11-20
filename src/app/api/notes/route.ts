import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { consumeAdminRateLimit } from "@/lib/admin/rate-limit";
import { getR2Bucket, getR2Client } from "@/lib/cloudflare/r2";
import {
  getNoteFileType,
  MAX_NOTE_FILE_BYTES,
  sanitizeNoteFileName,
} from "@/lib/notes/files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const courseIdSchema = z.string().uuid();
const titleSchema = z.string().trim().min(1).max(120);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_NOTE_FILE_BYTES + 128 * 1024) {
    return errorResponse("Choose a file up to 20 MB.", 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse("The upload could not be read.", 400);
  }

  const courseId = courseIdSchema.safeParse(getString(formData, "course_id"));
  const title = titleSchema.safeParse(getString(formData, "title"));
  const isFreeValue = getString(formData, "is_free");
  const isPublishedValue = getString(formData, "is_published");
  const file = formData.get("file");

  if (!courseId.success || !title.success) {
    return errorResponse("Choose a course and enter a note title.", 400);
  }
  if (!["true", "false"].includes(isFreeValue)) {
    return errorResponse("Choose who can access this note.", 400);
  }
  if (!(file instanceof File) || file.size === 0) {
    return errorResponse("Choose a PDF, DOC, or DOCX file.", 400);
  }
  if (file.size > MAX_NOTE_FILE_BYTES) {
    return errorResponse("Choose a file up to 20 MB.", 413);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return errorResponse("Sign in to upload notes.", 401);
  }

  const [
    { data: profile, error: profileError },
    { data: isAdmin, error: adminError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.rpc("is_admin"),
  ]);
  if (profileError || adminError) {
    console.error("Note uploader access check failed.", profileError?.message, adminError?.message);
    return errorResponse("Unable to verify your upload access.", 503);
  }
  if (!isAdmin && !["instructor", "admin"].includes(profile?.role ?? "")) {
    return errorResponse("Instructor access is required to upload notes.", 403);
  }

  if (isAdmin) {
    const rateLimitError = await consumeAdminRateLimit(supabase, "admin-actions");
    if (rateLimitError !== true) {
      return errorResponse("Request limit reached. Try again shortly.", 429);
    }
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,created_by")
    .eq("id", courseId.data)
    .maybeSingle();
  if (courseError) {
    console.error("Note upload course lookup failed.", courseError.message);
    return errorResponse("Unable to verify the selected course.", 503);
  }
  if (!course || (!isAdmin && course.created_by !== user.id)) {
    return errorResponse("Choose a course you are allowed to manage.", 403);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileType = getNoteFileType(file.name, bytes);
  if (!fileType) {
    return errorResponse("The file must be a valid PDF, DOC, or DOCX document.", 400);
  }

  const fileName = sanitizeNoteFileName(file.name);
  const objectKey = `notes/${courseId.data}/${crypto.randomUUID()}${fileType.extension}`;
  let bucket: string;
  let r2: ReturnType<typeof getR2Client>;
  try {
    bucket = getR2Bucket();
    r2 = getR2Client();
  } catch (error) {
    console.error("Cloudflare R2 is not configured.", error);
    return errorResponse("Note storage is not configured.", 503);
  }

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: bytes,
        ContentLength: bytes.byteLength,
        ContentType: fileType.contentType,
      }),
    );
  } catch (error) {
    const r2Error = error as {
      name?: unknown;
      message?: unknown;
      Code?: unknown;
      code?: unknown;
      $metadata?: { httpStatusCode?: unknown };
    };
    const errorName = typeof r2Error.name === "string" ? r2Error.name : "R2Error";
    const errorCode =
      typeof r2Error.Code === "string"
        ? r2Error.Code
        : typeof r2Error.code === "string"
          ? r2Error.code
          : "unknown code";
    const errorMessage =
      typeof r2Error.message === "string" ? r2Error.message : "Unknown R2 upload error";
    const statusCode = r2Error.$metadata?.httpStatusCode;
    console.error(
      "Cloudflare R2 note upload failed.",
      `${errorName}; code=${errorCode}; status=${String(statusCode ?? "unknown")}; message=${errorMessage}`,
    );
    return errorResponse(
      process.env.NODE_ENV === "development"
        ? `R2 upload failed: ${errorName} (${errorCode}, HTTP ${String(statusCode ?? "unknown")}) — ${errorMessage}`
        : "The file could not be uploaded. Try again later.",
      502,
    );
  }

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .insert({
      course_id: courseId.data,
      title: title.data,
      body: null,
      file_path: objectKey,
      file_name: fileName,
      file_size_bytes: bytes.byteLength,
      content_type: fileType.contentType,
      is_free: isFreeValue === "true",
      is_published: isPublishedValue === "on",
    })
    .select("id")
    .single();

  if (noteError || !note) {
    console.error("Note record creation failed.", noteError?.message);
    try {
      await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    } catch (cleanupError) {
      console.error("Failed to clean up an unlinked R2 note file.", cleanupError);
    }
    return errorResponse("The file uploaded, but the note could not be saved.", 500);
  }

  return NextResponse.json(
    { id: note.id, url: `/notes/${note.id}` },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
