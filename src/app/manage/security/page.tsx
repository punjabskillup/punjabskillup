import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { AdminMfaSetup } from "@/components/admin-mfa-setup";
import { ManagePage } from "@/components/manage-page";
import { requireAdmin } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin security | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default function AdminSecurityPage() {
  return (
    <Suspense fallback={<ManageLoading />}>
      <AdminSecurityContent />
    </Suspense>
  );
}

async function AdminSecurityContent() {
  await connection();
  const { supabase, user, assurance } = await requireAdmin({
    allowBeforeMfa: true,
  });
  const { data: factors, error } = await supabase.auth.mfa.listFactors();

  if (error || !factors) {
    return (
      <ManagePage>
        <div className="manage-message" role="alert">
          Security settings are unavailable. Try again later.
        </div>
      </ManagePage>
    );
  }

  const totpFactors = factors.totp as Array<{ id: string; status: string }>;
  const verifiedFactor = totpFactors.find((item) => item.status === "verified");
  const unverifiedFactor = totpFactors.find((item) => item.status === "unverified");
  const factor = verifiedFactor ?? unverifiedFactor ?? null;
  const factorStatus =
    factor?.status === "verified" || factor?.status === "unverified"
      ? factor.status
      : null;

  return (
    <ManagePage>
      <header className="manage-heading">
        <span className="manage-eyebrow">ACCOUNT SECURITY</span>
        <h1>Secure admin access</h1>
        <p>Use an authenticator app to protect administrative changes.</p>
      </header>
      <AdminMfaSetup
        currentLevel={assurance.currentLevel}
        factorId={factor?.id ?? null}
        factorStatus={factorStatus}
        email={user.email ?? ""}
      />
      {assurance.currentLevel === "aal2" && (
        <Link className="manage-secondary-link" href="/manage/courses">
          Continue to course management
        </Link>
      )}
    </ManagePage>
  );
}

function ManageLoading() {
  return (
    <ManagePage>
      <p className="manage-muted" aria-live="polite">Loading security settings...</p>
    </ManagePage>
  );
}
