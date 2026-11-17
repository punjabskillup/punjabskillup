import { Suspense, type ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LearningNavigation } from "@/components/learning-navigation";
import { createClient } from "@/lib/supabase/server";

export default function LearningLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="learning-main" aria-live="polite">
          <p className="learning-loading">Loading your learning space...</p>
        </main>
      }
    >
      <SignedInLearningLayout>{children}</SignedInLearningLayout>
    </Suspense>
  );
}

async function SignedInLearningLayout({ children }: { children: ReactNode }) {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  const metadataName = user.user_metadata.full_name ?? user.user_metadata.name;
  const name =
    typeof metadataName === "string" && metadataName.trim()
      ? metadataName.trim()
      : user.email ?? "Learner";

  return (
    <>
      <LearningNavigation name={name} />
      <main className="learning-main">{children}</main>
    </>
  );
}
