import Image from "next/image";
import { BookOpen } from "lucide-react";

export function CatalogThumbnail({
  src,
  title,
  className = "",
}: {
  src: string | null;
  title: string;
  className?: string;
}) {
  return (
    <div className={`catalog-thumbnail ${className}`}>
      {src ? (
        <Image
          alt=""
          className="catalog-thumbnail-image"
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
          src={src}
        />
      ) : (
        <div
          className="catalog-thumbnail-placeholder"
          role="img"
          aria-label={`${title} thumbnail`}
        >
          <BookOpen aria-hidden="true" strokeWidth={1.6} />
        </div>
      )}
    </div>
  );
}
