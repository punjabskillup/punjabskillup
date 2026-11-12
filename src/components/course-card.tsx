import Image from "next/image";
import Link from "next/link";
import type { CourseWithLectures } from "@/lib/courses";
import { formatCoursePrice } from "@/lib/courses";

type CourseCardProps = {
  course: CourseWithLectures;
  href?: string;
  compact?: boolean;
};

export function CourseCard({ course, href, compact = false }: CourseCardProps) {
  const courseHref = href ?? `/courses/${course.id}`;

  return (
    <article className={`course-card${compact ? " course-card-compact" : ""}`}>
      <Link className="course-card-link" href={courseHref}>
        <div className="course-card-art">
          <div
            className={`course-thumbnail${course.thumbnail_url ? " has-thumbnail" : ""}`}
          >
            {course.thumbnail_url ? (
              <Image
                className="course-thumbnail-image"
                src={course.thumbnail_url}
                alt=""
                fill
                sizes="(max-width: 680px) 100vw, (max-width: 1024px) 50vw, 33vw"
                unoptimized
              />
            ) : (
              <span className="thumbnail-mark">
                <span />
                <span />
                <span />
              </span>
            )}
          </div>
          <span className="price-badge">{formatCoursePrice(course.price_inr)}</span>
        </div>
        <div className="course-card-copy">
          <h3>{course.title}</h3>
          <p>
            {course.lectures.length}{" "}
            {course.lectures.length === 1 ? "lecture" : "lectures"}
          </p>
        </div>
      </Link>
    </article>
  );
}
