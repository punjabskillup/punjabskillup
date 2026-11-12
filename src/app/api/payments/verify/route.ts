import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  captureRazorpayPayment,
  getRazorpayPayment,
  verifyRazorpayCheckoutSignature,
} from "@/lib/payments/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const verifyRequestSchema = z.object({
  order_id: z.string().min(1).max(64),
  payment_id: z.string().min(1).max(64),
  signature: z.string().min(1).max(128),
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
  const parsed = verifyRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payment verification details." }, { status: 400 });
  }

  try {
    const sessionClient = await createClient();
    const { data: { user }, error: authError } = await sessionClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in to verify this payment." }, { status: 401 });
    }

    if (!verifyRazorpayCheckoutSignature(
      parsed.data.order_id,
      parsed.data.payment_id,
      parsed.data.signature,
    )) {
      return NextResponse.json({ error: "Payment signature is invalid." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: paymentRecord, error: paymentRecordError } = await adminClient
      .from("course_payments")
      .select("user_id,course_id,amount_paise,currency")
      .eq("razorpay_order_id", parsed.data.order_id)
      .maybeSingle();
    if (paymentRecordError) {
      throw paymentRecordError;
    }
    if (!paymentRecord || paymentRecord.user_id !== user.id) {
      return NextResponse.json({ error: "Payment order not found." }, { status: 404 });
    }

    let payment = await getRazorpayPayment(parsed.data.payment_id);
    if (
      payment.order_id !== parsed.data.order_id ||
      payment.amount !== paymentRecord.amount_paise ||
      payment.currency !== paymentRecord.currency
    ) {
      return NextResponse.json({ error: "Payment details do not match this order." }, { status: 400 });
    }
    if (payment.status === "authorized") {
      payment = await captureRazorpayPayment(payment.id, paymentRecord.amount_paise);
    }
    if (
      payment.order_id !== parsed.data.order_id ||
      payment.amount !== paymentRecord.amount_paise ||
      payment.currency !== paymentRecord.currency
    ) {
      return NextResponse.json({ error: "Payment details do not match this order." }, { status: 400 });
    }
    if (payment.status !== "captured") {
      if (payment.status !== "authorized") {
        return NextResponse.json(
          { error: "This payment was not captured. Please try checkout again." },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Payment is still processing. Enrollment will unlock after confirmation." },
        { status: 202 },
      );
    }

    const { data: completed, error: completionError } = await adminClient.rpc(
      "complete_razorpay_payment",
      {
        p_order_id: parsed.data.order_id,
        p_payment_id: parsed.data.payment_id,
        p_amount_paise: payment.amount,
        p_currency: payment.currency,
      },
    );
    if (completionError) {
      throw completionError;
    }
    if (completed !== true) {
      return NextResponse.json({ error: "Payment could not be confirmed." }, { status: 409 });
    }

    return NextResponse.json({ enrolled: true });
  } catch (error) {
    console.error(
      "Could not verify Razorpay payment:",
      error instanceof Error ? error.message : "Unknown payment error",
    );
    return NextResponse.json(
      { error: "We could not verify the payment yet. Please try again shortly." },
      { status: 503 },
    );
  }
}
