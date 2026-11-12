import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const orderSchema = z.object({
  id: z.string().min(1),
});

const paymentSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
});

export type RazorpayPayment = z.infer<typeof paymentSchema>;

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!keyId || !keySecret || !webhookSecret) {
    throw new Error("Razorpay is not configured on the server.");
  }

  return { keyId, keySecret, webhookSecret };
}

async function razorpayRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  body?: Record<string, unknown>,
): Promise<T> {
  const { keyId, keySecret } = getRazorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Razorpay request failed with status ${response.status}.`);
  }

  const result: unknown = await response.json();
  const parsed = schema.safeParse(result);
  if (!parsed.success) {
    throw new Error("Razorpay returned an unexpected response.");
  }
  return parsed.data;
}

export function createRazorpayOrder(input: {
  amount: number;
  receipt: string;
  userId: string;
  courseId: string;
}) {
  return razorpayRequest("/orders", orderSchema, {
    amount: input.amount,
    currency: "INR",
    receipt: input.receipt,
    notes: {
      user_id: input.userId,
      course_id: input.courseId,
    },
  });
}

export function getRazorpayPayment(paymentId: string) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`, paymentSchema);
}

export function captureRazorpayPayment(paymentId: string, amount: number) {
  return razorpayRequest(
    `/payments/${encodeURIComponent(paymentId)}/capture`,
    paymentSchema,
    { amount },
  );
}

export function verifyRazorpayCheckoutSignature(
  orderId: string,
  paymentId: string,
  suppliedSignature: string,
) {
  const { keySecret } = getRazorpayConfig();
  if (!/^[\da-f]{64}$/i.test(suppliedSignature)) {
    return false;
  }
  const expected = createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  const supplied = Buffer.from(suppliedSignature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export function verifyRazorpayWebhookSignature(body: string, signature: string) {
  const { webhookSecret } = getRazorpayConfig();
  if (!/^[\da-f]{64}$/i.test(signature)) {
    return false;
  }
  const expected = createHmac("sha256", webhookSecret).update(body).digest();
  const supplied = Buffer.from(signature, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export const razorpayWebhookSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string().min(1),
        order_id: z.string().min(1),
        amount: z.number().int(),
        currency: z.string(),
        captured: z.boolean(),
      }),
    }).optional(),
  }),
});
