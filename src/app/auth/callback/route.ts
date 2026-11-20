import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const nextPath = requestedNext && /^\/notes\/[0-9a-f-]{36}$/i.test(requestedNext)
    ? requestedNext
    : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=missing-code", request.url));
  }

  const { url, anonKey } = getSupabaseConfig();
  const response = NextResponse.redirect(new URL(nextPath, request.url));
  response.headers.set("Cache-Control", "no-store");

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("OAuth callback code exchange failed.", {
      code: error?.code,
      name: error?.name,
      message: error?.message,
    });
    const errorMessage = error?.message.toLowerCase() ?? "";
    const reason = error?.code?.toLowerCase().includes("flow_state")
      ? "missing-verifier"
      : error?.code?.toLowerCase().includes("code_verifier") ||
          errorMessage.includes("code verifier")
        ? "invalid-verifier"
        : errorMessage.includes("fetch failed")
          ? "supabase-unreachable"
          : "exchange-failed";
    const errorResponse = NextResponse.redirect(
      new URL(`/?auth=callback-error&reason=${reason}`, request.url),
    );
    errorResponse.headers.set("Cache-Control", "no-store");
    return errorResponse;
  }

  return response;
}
