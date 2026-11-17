import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export async function createSignedThumbnailUrls(
  supabase: ServerClient,
  paths: readonly (string | null)[],
) {
  const results = await Promise.all(
    paths.map(async (path) => {
      if (!path) {
        return { url: null, error: null };
      }

      const { data, error } = await supabase.storage
        .from("course-thumbnails")
        .createSignedUrl(path, 3600);

      return {
        url: data?.signedUrl ?? null,
        error: error?.message ?? null,
      };
    }),
  );

  return {
    urls: results.map(({ url }) => url),
    error: results.find(({ error }) => error)?.error ?? null,
  };
}
