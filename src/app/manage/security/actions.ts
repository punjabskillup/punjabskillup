"use server";

import { z } from "zod";
import { consumeAdminRateLimit } from "@/lib/admin/rate-limit";
import { requireAdmin } from "@/lib/auth/require-admin";

const factorIdSchema = z.string().uuid();
const codeSchema = z.string().regex(/^\d{6}$/);

export type MfaActionResult =
  | { success: true; factorId: string; qrCode: string; secret: string }
  | { success: true; verified: true }
  | { success: false; message: string };

export async function beginMfaEnrollment(): Promise<MfaActionResult> {
  const { supabase } = await requireAdmin({ allowBeforeMfa: true });
  if (!(await consumeAdminRateLimit(supabase, "admin-actions"))) {
    return { success: false, message: "Unable to start MFA setup. Try again shortly." };
  }

  const { data: existingFactors, error: listError } =
    await supabase.auth.mfa.listFactors();
  if (listError) {
    return { success: false, message: "Unable to start MFA setup. Try again later." };
  }
  if (existingFactors.totp.some((factor) => factor.status === "verified")) {
    return { success: false, message: "MFA is already configured for this account." };
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "PunjabSkillUp Admin",
  });

  if (error || !data?.totp?.qr_code || !data.totp.secret) {
    return { success: false, message: "Unable to start MFA setup. Try again later." };
  }

  return {
    success: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyMfaCode(
  factorIdValue: string,
  codeValue: string,
): Promise<MfaActionResult> {
  const { supabase } = await requireAdmin({ allowBeforeMfa: true });
  if (!(await consumeAdminRateLimit(supabase, "admin-mfa"))) {
    return { success: false, message: "Unable to verify the code. Try again shortly." };
  }

  const parsed = z
    .object({ factorId: factorIdSchema, code: codeSchema })
    .safeParse({ factorId: factorIdValue, code: codeValue });

  if (!parsed.success) {
    return { success: false, message: "Enter the 6-digit code from your authenticator app." };
  }

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId: parsed.data.factorId });
  if (challengeError || !challenge) {
    return { success: false, message: "Unable to verify the code. Try again later." };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: parsed.data.factorId,
    challengeId: challenge.id,
    code: parsed.data.code,
  });

  if (verifyError) {
    return { success: false, message: "Unable to verify the code. Check it and try again." };
  }

  return { success: true, verified: true };
}
