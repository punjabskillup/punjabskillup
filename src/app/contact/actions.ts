"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ContactFormState = {
  success?: boolean;
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "message", string>>;
};

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(120, "Name must be 120 characters or fewer."),
  email: z.string().trim().email("Enter a valid email address.").max(254, "Email must be 254 characters or fewer."),
  message: z.string().trim().min(1, "Enter a message.").max(5000, "Message must be 5,000 characters or fewer."),
});

export async function submitContactMessage(
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const fieldErrors: ContactFormState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0];
      if ((field === "name" || field === "email" || field === "message") && !fieldErrors[field]) {
        fieldErrors[field] = issue.message;
      }
    }
    return { fieldErrors, message: "Please review the highlighted fields." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_messages").insert(parsed.data);

  if (error) {
    console.error("Unable to save contact message.", error);
    return {
      message: "We couldn’t send your message right now. Please try again later.",
    };
  }

  return {
    success: true,
    message: "Thanks for getting in touch. Your message has been sent.",
  };
}
