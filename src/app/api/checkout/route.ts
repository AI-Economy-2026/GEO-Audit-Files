import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";

export type ProductType = "tier" | "bundle" | "white_label";

const VALID_PRODUCT_TYPES: ProductType[] = ["tier", "bundle", "white_label"];

const WORKER_URL = (process.env.GEO_WORKER_URL || "").replace(/\/+$/, "");
const WORKER_API_KEY = process.env.GEO_WORKER_API_KEY;

// POST /api/checkout: authenticated user starts a Stripe Checkout session
// for an audit tier, a credit bundle, or the white-label subscription.
// Thin proxy: this route only authenticates the browser session (Python has
// no cookie/session access) and forwards to the worker, which owns the
// Stripe integration end to end. Mirrors the pattern in
// src/app/api/geo-audits/route.ts (WORKER_URL + WORKER_API_KEY + Bearer auth).
export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    const body = await req.json();

    const { product_type, product_id }: { product_type: ProductType; product_id: string } = body;

    if (!VALID_PRODUCT_TYPES.includes(product_type) || !product_id) {
      return NextResponse.json(
        { error: "product_type and product_id are required." },
        { status: 400 }
      );
    }

    if (!WORKER_URL || !WORKER_API_KEY) {
      return NextResponse.json(
        { error: "Checkout worker is not configured." },
        { status: 500 }
      );
    }

    const origin = req.nextUrl.origin;

    const workerRes = await fetch(`${WORKER_URL}/api/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_API_KEY}`,
      },
      body: JSON.stringify({
        user_id: ctx.userId,
        product_type,
        product_id,
        success_url: `${origin}/audits?checkout=success`,
        cancel_url: `${origin}/audits?checkout=cancelled`,
      }),
    });

    const data = await workerRes.json().catch(() => null);

    if (!workerRes.ok || !data?.url) {
      return NextResponse.json(
        { error: data?.detail || data?.error || "Could not start checkout. Please try again." },
        { status: workerRes.status && workerRes.status >= 400 ? workerRes.status : 502 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
