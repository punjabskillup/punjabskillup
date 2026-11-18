"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

function toTenDigitPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }
  return digits.slice(0, 10);
}

export function ProfileSetupForm({
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
  const displayName = name.trim() || "Your name";
  const initial = name.trim().charAt(0).toUpperCase() || "P";

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
        throw new Error(result.error ?? "We couldn’t save your profile. Please try again.");
      }

      router.push("/explore");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "We couldn’t save your profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="profile-setup-card">
      <aside className="profile-setup-preview" aria-label="Profile preview">
        <span className="profile-setup-secure"><ShieldCheck aria-hidden="true" /> SECURE PROFILE</span>
        <div className="profile-setup-identity">
          <span className="profile-setup-avatar" aria-hidden="true">{initial}</span>
          <span className="profile-setup-identity-label">LEARNER ACCOUNT</span>
          <h2>{displayName}</h2>
          <p>{email || "Google account"}</p>
        </div>
        <div className="profile-setup-benefit">
          <span className="profile-setup-check"><Check aria-hidden="true" /></span>
          <p><strong>Almost ready</strong><br />Save your details and start exploring courses.</p>
        </div>
      </aside>

      <form className="profile-setup-form" onSubmit={saveProfile}>
        <div className="profile-setup-form-heading">
          <span>PERSONAL DETAILS</span>
          <p>All fields are required</p>
        </div>

        <label className="profile-setup-field">
          <span className="profile-setup-label"><UserRound aria-hidden="true" /> Your name</span>
          <input
            autoComplete="name"
            autoCapitalize="words"
            maxLength={120}
            name="name"
            onChange={(event) => setName(event.currentTarget.value)}
            placeholder="Enter your name"
            required
            type="text"
            value={name}
          />
          <span className="profile-setup-hint">Imported from Google. You can change it anytime.</span>
        </label>

        <label className="profile-setup-field">
          <span className="profile-setup-label"><Mail aria-hidden="true" /> Email address</span>
          <span className="profile-setup-email-wrap">
            <input autoComplete="email" readOnly type="email" value={email} />
            <span className="profile-setup-google-label">GOOGLE</span>
          </span>
          <span className="profile-setup-hint">Your sign-in email is managed by Google.</span>
        </label>

        <label className="profile-setup-field">
          <span className="profile-setup-label"><Phone aria-hidden="true" /> Contact number</span>
          <span className={`profile-setup-phone${phoneIsComplete ? " is-complete" : " is-incomplete"}`}>
            <span className="profile-setup-phone-prefix"><span>IN</span> +91</span>
            <input
              aria-describedby="profile-phone-hint"
              aria-invalid={!phoneIsComplete}
              autoComplete="tel-national"
              inputMode="numeric"
              maxLength={10}
              name="phone"
              onChange={(event) => setPhone(toTenDigitPhone(event.currentTarget.value))}
              pattern="[0-9]{10}"
              placeholder="10-digit mobile number"
              required
              type="tel"
              value={phone}
            />
          </span>
          <span className="profile-setup-hint" id="profile-phone-hint">
            Enter 10 digits. This number is not verified by SMS.
          </span>
        </label>

        {message && <p className="profile-setup-form-error" role="alert">{message}</p>}
        <button className="profile-setup-submit" type="submit" disabled={isSaving || !phoneIsComplete || !name.trim()}>
          <span>{isSaving ? "Saving profile…" : "Save and continue"}</span>
          <ArrowRight aria-hidden="true" />
        </button>
        <p className="profile-setup-privacy"><ShieldCheck aria-hidden="true" /> Your details stay private to your account.</p>
      </form>
    </div>
  );
}
