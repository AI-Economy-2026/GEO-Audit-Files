import { NextRequest, NextResponse } from "next/server";
import { sendContactEmail } from "@/lib/contact-email";

// POST /api/contact: public endpoint for the marketing site's contact form.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email, company, topic, message } = body;

  if (!name || !email || !message) {
    return NextResponse.json({ error: "Name, email and message are required." }, { status: 400 });
  }

  const sent = await sendContactEmail({ name, email, company: company || "", topic: topic || "", message });
  if (!sent) {
    return NextResponse.json({ error: "Failed to send your message. Please try again." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
