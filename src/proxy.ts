import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isManagePath =
    pathname === "/manage" || pathname.startsWith("/manage/");
  const isPublishedNoteSharePath =
    /^\/notes\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      pathname,
    );

  function secureManageResponse(response: NextResponse) {
    if (isManagePath) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
      response.headers.set("Cache-Control", "no-store");
    }
    return response;
  }

  const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredSiteUrl) {
    const canonicalSite = new URL(configuredSiteUrl);
    const isPlaceholder = canonicalSite.hostname === "your-domain";
    const isLocal = ["localhost", "127.0.0.1"].includes(canonicalSite.hostname);
    const isLocalRequest = ["localhost", "127.0.0.1", "[::1]"].includes(
      request.nextUrl.hostname,
    );

    if (!isPlaceholder && !isLocal && !isLocalRequest) {
      const requestHost = request.headers.get("host");
      const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0];
      const requestProtocol = forwardedProtocol || request.nextUrl.protocol.replace(":", "");
      if (requestHost !== canonicalSite.host || requestProtocol !== "https") {
        const canonicalUrl = new URL(
          `${request.nextUrl.pathname}${request.nextUrl.search}`,
          canonicalSite.origin,
        );
        return secureManageResponse(NextResponse.redirect(canonicalUrl, 301));
      }
    }
  }

  const isProtectedPath =
    !isPublishedNoteSharePath &&
    (isManagePath ||
      pathname === "/explore" ||
      pathname.startsWith("/explore/") ||
      pathname === "/notes" ||
      pathname.startsWith("/notes/") ||
      pathname === "/free-lectures" ||
      pathname.startsWith("/free-lectures/") ||
      pathname === "/dashboard" ||
      pathname.startsWith("/dashboard/") ||
      pathname === "/courses" ||
      pathname.startsWith("/courses/") ||
      pathname === "/instructor" ||
      pathname.startsWith("/instructor/") ||
      pathname === "/user-info" ||
      pathname.startsWith("/user-info/"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    if (!isProtectedPath) {
      return secureManageResponse(NextResponse.next());
    }

    if (isManagePath) {
      return secureManageResponse(new NextResponse("Not Found", { status: 404 }));
    }

    const setupUrl = new URL("/", request.url);
    setupUrl.searchParams.set("auth", "configuration-required");
    return secureManageResponse(NextResponse.redirect(setupUrl));
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

  if (!user && isManagePath) {
    return secureManageResponse(new NextResponse("Not Found", { status: 404 }));
  }

  if (!user && isProtectedPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && pathname === "/") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return secureManageResponse(response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
