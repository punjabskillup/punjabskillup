import { NextResponse, type NextRequest } from "next/server";
import {
  razorpayWebhookSchema,
  verifyRazorpayWebhookSignature,
} from "@/lib/payments/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-razorpay-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature." }, { status: 400 });
  }

  const body = await request.text();
  if (body.length > 1_000_000) {
    return NextResponse.json({ error: "Webhook payload is too large." }, { status: 413 });
  }

  try {
    if (!verifyRazorpayWebhookSignature(body, signature)) {
      return NextResponse.json({ error: "Webhook signature is invalid." }, { status: 400 });
    }

    let payload: unknown;
    try {
      payload = JSON.parse(body);
    } catch {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }
    const parsed = razorpayWebhookSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
    }
    if (parsed.data.event !== "payment.captured") {
      return NextResponse.json({ received: true });
    }

    const payment = parsed.data.payload.payment?.entity;
    if (!payment || !payment.captured || !payment.order_id) {
      return NextResponse.json({ error: "Captured payment details are missing." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data: completed, error } = await adminClient.rpc("complete_razorpay_payment", {
      p_order_id: payment.order_id,
      p_payment_id: payment.id,
      p_amount_paise: payment.amount,
      p_currency: payment.currency,
    });
    if (error) {
      console.error("Could not apply captured Razorpay payment:", error.message);
      return NextResponse.json({ error: "Payment could not be recorded." }, { status: 500 });
    }
    if (completed !== true) {
      return NextResponse.json({ error: "Payment could not be confirmed." }, { status: 409 });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(
      "Could not process Razorpay webhook:",
      error instanceof Error ? error.message : "Unknown webhook error",
    );
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
