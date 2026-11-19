import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileSetupForm } from "@/components/user-info-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set up your profile | PunjabSkillUp",
  robots: { index: false, follow: false },
};

export default async function UserInfoPage() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("full_name,contact_phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    const errorProperties = Object.getOwnPropertyNames(error);
    const errorDetails = [
      `code=${error.code || "(none)"}`,
      `message=${error.message || String(error)}`,
      `details=${error.details || "(none)"}`,
      `hint=${error.hint || "(none)"}`,
      `properties=${errorProperties.join(",") || "(none)"}`,
    ].join("; ");
    console.error(`Could not load the signed-in user's profile. ${errorDetails}`);
    const phoneColumnMissing =
      error.message.includes("contact_phone") &&
      (error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST200");
    const supabaseUnreachable =
      `${error.message} ${error.details}`.toLowerCase().includes("fetch failed") ||
      `${error.message} ${error.details}`.includes("UND_ERR_CONNECT_TIMEOUT");

    return (
      <section className="profile-setup" aria-labelledby="profile-setup-heading">
        <Link className="profile-dashboard-link" href="/dashboard">← Back to dashboard</Link>
        <header className="profile-setup-heading">
          <span className="profile-setup-kicker">ACCOUNT SETUP <span>01 / 01</span></span>
          <h1 id="profile-setup-heading">Set up your learner profile</h1>
          <p>One quick step before you start learning.</p>
        </header>
        <div className="profile-setup-error" role="alert">
          <strong>
            {phoneColumnMissing
              ? "A database update is needed"
              : supabaseUnreachable
                ? "Couldn’t connect to Supabase"
                : "We couldn’t load your profile"}
          </strong>
          <p>
            {phoneColumnMissing
              ? "Apply the existing 20261118100000_collect_enrollment_phone.sql migration in Supabase, then refresh this page."
              : supabaseUnreachable
                ? "Your local server cannot reach Supabase. Check the computer’s internet, VPN, or firewall, then refresh this page."
                : "Please check the Supabase profile setup, then refresh this page."}
          </p>
        </div>
      </section>
    );
  }

  const googleName = user.user_metadata.full_name ?? user.user_metadata.name;
  const name = profile?.full_name?.trim() || (typeof googleName === "string" ? googleName : "");

  return (
    <section className="profile-setup" aria-labelledby="profile-setup-heading">
      <Link className="profile-dashboard-link" href="/dashboard">← Back to dashboard</Link>
      <header className="profile-setup-heading">
        <span className="profile-setup-kicker">ACCOUNT SETUP <span>01 / 01</span></span>
        <h1 id="profile-setup-heading">Set up your learner profile</h1>
        <p>Confirm your details once, then you’re ready to learn.</p>
      </header>
      <ProfileSetupForm
        initialName={name}
        email={user.email ?? ""}
        initialPhone={profile?.contact_phone ?? ""}
      />
    </section>
  );
}
