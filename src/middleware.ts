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

  // Public routes (no auth required)
  if (pathname.startsWith("/intake") || pathname.startsWith("/report")) {
    return supabaseResponse;
  }

  // Signup is closed — bounce to login
  if (pathname.startsWith("/signup")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Login route — if already signed in, route based on role
  if (pathname.startsWith("/login") || pathname.startsWith("/reset-password")) {
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

  // /admin/* — admin role only
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const role = await loadRole(user.id);
    if (role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/clients";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // /clients, /audits/* etc — agencies (and admins, who can shadow-test)
  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
