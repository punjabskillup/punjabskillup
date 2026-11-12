import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

const publicPaths = [
  "/",
  "/about",
  "/how-it-works",
  "/teach",
  "/contact",
  "/topics/ai-and-ml",
  "/topics/web-development",
  "/terms",
  "/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return publicPaths.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
  }));
}
