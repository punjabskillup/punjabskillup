"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type EnrollButtonProps = {
  courseId: string;
  initialName: string;
  initialPhone: string;
};

export function EnrollButton({ courseId, initialName, initialPhone }: EnrollButtonProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
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

      const contactResponse = await fetch("/api/profile/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const contactResult: { error?: string } = await contactResponse.json();
      if (!contactResponse.ok) {
        throw new Error(contactResult.error ?? "Unable to save your contact details.");
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
      <div className="enroll-form-intro">
        <span className="enroll-form-step">ONE LAST STEP</span>
        <h2>Complete your enrollment</h2>
        <p>Save your details to your learner profile.</p>
      </div>
      <label className="enrollment-contact-field">
        Contact number
        <input
          autoComplete="tel"
          inputMode="tel"
          maxLength={24}
          onChange={(event) => setPhone(event.currentTarget.value)}
          placeholder="+91 98765 43210"
          required
          type="tel"
          value={phone}
        />
      </label>
      <label className="enrollment-contact-field">
        Name
        <input
          autoComplete="name"
          autoCapitalize="words"
          maxLength={120}
          onChange={(event) => setName(event.currentTarget.value)}
          placeholder="Your name"
          required
          type="text"
          value={name}
        />
      </label>
      <p className="enroll-form-note">
        Contact numbers are saved but not verified by SMS.
      </p>
      <button className="primary-action" type="submit" disabled={isLoading}>
        {isLoading ? "Enrolling..." : "Enroll free"}
      </button>
      {message && <p className="form-feedback form-feedback-error" role="alert">{message}</p>}
    </form>
  );
}
