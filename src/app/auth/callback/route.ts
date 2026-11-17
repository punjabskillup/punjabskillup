import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=missing-code", request.url));
  }

  const { url, anonKey } = getSupabaseConfig();
  const destination = new URL("/explore", request.url);
  const response = NextResponse.redirect(destination);
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
    console.error("OAuth callback code exchange failed.", error?.message);
    const errorResponse = NextResponse.redirect(
      new URL("/?auth=callback-error", request.url),
    );
    errorResponse.headers.set("Cache-Control", "no-store");
    return errorResponse;
  }

  return response;
}
