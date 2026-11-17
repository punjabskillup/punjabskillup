import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  getThumbnailFormat,
  InvalidThumbnailError,
  processThumbnail,
} from "@/lib/admin/thumbnail";
import { MAX_THUMBNAIL_BYTES } from "@/lib/admin/thumbnail-constants";

describe("admin thumbnail processing", () => {
  it("recognizes only JPEG, PNG, and WebP magic bytes", () => {
    expect(getThumbnailFormat(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe("jpeg");
    expect(
      getThumbnailFormat(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBe("png");
    expect(
      getThumbnailFormat(
        Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]),
      ),
    ).toBe("webp");
    expect(getThumbnailFormat(new TextEncoder().encode("<html>fake.png</html>"))).toBeNull();
  });

  it("rejects HTML content renamed to .png, regardless of MIME type", async () => {
    const fakeImage = new File(["<html><body>not an image</body></html>"], "fake.png", {
      type: "image/png",
    });

    await expect(processThumbnail(fakeImage)).rejects.toBeInstanceOf(
      InvalidThumbnailError,
    );
  });

  it("rejects files larger than 3 MB before decoding", async () => {
    const oversizedImage = new File(
      [new Uint8Array(MAX_THUMBNAIL_BYTES + 1)],
      "large.png",
      { type: "image/png" },
    );

    await expect(processThumbnail(oversizedImage)).rejects.toBeInstanceOf(
      InvalidThumbnailError,
    );
  });

  it("re-encodes valid images as a 1280x720 WebP", async () => {
    const png = await sharp({
      create: {
        width: 40,
        height: 20,
        channels: 3,
        background: "#d91a2a",
      },
    })
      .png()
      .toBuffer();
    const file = new File([png], "thumbnail.png", { type: "image/png" });
    const result = await processThumbnail(file);
    const metadata = await sharp(result).metadata();

    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1280);
    expect(metadata.height).toBe(720);
  });
});
