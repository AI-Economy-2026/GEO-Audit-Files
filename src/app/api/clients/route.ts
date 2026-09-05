import { NextRequest, NextResponse } from "next/server";
import { getAuthContext, AuthError } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import { generateIntakeToken, generateReportSlug } from "@/lib/tokens";
import { parseTableParams } from "@/lib/table-query";
import { listClients } from "@/services/clients-service";

export async function GET(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    const params = parseTableParams(req);
    const result = await listClients(ctx.userId, params);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getAuthContext();
    const body = await req.json();
    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: "name and url are required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const intake_token = generateIntakeToken();
    const report_slug = generateReportSlug(name);

    const { data: client, error } = await supabase
      .from("geo_clients")
      .insert({
        created_by: ctx.userId,
        name,
        url,
        intake_token,
        report_slug,
        status: "pending_intake",
      })
      .select("id, intake_token, report_slug")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
