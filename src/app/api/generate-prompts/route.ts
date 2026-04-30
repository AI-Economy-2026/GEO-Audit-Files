import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";

const WORKER_URL = (process.env.GEO_WORKER_URL || "").replace(/\/+$/, "");
const WORKER_API_KEY = process.env.GEO_WORKER_API_KEY;

export async function POST(req: NextRequest) {
  try {
    // Ensure the user is authenticated 
    await getAuthContext();
    
    const body = await req.json();
    const { brand_name, brand_url, competitors, keywords } = body;

    // Validate
    if (!brand_name || !brand_url) {
      return NextResponse.json(
        { error: "brand_name and brand_url are required." },
        { status: 400 }
      );
    }

    if (!WORKER_URL || !WORKER_API_KEY) {
      return NextResponse.json(
        { error: "Worker URL or API Key is not configured." },
        { status: 500 }
      );
    }

    // Call the Python worker
    const response = await fetch(`${WORKER_URL}/api/generate-prompts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_API_KEY}`,
      },
      body: JSON.stringify({
        brand_name,
        brand_url,
        competitors: competitors || [],
        keywords: keywords || []
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Worker failed: ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.error("Error connecting to generate-prompts proxy:", err);
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
