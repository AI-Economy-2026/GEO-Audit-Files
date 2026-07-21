import { createAdminClient, createClient } from "@/lib/supabase/server";

export interface AuthContext {
  userId: string;
  email: string;
}

export type UserRole = "admin" | "agency";

export interface UserProfile {
  userId: string;
  email: string;
  role: UserRole;
  agencyName: string | null;
  contactName: string | null;
  creditsRemaining: number;
  creditsUsed: number;
  status: "active" | "suspended";
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("Unauthorized");
  }

  return {
    userId: user.id,
    email: user.email ?? "",
  };
}

/** Returns the full app_users profile for the current user. Always uses
 *  service role to read so we don't depend on the user's RLS; useful in
 *  middleware-style checks. Throws AuthError if no session. */
export async function getProfile(): Promise<UserProfile> {
  const ctx = await getAuthContext();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("app_users")
    .select("id, email, role, agency_name, contact_name, credits_remaining, credits_used, status")
    .eq("id", ctx.userId)
    .maybeSingle();

  if (error || !data) {
    throw new AuthError("Profile not found", 403);
  }
  return {
    userId: data.id,
    email: data.email ?? ctx.email,
    role: data.role as UserRole,
    agencyName: data.agency_name,
    contactName: data.contact_name,
    creditsRemaining: Number(data.credits_remaining ?? 0),
    creditsUsed: Number(data.credits_used ?? 0),
    status: data.status as "active" | "suspended",
  };
}

/** Use at the top of any /api/admin/* route. Throws 403 if the current
 *  session is not an admin (or not signed in). */
export async function requireAdmin(): Promise<UserProfile> {
  const profile = await getProfile();
  if (profile.role !== "admin") {
    throw new AuthError("Admin access required", 403);
  }
  return profile;
}
