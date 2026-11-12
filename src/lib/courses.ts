export type Course = {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string | null;
  price_inr: number;
  is_published: boolean;
  created_by: string;
  created_at: string;
};

export type Lecture = {
  id: string;
  course_id: string;
  title: string;
  position: number;
  video_provider: string;
  video_ref: string;
  duration_seconds: number | null;
  created_at: string;
};

export type CourseWithLectures = Course & { lectures: Pick<Lecture, "id" | "title" | "position">[] };

export function formatCoursePrice(priceInr: number) {
  return priceInr === 0
    ? "Free"
    : `₹${new Intl.NumberFormat("en-IN").format(priceInr)}`;
}

export function getYouTubeVideoId(videoRef: string) {
  const value = videoRef.trim();
  if (/^[\w-]{11}$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    let videoId: string | null = null;

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      const pathParts = url.pathname.split("/").filter(Boolean);
      videoId =
        url.searchParams.get("v") ??
        (["embed", "shorts", "live"].includes(pathParts[0] ?? "")
          ? pathParts[1] ?? null
          : null);
    }

    return videoId && /^[\w-]{11}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function getBunnyVideoId(videoRef: string) {
  const value = videoRef.trim();
  const idPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (idPattern.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    if (url.hostname !== "iframe.mediadelivery.net") {
      return null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[0] === "embed" ? parts[2] : null;
    return id && idPattern.test(id) ? id : null;
  } catch {
    return null;
  }
}
