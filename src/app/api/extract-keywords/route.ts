import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/** AI fallback: many sites block scrapers (Cloudflare etc.), which used to
 *  make "auto-suggest" fail outright. When the scrape fails or finds too
 *  little, ask Claude to suggest realistic search queries for the domain. */
async function suggestWithAnthropic(url: string): Promise<string[]> {
  if (!process.env.ANTHROPIC_API_KEY) return [];
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `The business website is: ${url}
Based on the domain and whatever you can infer about this business, suggest 10 short search keywords/queries a potential customer might use when looking for this kind of business (e.g. "wordpress development agency", "best crm for startups").
Do not use em dashes. Return ONLY a JSON array of strings, no markdown.`,
        },
      ],
    });
    const raw = msg.content
      .map((b) => ("text" in b ? b.text : ""))
      .join("")
      .replace(/```json|```/g, "")
      .trim();
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr.filter((k): k is string => typeof k === "string" && k.length > 2).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

/**
 * GET /api/extract-keywords?url=example.com
 * Scrapes a website and extracts keywords from meta tags, headings, and
 * content; falls back to AI suggestions when the site can't be scraped.
 */
export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "url parameter required" }, { status: 400 });
  }

  // Normalize URL
  let url = rawUrl.trim();
  if (!url.startsWith("http")) url = `https://${url}`;

  let keywords: string[] = [];
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 GathaBot/1.0 (+https://gatha.ai)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const html = await res.text();
      keywords = extractKeywords(html);
    }
  } catch {
    // scrape failed; fall through to the AI fallback
  }

  // Fallback: scrape blocked/failed or found too little to be useful
  if (keywords.length < 3) {
    const suggested = await suggestWithAnthropic(url);
    if (suggested.length > 0) {
      return NextResponse.json({ keywords: suggested, source: "ai" });
    }
    if (keywords.length === 0) {
      return NextResponse.json(
        { error: "We couldn't read that website. Please add keywords manually." },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ keywords, source: "scrape" });
}

function extractKeywords(html: string): string[] {
  const results = new Set<string>();

  // Meta title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) {
    extractPhrases(titleMatch[1]).forEach((p) => results.add(p));
  }

  // Meta description
  const descMatch = html.match(
    /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i
  );
  if (descMatch) {
    extractPhrases(descMatch[1]).forEach((p) => results.add(p));
  }

  // Meta keywords tag
  const metaKwMatch = html.match(
    /<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i
  );
  if (metaKwMatch) {
    metaKwMatch[1].split(",").forEach((kw) => {
      const trimmed = kw.trim().toLowerCase();
      if (trimmed.length > 2 && trimmed.length < 60) {
        results.add(trimmed);
      }
    });
  }

  // H1 tags
  const h1Matches = html.matchAll(/<h1[^>]*>([^<]+)<\/h1>/gi);
  for (const match of h1Matches) {
    extractPhrases(match[1]).forEach((p) => results.add(p));
  }

  // H2 tags
  const h2Matches = html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi);
  for (const match of h2Matches) {
    extractPhrases(match[1]).forEach((p) => results.add(p));
  }

  // OG title
  const ogTitle = html.match(
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogTitle) {
    extractPhrases(ogTitle[1]).forEach((p) => results.add(p));
  }

  // OG description
  const ogDesc = html.match(
    /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i
  );
  if (ogDesc) {
    extractPhrases(ogDesc[1]).forEach((p) => results.add(p));
  }

  // Filter out too-short or generic terms
  const stopwords = new Set([
    "home", "about", "contact", "services", "the", "and", "for", "our",
    "your", "with", "that", "this", "from", "are", "was", "were", "has",
    "have", "been", "will", "can", "more", "all", "new", "get", "how",
    "what", "who", "why", "where", "when", "page", "website", "site",
  ]);

  return Array.from(results)
    .filter((kw) => kw.length > 3 && !stopwords.has(kw))
    .slice(0, 20);
}

function extractPhrases(text: string): string[] {
  // Clean HTML entities and extra whitespace
  const clean = text
    .replace(/&[a-z]+;/gi, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean || clean.length < 3) return [];

  const phrases: string[] = [];

  // Split by common delimiters
  const parts = clean.split(/[|\u2013\u2014\-:,•·]/);
  for (const part of parts) {
    const trimmed = part.trim().toLowerCase();
    if (trimmed.length > 3 && trimmed.length < 60) {
      phrases.push(trimmed);
    }
  }

  return phrases;
}
