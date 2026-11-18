"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

function toTenDigitPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

export function UserInfoForm({
  initialName,
  email,
  initialPhone,
}: {
  initialName: string;
  email: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(toTenDigitPhone(initialPhone));
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const phoneIsComplete = phone.length === 10;

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/profile/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save your information.");
      }

      router.push("/explore");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save your information.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="user-info-card" onSubmit={saveProfile}>
      <label className="user-info-field">
        Username
        <input
          autoComplete="name"
          autoCapitalize="words"
          maxLength={120}
          name="name"
          onChange={(event) => setName(event.currentTarget.value)}
          required
          type="text"
          value={name}
        />
        <span className="user-info-hint">You can edit the name imported from Google.</span>
      </label>

      <label className="user-info-field">
        Email
        <input autoComplete="email" readOnly type="email" value={email} />
        <span className="user-info-hint">Your Google account email.</span>
      </label>

      <label className="user-info-field">
        Contact number
        <span className={`user-info-phone${phoneIsComplete ? " is-complete" : " is-incomplete"}`}>
          <span className="user-info-phone-prefix" aria-label="India country code">+91</span>
          <input
            aria-describedby="user-info-phone-hint"
            aria-invalid={!phoneIsComplete}
            autoComplete="tel-national"
            inputMode="numeric"
            maxLength={10}
            name="phone"
            onChange={(event) => setPhone(event.currentTarget.value.replace(/\D/g, "").slice(0, 10))}
            pattern="[0-9]{10}"
            placeholder="10-digit mobile number"
            required
            type="tel"
            value={phone}
          />
        </span>
        <span className="user-info-hint" id="user-info-phone-hint">
          Enter 10 digits. Your number is not verified by SMS.
        </span>
      </label>

      <button className="primary-action" type="submit" disabled={isSaving || !phoneIsComplete || !name.trim()}>
        {isSaving ? "Saving..." : "Save information"}
      </button>
      {message && <p className="form-feedback form-feedback-error" role="alert">{message}</p>}
    </form>
  );
}
