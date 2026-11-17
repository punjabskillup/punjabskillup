import { createServerClient } from "@supabase/ssr";
import { expect, test } from "@playwright/test";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.ADMIN_SECURITY_TEST_USER_EMAIL;
const password = process.env.ADMIN_SECURITY_TEST_USER_PASSWORD;

test("signed-out visitor receives an uncacheable, unindexed 404 on /manage", async ({
  page,
}) => {
  const response = await page.goto("/manage/courses");
  expect(response?.status()).toBe(404);
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(response?.headers()["cache-control"]).toContain("no-store");
});

test("normal signed-in user receives a plain 404 on /manage", async ({
  page,
  context,
  baseURL,
}) => {
  test.skip(
    !supabaseUrl || !anonKey || !email || !password,
    "Set ADMIN_SECURITY_TEST_USER_EMAIL and ADMIN_SECURITY_TEST_USER_PASSWORD to run authenticated security tests.",
  );

  const cookies: Array<{
    name: string;
    value: string;
    options?: {
      path?: string;
      maxAge?: number;
      sameSite?: string | boolean;
      secure?: boolean;
      httpOnly?: boolean;
    };
  }> = [];
  const supabase = createServerClient(supabaseUrl!, anonKey!, {
    cookies: {
      getAll: () => cookies.map(({ name, value }) => ({ name, value })),
      setAll: (newCookies) => {
        cookies.splice(
          0,
          cookies.length,
          ...newCookies.map(({ name, value, options }) => ({
            name,
            value,
            options: {
              path: options?.path,
              maxAge: options?.maxAge,
              sameSite: options?.sameSite,
              secure: options?.secure,
              httpOnly: options?.httpOnly,
            },
          })),
        );
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email: email!,
    password: password!,
  });
  expect(error).toBeNull();
  const { data: isAdmin, error: roleError } = await supabase.rpc("is_admin");
  expect(roleError).toBeNull();
  expect(isAdmin).toBe(false);

  await context.addCookies(
    cookies.map(({ name, value, options }) => ({
      name,
      value,
      url: baseURL!,
      path: options?.path ?? "/",
      httpOnly: options?.httpOnly ?? true,
      secure: options?.secure ?? false,
      sameSite:
        options?.sameSite === "strict"
          ? "Strict"
          : options?.sameSite === "none"
            ? "None"
            : "Lax",
      ...(options?.maxAge ? { expires: Math.floor(Date.now() / 1000) + options.maxAge } : {}),
    })),
  );

  const response = await page.goto("/manage/courses");
  expect(response?.status()).toBe(404);
  expect(response?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  expect(response?.headers()["cache-control"]).toContain("no-store");
});
