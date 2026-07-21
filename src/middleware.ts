import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

/** Cheap server-side check of the caller's role. Uses the service role
 *  key from a fresh client so we can read app_users regardless of RLS. */
async function loadRole(userId: string): Promise<"admin" | "agency" | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  const admin = createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await admin
    .from("app_users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return (data?.role as "admin" | "agency" | null) ?? null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Public routes (no auth required). Note: /reset-password must stay
  // reachable even with a session — the recovery link signs the user in.
  if (
    pathname.startsWith("/intake") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return supabaseResponse;
  }

  // Signup is closed — bounce to login
  if (pathname.startsWith("/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Login route — if already signed in, route based on role
  if (pathname.startsWith("/login")) {
    if (user) {
      const role = await loadRole(user.id);
      const url = request.nextUrl.clone();
      url.pathname = role === "admin" ? "/admin" : "/clients";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Protected routes — must be signed in
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Load role once for all protected routes
  const role = await loadRole(user.id);

  // Admin — manages from /admin/*, and may VIEW any agency's audit
  // workspace (read access granted by the admin RLS policies) so the
  // admin panel can click through to an audit's dashboard.
  if (role === "admin") {
    if (!pathname.startsWith("/admin") && !pathname.startsWith("/audits")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Agency — cannot access /admin/* routes
  if (role === "agency") {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      const url = request.nextUrl.clone();
      url.pathname = "/clients";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // No role found (app_users row missing) — send to login
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // Exclude Next internals, API routes and any static file (paths with a
  // dot, e.g. /gatha-wordmark-mint.svg) — otherwise logged-out visitors get
  // brand assets 307-redirected to /login and see broken images.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)"],
};
