"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  beginMfaEnrollment,
  verifyMfaCode,
} from "@/app/manage/security/actions";

type FactorStatus = "verified" | "unverified" | null;

type Props = {
  currentLevel: string | null;
  email: string;
  factorId: string | null;
  factorStatus: FactorStatus;
};

export function AdminMfaSetup({
  currentLevel,
  email,
  factorId: initialFactorId,
  factorStatus,
}: Props) {
  const router = useRouter();
  const [factorId, setFactorId] = useState(initialFactorId);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const isAal2 = currentLevel === "aal2";

  function startEnrollment() {
    setMessage("");
    startTransition(async () => {
      const result = await beginMfaEnrollment();
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      if (!("factorId" in result)) {
        setMessage("Unable to start MFA setup. Try again later.");
        return;
      }
      setFactorId(result.factorId);
      setQrCode(result.qrCode);
      setSecret(result.secret);
      setMessage("Scan the QR code, then enter the 6-digit code.");
    });
  }

  function verifyCode() {
    if (!factorId) {
      setMessage("Unable to verify the code. Try again later.");
      return;
    }

    setMessage("");
    startTransition(async () => {
      const result = await verifyMfaCode(factorId, code);
      if (!result.success) {
        setMessage(result.message);
        return;
      }
      setCode("");
      setMessage("Authenticator verified.");
      router.refresh();
    });
  }

  return (
    <section className="manage-security-card" aria-labelledby="mfa-heading">
      <h2 id="mfa-heading">Authenticator app</h2>
      <p className="manage-muted">
        Account: {email || "Signed-in administrator"}
      </p>

      {isAal2 ? (
        <p className="manage-security-status" role="status">
          Multi-factor authentication is verified for this session.
        </p>
      ) : factorId ? (
        <>
          {qrCode && (
            <div className="manage-qr-panel">
              <Image
                src={qrCode}
                alt="Authenticator enrollment QR code"
                width={220}
                height={220}
                unoptimized
              />
              {secret && (
                <p>
                  Manual setup key: <code>{secret}</code>
                </p>
              )}
            </div>
          )}
          {factorStatus === "unverified" && !qrCode && (
            <p className="manage-muted">
              Finish setup by entering the code for your pending authenticator.
            </p>
          )}
          <label className="manage-field">
            6-digit authenticator code
            <input
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                setCode(event.currentTarget.value.replace(/\D/g, "").slice(0, 6))
              }
              pattern="[0-9]{6}"
              value={code}
            />
          </label>
          <button
            className="manage-primary-button"
            disabled={isPending || code.length !== 6}
            onClick={verifyCode}
            type="button"
          >
            {isPending ? "Verifying..." : "Verify authenticator"}
          </button>
        </>
      ) : (
        <button
          className="manage-primary-button"
          disabled={isPending}
          onClick={startEnrollment}
          type="button"
        >
          {isPending ? "Preparing..." : "Set up authenticator"}
        </button>
      )}

      {message && (
        <p
          className="manage-form-message"
          role={message === "Authenticator verified." ? "status" : "alert"}
        >
          {message}
        </p>
      )}
    </section>
  );
}
