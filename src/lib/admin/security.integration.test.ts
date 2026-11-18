import { describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const accessToken = process.env.ADMIN_SECURITY_TEST_USER_ACCESS_TOKEN;
const courseId = process.env.ADMIN_SECURITY_TEST_COURSE_ID;
const canRun = Boolean(supabaseUrl && anonKey && accessToken && courseId);

describe.skipIf(!canRun)("catalog RLS for a normal signed-in user", () => {
  it("refuses course insert, update, delete, and private thumbnail upload", async () => {
    const authClient = createClient(supabaseUrl!, anonKey!);
    const { data: { user }, error: authError } =
      await authClient.auth.getUser(accessToken!);

    expect(authError).toBeNull();
    expect(user).toBeTruthy();

    const supabase = createClient(supabaseUrl!, anonKey!, {
      accessToken: async () => accessToken!,
    });

    const { data: isAdmin, error: adminCheckError } =
      await supabase.rpc("is_admin");
    expect(adminCheckError).toBeNull();
    expect(isAdmin).toBe(false);

    const { data: inserted, error: insertError } = await supabase
      .from("courses")
      .insert({
        slug: `rls-test-${crypto.randomUUID()}`,
        title: "RLS test course",
        description: "",
        price_inr: 0,
        is_published: false,
      })
      .select("id")
      .maybeSingle();
    expect(insertError).not.toBeNull();
    expect(inserted).toBeNull();

    for (const operation of ["update", "delete"] as const) {
      const query =
        operation === "update"
          ? supabase
              .from("courses")
              .update({ title: "Unauthorized update" })
              .eq("id", courseId!)
          : supabase.from("courses").delete().eq("id", courseId!);
      const { data, error } = await query.select("id").maybeSingle();
      expect(error).toBeNull();
      expect(data).toBeNull();
    }

    const path = `courses/${courseId}/${crypto.randomUUID()}.webp`;
    const { error: uploadError } = await supabase.storage
      .from("course-thumbnails")
      .upload(path, new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
        contentType: "image/webp",
      });
    expect(uploadError).not.toBeNull();
  });
});
