import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function createSignedThumbnailUrls(
  supabase: ServerClient,
  paths: readonly (string | null)[],
) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (uniquePaths.length === 0) {
    return { urls: paths.map(() => null), error: null };
  }

  const { data, error } = await supabase.storage
    .from("course-thumbnails")
    .createSignedUrls(uniquePaths, 3600);

  if (error) {
    return { urls: paths.map(() => null), error: error.message };
  }

  const signedUrls = new Map(
    data.map(({ path, signedUrl, error: pathError }) => [
      path,
      { url: signedUrl, error: pathError },
    ]),
  );
  const results = paths.map((path) =>
    path ? signedUrls.get(path) ?? { url: null, error: "Missing signed URL." } : null,
  );

  return {
    urls: results.map((result) => result?.url ?? null),
    error: results.find((result) => result?.error)?.error ?? null,
  };
}
