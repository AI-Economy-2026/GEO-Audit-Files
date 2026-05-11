import { NextRequest, NextResponse } from "next/server";
import {
  buildTemplate,
  answerFollowUp,
  VALID_TARGET_TYPES,
  type ExplainTargetContext,
} from "@/lib/explanations";

// Re-export types for any clients still importing from this route
export type { ExplainTargetType, ExplainTargetContext, ExplanationPayload } from "@/lib/explanations";

/* POST /api/explain
 * Stateless explanation generator. Use when there's no audit context to
 * key against — otherwise prefer /api/geo-audits/[id]/explanations which
 * persists base + follow-ups for re-render on next open.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const target = body?.target as ExplainTargetContext | undefined;
    const followUpQuestion = body?.followUpQuestion as string | undefined;

    if (!target?.type || !VALID_TARGET_TYPES.has(target.type)) {
      return NextResponse.json(
        { error: "Invalid or missing target.type." },
        { status: 400 }
      );
    }
    if (!target.label) {
      return NextResponse.json(
        { error: "target.label is required." },
        { status: 400 }
      );
    }

    const base = buildTemplate(target);

    if (!followUpQuestion?.trim()) {
      return NextResponse.json({
        explanation: base,
        debug: { targetType: target.type, mode: "template" },
      });
    }

    const answer = await answerFollowUp(target, base, followUpQuestion.trim());
    return NextResponse.json({
      explanation: { ...base, summary: answer || base.summary, whyItMatters: "", whatToDoNext: [] },
      debug: { targetType: target.type, mode: "llm" },
    });
  } catch (err) {
    console.error("/api/explain error:", err);
    return NextResponse.json(
      { error: "Failed to generate explanation." },
      { status: 500 }
    );
  }
}
