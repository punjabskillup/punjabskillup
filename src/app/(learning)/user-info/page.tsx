import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserInfoForm } from "@/components/user-info-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Your information | PunjabSkillUp",
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
    console.error("Could not load the signed-in user's profile.", error.code, error.message);
    const phoneColumnMissing =
      error.message.includes("contact_phone") &&
      (error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST200");

    return (
      <section className="catalog-page user-info-page">
        <div className="catalog-error" role="alert">
          {phoneColumnMissing
            ? "The profile database is missing the contact number field. Apply the existing 20261118100000_collect_enrollment_phone.sql migration in Supabase, then refresh this page."
            : "We couldn’t load your profile. Please check the Supabase profile setup, then refresh and try again."}
        </div>
      </section>
    );
  }

  const googleName = user.user_metadata.full_name ?? user.user_metadata.name;
  const name = profile?.full_name?.trim() || (typeof googleName === "string" ? googleName : "");

  return (
    <section className="catalog-page user-info-page" aria-labelledby="user-info-heading">
      <header className="catalog-heading">
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1 id="user-info-heading">Your information</h1>
        <p>Check your details and add a contact number to your profile.</p>
      </header>
      <UserInfoForm
        initialName={name}
        email={user.email ?? ""}
        initialPhone={profile?.contact_phone ?? ""}
      />
    </section>
  );
}
