import "server-only";

import { MAX_THUMBNAIL_BYTES } from "@/lib/admin/thumbnail-constants";

export class InvalidThumbnailError extends Error {
  constructor() {
    super("Invalid thumbnail image.");
    this.name = "InvalidThumbnailError";
  }
}

export function getThumbnailFormat(bytes: Uint8Array) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }

  return null;
}

export async function processThumbnail(file: File) {
  if (file.size === 0 || file.size > MAX_THUMBNAIL_BYTES) {
    throw new InvalidThumbnailError();
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!getThumbnailFormat(input)) {
    throw new InvalidThumbnailError();
  }

  try {
    const sharp = (await import("sharp")).default;
    return await sharp(input, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize(1280, 720, { fit: "cover", position: "attention" })
      .webp({ quality: 84, effort: 4 })
      .toBuffer();
  } catch {
    throw new InvalidThumbnailError();
  }
}
