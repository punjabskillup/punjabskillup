"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EnrollButtonProps = {
  courseId: string;
};

export function EnrollButton({ courseId }: EnrollButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw userError ?? new Error("Please sign in to enroll.");
      }

      const { error } = await supabase.from("enrollments").insert({
        user_id: user.id,
        course_id: courseId,
      });

      if (error && error.code !== "23505") {
        throw error;
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to enroll right now.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="enroll-control" onSubmit={enroll}>
      <button className="primary-action" type="submit" disabled={isLoading}>
        {isLoading ? "Enrolling..." : "Enroll free"}
      </button>
      {message && <p className="form-feedback form-feedback-error" role="alert">{message}</p>}
    </form>
  );
}
