"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { CourseWithLectures } from "@/lib/courses";
import { getBunnyVideoId, getYouTubeVideoId } from "@/lib/courses";
import { createClient } from "@/lib/supabase/client";

type InstructorWorkspaceProps = {
  courses: CourseWithLectures[];
};

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function InstructorWorkspace({ courses: initialCourses }: InstructorWorkspaceProps) {
  const [courses, setCourses] = useState(initialCourses);
  const [courseMessage, setCourseMessage] = useState("");
  const [lectureMessage, setLectureMessage] = useState("");
  const [isSavingCourse, setIsSavingCourse] = useState(false);
  const [isSavingLecture, setIsSavingLecture] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(initialCourses[0]?.id ?? "");
  const [videoProvider, setVideoProvider] = useState<"youtube" | "bunny">("youtube");
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const requiresBunny = (selectedCourse?.price_inr ?? 0) > 0;

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCourseMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const priceValue = String(formData.get("price_inr") ?? "0").trim();
    const thumbnailValue = String(formData.get("thumbnail_url") ?? "").trim();
    const priceInr = Number(priceValue);

    if (!title) {
      setCourseMessage("Enter a course title.");
      return;
    }
    if (!Number.isSafeInteger(priceInr) || priceInr < 0) {
      setCourseMessage("Enter a whole number price of ₹0 or more.");
      return;
    }
    if (thumbnailValue && !isValidHttpUrl(thumbnailValue)) {
      setCourseMessage("Enter a valid thumbnail URL.");
      return;
    }

    setIsSavingCourse(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw userError ?? new Error("Please sign in again to create a course.");
      }

      const { data, error } = await supabase
        .from("courses")
        .insert({
          title,
          description,
          thumbnail_url: thumbnailValue || null,
          price_inr: priceInr,
          is_published: formData.get("is_published") === "on",
          created_by: user.id,
        })
        .select("id,title,description,thumbnail_url,price_inr,is_published,created_by,created_at")
        .single();

      if (error) {
        throw error;
      }

      const createdCourse = { ...data, lectures: [] };
      setCourses((current) => [createdCourse, ...current]);
      setSelectedCourseId(createdCourse.id);
      form.reset();
      setCourseMessage("Course created. You can add its first lecture below.");
    } catch (error) {
      setCourseMessage(getErrorMessage(error, "Unable to create the course."));
    } finally {
      setIsSavingCourse(false);
    }
  }

  async function addLecture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLectureMessage("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("lecture_title") ?? "").trim();
    const videoUrl = String(formData.get("video_url") ?? "").trim();
    const provider = requiresBunny ? "bunny" : videoProvider;
    const videoId = provider === "bunny"
      ? getBunnyVideoId(videoUrl)
      : getYouTubeVideoId(videoUrl);

    if (!selectedCourseId) {
      setLectureMessage("Create or select a course first.");
      return;
    }
    if (!title) {
      setLectureMessage("Enter a lecture title.");
      return;
    }
    if (!videoId) {
      setLectureMessage(
        provider === "bunny"
          ? "Enter a Bunny Stream video ID or embed URL."
          : "Enter a valid YouTube video URL or 11-character video ID.",
      );
      return;
    }

    setIsSavingLecture(true);
    try {
      const supabase = createClient();
      const { data: lastLecture, error: positionError } = await supabase
        .from("lectures")
        .select("position")
        .eq("course_id", selectedCourseId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (positionError) {
        throw positionError;
      }

      const position = (lastLecture?.position ?? 0) + 1;
      const { data, error } = await supabase
        .from("lectures")
        .insert({
          course_id: selectedCourseId,
          title,
          position,
          video_provider: provider,
          video_ref: videoId,
        })
        .select("id,title,position")
        .single();

      if (error) {
        throw error;
      }

      setCourses((current) =>
        current.map((course) =>
          course.id === selectedCourseId
            ? { ...course, lectures: [...course.lectures, data] }
            : course,
        ),
      );
      form.reset();
      setLectureMessage("Lecture added.");
    } catch (error) {
      setLectureMessage(getErrorMessage(error, "Unable to add this lecture."));
    } finally {
      setIsSavingLecture(false);
    }
  }

  return (
    <div className="instructor-workspace">
      <section className="instructor-form-card" aria-labelledby="create-course-heading">
        <div className="instructor-form-heading">
          <span className="step-number">01</span>
          <div>
            <h2 id="create-course-heading">Course details</h2>
            <p>Set up the details learners will see in the course library.</p>
          </div>
        </div>
        <form className="instructor-form" onSubmit={createCourse}>
          <label>
            Course title
            <input name="title" type="text" required maxLength={120} />
          </label>
          <label>
            Description
            <textarea name="description" rows={4} maxLength={2000} />
          </label>
          <div className="form-field-row">
            <label>
              Price (INR)
              <input name="price_inr" type="number" min="0" step="1" defaultValue="0" required />
            </label>
            <label>
              Thumbnail URL <span className="optional-label">(optional)</span>
              <input name="thumbnail_url" type="url" inputMode="url" />
            </label>
          </div>
          <label className="checkbox-field">
            <input name="is_published" type="checkbox" defaultChecked />
            <span>Publish this course so signed-in learners can see it</span>
          </label>
          <div className="form-submit-row">
            <button className="primary-action" type="submit" disabled={isSavingCourse}>
              {isSavingCourse ? "Creating..." : "Create course"}
            </button>
            {courseMessage && (
              <p className="form-feedback" role="status">{courseMessage}</p>
            )}
          </div>
        </form>
      </section>

      <section className="instructor-form-card" aria-labelledby="add-lecture-heading">
        <div className="instructor-form-heading">
          <span className="step-number">02</span>
          <div>
            <h2 id="add-lecture-heading">Add a lecture</h2>
            <p>Paid courses require Bunny Stream. Free courses can use YouTube or Bunny Stream.</p>
          </div>
        </div>
        {courses.length === 0 ? (
          <p className="instructor-empty">Create a course before adding lectures.</p>
        ) : (
          <form className="instructor-form" onSubmit={addLecture}>
            <label>
              Course
              <select
                name="course_id"
                value={selectedCourseId}
                onChange={(event) => setSelectedCourseId(event.target.value)}
                required
              >
                {courses.map((course) => (
                  <option value={course.id} key={course.id}>{course.title}</option>
                ))}
              </select>
            </label>
            <label>
              Lecture title
              <input name="lecture_title" type="text" required maxLength={120} />
            </label>
            <label>
              Video provider
              <select
                value={requiresBunny ? "bunny" : videoProvider}
                onChange={(event) => setVideoProvider(event.target.value as "youtube" | "bunny")}
                disabled={requiresBunny}
              >
                <option value="youtube">YouTube</option>
                <option value="bunny">Bunny Stream</option>
              </select>
            </label>
            <label>
              {requiresBunny || videoProvider === "bunny"
                ? "Bunny Stream video ID or embed URL"
                : "YouTube URL or video ID"}
              <input
                name="video_url"
                type="text"
                required
                inputMode="url"
                placeholder={requiresBunny || videoProvider === "bunny"
                  ? "Bunny video ID or https://iframe.mediadelivery.net/embed/..."
                  : "YouTube URL or 11-character video ID"}
              />
            </label>
            <div className="form-submit-row">
              <button
                className="primary-action"
                type="submit"
                disabled={isSavingLecture || courses.length === 0}
              >
                {isSavingLecture ? "Adding..." : "Add lecture"}
              </button>
              {lectureMessage && (
                <p className="form-feedback" role="status">{lectureMessage}</p>
              )}
            </div>
          </form>
        )}
      </section>

      {courses.length > 0 && (
        <section className="instructor-course-list" aria-labelledby="your-courses-heading">
          <div className="section-title-row">
            <h2 id="your-courses-heading">Your courses</h2>
            <Link className="text-action" href="/dashboard">View learner library</Link>
          </div>
          <ul>
            {courses.map((course) => (
              <li key={course.id}>
                <span>{course.title}</span>
                <span>{course.lectures.length} lectures</span>
                <span>{course.is_published ? "Published" : "Draft"}</span>
                <Link href={`/courses/${course.id}`}>Open</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function isValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
