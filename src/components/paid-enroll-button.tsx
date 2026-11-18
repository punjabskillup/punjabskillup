"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
  theme: { color: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

type PaidEnrollButtonProps = {
  courseId: string;
  courseTitle: string;
  priceInr: number;
  initialEmail: string;
  initialName: string;
  initialPhone: string;
};

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the secure payment form."));
    document.body.appendChild(script);
  });
}

export function PaidEnrollButton({
  courseId,
  courseTitle,
  priceInr,
  initialEmail,
  initialName,
  initialPhone,
}: PaidEnrollButtonProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function beginPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    try {
      const publicKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!publicKey) {
        throw new Error("Payments are not configured yet. Please try again later.");
      }

      await loadRazorpayCheckout();
      const orderResponse = await fetch("/api/payments/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course_id: courseId }),
      });
      const orderResult: {
        order_id?: string;
        amount?: number;
        currency?: "INR";
        error?: string;
      } = await orderResponse.json();
      if (!orderResponse.ok || !orderResult.order_id || !orderResult.amount) {
        throw new Error(orderResult.error ?? "Unable to start checkout.");
      }

      const Checkout = window.Razorpay;
      if (!Checkout) {
        throw new Error("The secure payment form did not load. Please try again.");
      }

      const checkout = new Checkout({
        key: publicKey,
        amount: orderResult.amount,
        currency: orderResult.currency ?? "INR",
        name: "PunjabSkillUp",
        description: courseTitle,
        order_id: orderResult.order_id,
        prefill: { name: initialName, email: initialEmail, contact: initialPhone },
        theme: { color: "#14172B" },
        modal: {
          ondismiss: () => setIsLoading(false),
        },
        handler: (payment) => {
          void verifyPayment(payment);
        },
      });
      checkout.on("payment.failed", (response) => {
        setMessage(response.error?.description ?? "Payment did not complete. Please try again.");
        setIsLoading(false);
      });
      checkout.open();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to start checkout.");
      setIsLoading(false);
    }
  }

  async function verifyPayment(payment: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: payment.razorpay_order_id,
          payment_id: payment.razorpay_payment_id,
          signature: payment.razorpay_signature,
        }),
      });
      const result: { enrolled?: boolean; error?: string } = await response.json();
      if (!response.ok || !result.enrolled) {
        throw new Error(result.error ?? "Payment is processing. Please refresh in a moment.");
      }
      setMessage("Payment successful. You are enrolled.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Payment verification failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="enroll-control" onSubmit={beginPayment}>
      <button
        className="primary-action"
        type="submit"
        disabled={isLoading}
      >
        {isLoading ? "Preparing checkout..." : `Buy course · ₹${new Intl.NumberFormat("en-IN").format(priceInr)}`}
      </button>
      {message && (
        <p className={message.startsWith("Payment successful") ? "form-feedback" : "form-feedback form-feedback-error"} role="status">
          {message}
        </p>
      )}
    </form>
  );
}
