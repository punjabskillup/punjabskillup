"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ChangeEvent } from "react";
import {
  removeCourseThumbnailAction,
  uploadCourseThumbnailAction,
} from "@/app/manage/courses/actions";
import { MAX_THUMBNAIL_BYTES } from "@/lib/admin/thumbnail-constants";

export function ThumbnailUploader({
  courseId,
  imageUrl,
  hasThumbnail,
}: {
  courseId: string;
  imageUrl: string | null;
  hasThumbnail: boolean;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageRole, setMessageRole] = useState<"alert" | "status">("status");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.currentTarget.files?.[0] ?? null;
    setMessage("");
    setFile(selected);
    setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
  }

  function upload() {
    if (!file) {
      setMessageRole("alert");
      setMessage("Choose an image to upload.");
      return;
    }

    if (file.size > MAX_THUMBNAIL_BYTES) {
      setMessageRole("alert");
      setMessage("Choose an image up to 3 MB.");
      return;
    }

    const formData = new FormData();
    formData.set("course_id", courseId);
    formData.set("file", file);
    setMessage("");
    startTransition(async () => {
      const result = await uploadCourseThumbnailAction(formData);
      setMessageRole(result.success ? "status" : "alert");
      setMessage(result.message);
      if (result.success) {
        setFile(null);
        setPreviewUrl(null);
      }
      router.refresh();
    });
  }

  function remove() {
    setMessage("");
    startTransition(async () => {
      const result = await removeCourseThumbnailAction(courseId);
      setMessageRole(result.success ? "status" : "alert");
      setMessage(result.message);
      setFile(null);
      setPreviewUrl(null);
      router.refresh();
    });
  }

  return (
    <section className="manage-thumbnail-card" aria-labelledby="thumbnail-heading">
      <h2 id="thumbnail-heading">Course thumbnail</h2>
      <div className="manage-thumbnail-preview">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Selected course thumbnail preview"
            width={640}
            height={360}
            unoptimized
          />
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt="Current course thumbnail"
            fill
            sizes="(max-width: 720px) 100vw, 560px"
          />
        ) : (
          <span>No thumbnail selected</span>
        )}
      </div>
      <label className="manage-field">
        Upload JPEG, PNG or WebP (maximum 3 MB)
        <input
          accept="image/jpeg,image/png,image/webp"
          name="file"
          onChange={chooseFile}
          type="file"
        />
      </label>
      <div className="manage-thumbnail-actions">
        <button
          className="manage-primary-button"
          disabled={isPending || !file}
          onClick={upload}
          type="button"
        >
          {isPending ? "Processing..." : "Upload thumbnail"}
        </button>
        {(hasThumbnail || imageUrl) && (
          <button
            className="manage-secondary-button"
            disabled={isPending}
            onClick={remove}
            type="button"
          >
            Remove
          </button>
        )}
      </div>
      {message && (
        <p
          className="manage-form-message"
          role={messageRole}
        >
          {message}
        </p>
      )}
    </section>
  );
}
