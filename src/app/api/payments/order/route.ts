import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const orderRequestSchema = z.object({
  course_id: z.string().uuid(),
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
  const parsed = orderRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid course ID is required." }, { status: 400 });
  }

  try {
    const sessionClient = await createClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in to purchase this course." }, { status: 401 });
    }

    const { data: course, error: courseError } = await sessionClient
      .from("courses")
      .select("id,title,price_inr,is_published")
      .eq("id", parsed.data.course_id)
      .maybeSingle();
    if (courseError) {
      throw courseError;
    }
    if (!course || !course.is_published || course.price_inr <= 0) {
      return NextResponse.json({ error: "This paid course is unavailable." }, { status: 404 });
    }

    const { data: existingEnrollment, error: enrollmentError } = await sessionClient
      .from("enrollments")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();
    if (enrollmentError) {
      throw enrollmentError;
    }
    if (existingEnrollment) {
      return NextResponse.json({ error: "You are already enrolled in this course." }, { status: 409 });
    }

    const amount = course.price_inr * 100;
    if (!Number.isSafeInteger(amount)) {
      return NextResponse.json({ error: "This course price cannot be processed." }, { status: 400 });
    }

    const paymentRecordId = crypto.randomUUID();
    const order = await createRazorpayOrder({
      amount,
      receipt: paymentRecordId,
      userId: user.id,
      courseId: course.id,
    });

    const adminClient = createAdminClient();
    const { error: insertError } = await adminClient.from("course_payments").insert({
      user_id: user.id,
      course_id: course.id,
      amount_paise: amount,
      currency: "INR",
      status: "pending",
      razorpay_order_id: order.id,
    });
    if (insertError) {
      console.error("Could not persist Razorpay order:", insertError.message);
      return NextResponse.json({ error: "Unable to record the payment order." }, { status: 500 });
    }

    return NextResponse.json({
      order_id: order.id,
      amount,
      currency: "INR",
    });
  } catch (error) {
    console.error(
      "Could not create Razorpay order:",
      error instanceof Error ? error.message : "Unknown payment error",
    );
    return NextResponse.json(
      { error: "We could not start checkout. Please try again later." },
      { status: 503 },
    );
  }
}
