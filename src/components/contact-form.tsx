"use client";

import { useActionState } from "react";
import { submitContactMessage, type ContactFormState } from "@/app/contact/actions";

const initialState: ContactFormState = {};

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(
    submitContactMessage,
    initialState,
  );

  return (
    <form className="contact-form" action={formAction}>
      <label htmlFor="contact-name">Name</label>
      <input id="contact-name" name="name" autoComplete="name" maxLength={120} required />
      {state.fieldErrors?.name && <p className="form-error">{state.fieldErrors.name}</p>}

      <label htmlFor="contact-email">Email</label>
      <input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required />
      {state.fieldErrors?.email && <p className="form-error">{state.fieldErrors.email}</p>}

      <label htmlFor="contact-message">Message</label>
      <textarea id="contact-message" name="message" rows={6} maxLength={5000} required />
      {state.fieldErrors?.message && <p className="form-error">{state.fieldErrors.message}</p>}

      {state.message && (
        <p className={state.success ? "form-success" : "form-error"} role="status">
          {state.message}
        </p>
      )}
      <button className="primary-button" type="submit" disabled={isPending}>
        {isPending ? "Sending message..." : "Send message"}
      </button>
    </form>
  );
}
