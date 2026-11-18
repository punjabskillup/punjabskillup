import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(24)
    .regex(/^\+?[0-9\s().-]+$/)
    .refine((phone) => phone.replace(/\D/g, "").length >= 7),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter your name and a valid contact number." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.name,
      contact_phone: parsed.data.phone,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();
  if (profileError || !profile) {
    console.error("Could not save learner enrollment contact details.", profileError?.message);
    return NextResponse.json(
      { error: "We couldn’t save your contact details. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved: true });
}
