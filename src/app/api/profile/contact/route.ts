import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/),
});

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
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
      { error: "Enter your name and a 10-digit contact number." },
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

  const { data: existingProfile, error: lookupError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const profileWrite = lookupError
    ? { data: null, error: lookupError }
    : existingProfile
      ? await supabase
          .from("profiles")
          .update({
            full_name: parsed.data.name,
            contact_phone: `+91${parsed.data.phone}`,
          })
          .eq("id", user.id)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("profiles")
          .insert({
            id: user.id,
            full_name: parsed.data.name,
            contact_phone: `+91${parsed.data.phone}`,
          })
          .select("id")
          .maybeSingle();

  const { data: profile, error: profileError } = profileWrite;
  if (profileError || !profile) {
    console.error(
      "Could not save learner enrollment contact details.",
      `code=${profileError?.code || "(none)"}; message=${profileError?.message || "(none)"}; details=${profileError?.details || "(none)"}; hint=${profileError?.hint || "(none)"}; profileReturned=${Boolean(profile)}`,
    );
    const databaseMessage = profileError?.message.toLowerCase() ?? "";
    const profileInsertPolicyMissing =
      databaseMessage.includes("row-level security") ||
      databaseMessage.includes("row level security");
    const permissionErrorMessage = profileInsertPolicyMissing
      ? "Supabase blocked profile creation because its row-level security policy is missing or does not allow this user. Apply the profile creation migration."
      : `Supabase denied profile table access${
          process.env.NODE_ENV === "development" && profileError?.message
            ? `: ${profileError.message}`
            : ". Apply the profile access migrations."
        }`;
    return NextResponse.json(
      {
        error:
          profileError?.code === "42501"
            ? `${permissionErrorMessage} Then retry.`
              : "We couldn’t save your contact details. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved: true });
}
