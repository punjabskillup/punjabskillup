import type { Metadata } from "next";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://YOUR-DOMAIN"
).replace(/\/+$/, "");

export function absoluteUrl(path: string) {
  return new URL(path.replace(/^\/+/, ""), `${SITE_URL}/`).toString();
}

export function publicMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const canonical = absoluteUrl(path);
  const image = absoluteUrl("/opengraph-image");

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: "PunjabSkillUp",
      images: [{ url: image, width: 1200, height: 630, alt: "PunjabSkillUp — Skills for Punjab." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}
