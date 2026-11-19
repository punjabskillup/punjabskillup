import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("contact_phone")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile?.contact_phone?.trim()) {
    redirect("/user-info");
  }

  redirect("/explore");
}
