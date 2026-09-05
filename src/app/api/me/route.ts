import { NextResponse } from "next/server";
import { AuthError, getAuthContext, getProfile } from "@/lib/auth-context";
import { createAdminClient } from "@/lib/supabase/server";

/* GET /api/me: the current user's profile (role, credits, status). Used
 *  by client components to show credit balance and gate UI by role. */
export async function GET() {
  try {
    const p = await getProfile();
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_users")
      .select("notifications_enabled")
      .eq("id", p.userId)
      .maybeSingle();

    return NextResponse.json({
      userId: p.userId,
      email: p.email,
      role: p.role,
      agencyName: p.agencyName,
      contactName: p.contactName,
      creditsRemaining: p.creditsRemaining,
      creditsUsed: p.creditsUsed,
      status: p.status,
      notificationsEnabled: data?.notifications_enabled ?? true,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

interface PatchBody {
  agencyName?: string;
  contactName?: string;
  notificationsEnabled?: boolean;
}

/* PATCH /api/me: update profile fields for the current user only
 *  (agency name, contact name, notification preference). Any subset
 *  of fields may be sent; only the provided ones are changed. */
export async function PATCH(request: Request) {
  try {
    const ctx = await getAuthContext();
    const body: PatchBody = await request.json();

    const updates: Record<string, string | boolean> = {};
    if (typeof body.agencyName === "string") updates.agency_name = body.agencyName;
    if (typeof body.contactName === "string") updates.contact_name = body.contactName;
    if (typeof body.notificationsEnabled === "boolean") {
      updates.notifications_enabled = body.notificationsEnabled;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_users")
      .update(updates)
      .eq("id", ctx.userId)
      .select("id, email, role, agency_name, contact_name, credits_remaining, credits_used, status, notifications_enabled")
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({
      userId: data.id,
      email: data.email ?? ctx.email,
      role: data.role,
      agencyName: data.agency_name,
      contactName: data.contact_name,
      creditsRemaining: Number(data.credits_remaining ?? 0),
      creditsUsed: Number(data.credits_used ?? 0),
      status: data.status,
      notificationsEnabled: data.notifications_enabled ?? true,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
