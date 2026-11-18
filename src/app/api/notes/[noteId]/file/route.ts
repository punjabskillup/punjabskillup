import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getR2Bucket, getR2Client } from "@/lib/cloudflare/r2";
import { canAccessNote } from "@/lib/notes/access";
import { sanitizeNoteFileName } from "@/lib/notes/files";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const noteIdSchema = z.string().uuid();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const { noteId: noteIdValue } = await params;
  const noteId = noteIdSchema.safeParse(noteIdValue);
  if (!noteId.success) {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return new NextResponse("Sign in to access this note.", {
      status: 401,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { data: note, error: noteError } = await supabase
    .from("notes")
    .select("id,course_id,is_free,is_published,file_path,file_name,content_type")
    .eq("id", noteId.data)
    .maybeSingle();
  if (noteError) {
    console.error("Note download lookup failed.", noteError.message);
    return new NextResponse("Note download is unavailable.", { status: 503 });
  }
  if (!note?.file_path || !note.file_name || !note.content_type) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    if (!(await canAccessNote(supabase, user.id, note))) {
      return new NextResponse("You do not have access to this note.", {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      });
    }
  } catch (error) {
    console.error("Note download authorization failed.", error);
    return new NextResponse("Unable to verify note access.", { status: 503 });
  }

  try {
    const result = await getR2Client().send(
      new GetObjectCommand({
        Bucket: getR2Bucket(),
        Key: note.file_path,
      }),
    );
    if (!result.Body) {
      return new NextResponse("Note file is unavailable.", { status: 502 });
    }

    const fileName = sanitizeNoteFileName(note.file_name);
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": note.content_type,
      "X-Content-Type-Options": "nosniff",
    });
    if (result.ContentLength !== undefined) {
      headers.set("Content-Length", String(result.ContentLength));
    }
    return new Response(result.Body.transformToWebStream(), { headers });
  } catch (error) {
    console.error("Cloudflare R2 note download failed.", error);
    return new NextResponse("Note file is unavailable.", { status: 502 });
  }
}
