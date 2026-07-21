import { NextResponse } from "next/server";
import { AuthError, getProfile } from "@/lib/auth-context";

/* GET /api/me: the current user's profile (role, credits, status). Used
 *  by client components to show credit balance and gate UI by role. */
export async function GET() {
  try {
    const p = await getProfile();
    return NextResponse.json({
      userId: p.userId,
      email: p.email,
      role: p.role,
      agencyName: p.agencyName,
      contactName: p.contactName,
      creditsRemaining: p.creditsRemaining,
      creditsUsed: p.creditsUsed,
      status: p.status,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
