import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getBunnyVideoId } from "@/lib/courses";
import { createClient } from "@/lib/supabase/server";

const TOKEN_LIFETIME_SECONDS = 60 * 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lectureId: string }> },
) {
  try {
    const { lectureId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in to watch this lecture." }, { status: 401 });
    }

    const { data: lecture, error: lectureError } = await supabase
      .from("lectures")
      .select("id,course_id,video_provider,video_ref")
      .eq("id", lectureId)
      .maybeSingle();
    if (lectureError) {
      throw lectureError;
    }
    if (!lecture) {
      return NextResponse.json({ error: "Lecture not found." }, { status: 404 });
    }
    if (lecture.video_provider !== "bunny") {
      return NextResponse.json({ error: "This lecture does not use Bunny Stream." }, { status: 400 });
    }

    const { data: enrollment, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("course_id", lecture.course_id)
      .maybeSingle();
    if (enrollmentError) {
      throw enrollmentError;
    }
    if (!enrollment) {
      return NextResponse.json({ error: "Enroll in this course to watch the lecture." }, { status: 403 });
    }

    const videoId = getBunnyVideoId(lecture.video_ref);
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID;
    const tokenAuthKey = process.env.BUNNY_STREAM_TOKEN_AUTH_KEY;
    if (!videoId || !libraryId || !tokenAuthKey) {
      console.error("Bunny Stream video access is not configured correctly.");
      return NextResponse.json({ error: "Secure video playback is not configured." }, { status: 503 });
    }

    const expires = Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS;
    const token = createHash("sha256")
      .update(`${tokenAuthKey}${videoId}${expires}`)
      .digest("hex");
    const url = new URL(
      `/embed/${encodeURIComponent(libraryId)}/${encodeURIComponent(videoId)}`,
      "https://iframe.mediadelivery.net",
    );
    url.searchParams.set("token", token);
    url.searchParams.set("expires", String(expires));

    return NextResponse.json(
      { url: url.toString(), expires },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch (error) {
    console.error(
      "Could not create Bunny Stream playback URL:",
      error instanceof Error ? error.message : "Unknown video error",
    );
    return NextResponse.json({ error: "Unable to prepare this video." }, { status: 500 });
  }
}
