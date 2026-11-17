import Link from "next/link";
import { CatalogThumbnail } from "@/components/catalog-thumbnail";

type CatalogCourse = {
  id: string;
  slug: string;
  title: string;
  description: string;
};

export function CatalogCourseCard({
  course,
  thumbnailUrl,
  priceLabel,
}: {
  course: CatalogCourse;
  thumbnailUrl: string | null;
  priceLabel: string;
}) {
  return (
    <Link className="catalog-course-card" href={`/courses/${course.slug}`}>
      <CatalogThumbnail src={thumbnailUrl} title={course.title} />
      <div className="catalog-course-copy">
        <div className="catalog-course-heading">
          <h2>{course.title}</h2>
          <span className="catalog-badge">{priceLabel}</span>
        </div>
        <p>{course.description}</p>
      </div>
    </Link>
  );
}
