import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    const canonicalSite = new URL(configuredSiteUrl);
    const isPlaceholder = canonicalSite.hostname === "your-domain";
    const isLocal = ["localhost", "127.0.0.1"].includes(canonicalSite.hostname);

    if (!isPlaceholder && !isLocal) {
      const requestHost = request.headers.get("host");
      const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0];
      const requestProtocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
      if (requestHost !== canonicalSite.host || requestProtocol !== "https") {
        const canonicalUrl = new URL(
          `${request.nextUrl.pathname}${request.nextUrl.search}`,
          canonicalSite.origin,
        );
        return NextResponse.redirect(canonicalUrl, 301);
      }
    }
  }

  const isProtectedPath =
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/courses" ||
    pathname.startsWith("/courses/") ||
    pathname === "/instructor" ||
    pathname.startsWith("/instructor/");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    if (!isProtectedPath) {
      return NextResponse.next();
    }

    const setupUrl = new URL("/", request.url);
    setupUrl.searchParams.set("auth", "configuration-required");
    return NextResponse.redirect(setupUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
