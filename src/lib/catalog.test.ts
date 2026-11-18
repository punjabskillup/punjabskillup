import { describe, expect, it, vi } from "vitest";
import type { createClient } from "@/lib/supabase/server";
import { createSignedThumbnailUrls } from "@/lib/catalog";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

describe("signed course thumbnails", () => {
  it("requests unique paths in one batch and preserves null entries", async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [
        { path: "course/a.webp", signedUrl: "https://signed/a", error: null },
        { path: "course/b.webp", signedUrl: "https://signed/b", error: null },
      ],
      error: null,
    });
    const supabase = {
      storage: {
        from: vi.fn(() => ({ createSignedUrls })),
      },
    } as unknown as ServerClient;

    const result = await createSignedThumbnailUrls(supabase, [
      "course/a.webp",
      null,
      "course/b.webp",
      "course/a.webp",
    ]);

    expect(createSignedUrls).toHaveBeenCalledOnce();
    expect(createSignedUrls).toHaveBeenCalledWith(
      ["course/a.webp", "course/b.webp"],
      3600,
    );
    expect(result).toEqual({
      urls: ["https://signed/a", null, "https://signed/b", "https://signed/a"],
      error: null,
    });
  });

  it("surfaces an individual signing failure", async () => {
    const createSignedUrls = vi.fn().mockResolvedValue({
      data: [
        { path: "course/a.webp", signedUrl: "https://signed/a", error: null },
        { path: "course/b.webp", signedUrl: null, error: "Object not found" },
      ],
      error: null,
    });
    const supabase = {
      storage: {
        from: vi.fn(() => ({ createSignedUrls })),
      },
    } as unknown as ServerClient;

    const result = await createSignedThumbnailUrls(supabase, [
      "course/a.webp",
      "course/b.webp",
    ]);

    expect(result.error).toBe("Object not found");
  });
});
