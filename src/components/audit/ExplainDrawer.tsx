"use client";

import { useEffect, useState } from "react";
import type {
  ExplainTargetContext,
  ExplanationPayload,
} from "@/app/api/explain/route";

interface Props {
  open: boolean;
  target: ExplainTargetContext | null;
  onClose: () => void;
  /** When provided, the drawer uses the audit-scoped persistent
   *  endpoint so the base explanation + follow-ups are cached in DB
   *  and re-shown on the next open. */
  auditId?: string;
}

interface FollowUp {
  question: string;
  answer: string;
}

export default function ExplainDrawer({ open, target, onClose, auditId }: Props) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<ExplanationPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [question, setQuestion] = useState("");
  const [askingFollowUp, setAskingFollowUp] = useState(false);

  const endpoint = auditId ? `/api/geo-audits/${auditId}/explanations` : "/api/explain";

  // Fetch explanation when drawer opens with a new target; also restores
  // any persisted follow-up history when called with auditId.
  useEffect(() => {
    if (!open || !target) return;
    let cancelled = false;
    setLoading(true);
    setExplanation(null);
    setError(null);
    setFollowUps([]);
    setQuestion("");

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.explanation) {
          setExplanation(data.explanation);
          if (Array.isArray(data.follow_ups)) {
            setFollowUps(
              data.follow_ups.map((f: { question: string; answer: string }) => ({
                question: f.question,
                answer: f.answer,
              }))
            );
          }
        } else {
          setError(data.error || "Couldn't load explanation.");
        }
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load the explanation, please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, target, endpoint]);

  // ESC closes
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  async function submitFollowUp() {
    if (!question.trim() || !target) return;
    const q = question.trim();
    setAskingFollowUp(true);
    setQuestion("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, followUpQuestion: q }),
      });
      const data = await res.json();
      // Audit-scoped endpoint returns the FULL follow_ups array
      if (auditId && Array.isArray(data.follow_ups)) {
        setFollowUps(
          data.follow_ups.map((f: { question: string; answer: string }) => ({
            question: f.question,
            answer: f.answer,
          }))
        );
      } else if (data.explanation?.summary) {
        setFollowUps((prev) => [...prev, { question: q, answer: data.explanation.summary }]);
      } else {
        setFollowUps((prev) => [
          ...prev,
          { question: q, answer: data.error || "Couldn't answer that one. Try rephrasing." },
        ]);
      }
    } catch {
      setFollowUps((prev) => [
        ...prev,
        { question: q, answer: "Network error. Please try again." },
      ]);
    } finally {
      setAskingFollowUp(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(6,13,27,0.55)",
            backdropFilter: "blur(2px)",
            zIndex: 90,
            transition: "opacity .25s var(--ease)",
          }}
        />
      )}

      {/* Drawer */}
      <aside
        aria-hidden={!open}
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(480px, 100vw)",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          zIndex: 100,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform .28s var(--ease)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            padding: "22px 24px",
            borderBottom: "1px solid var(--border-soft)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--mint)",
                marginBottom: 6,
              }}
            >
              Explain this
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
                color: "var(--text)",
                lineHeight: 1.3,
              }}
            >
              {target?.label ?? ""}
              {target?.value !== undefined && target?.value !== "" && (
                <span style={{ color: "var(--text-3)", fontWeight: 500, marginLeft: 8 }}>
                  {String(target.value)}
                </span>
              )}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 8,
              width: 32,
              height: 32,
              color: "var(--text-2)",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {loading && (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>Loading explanation…</div>
          )}

          {error && !loading && (
            <div
              style={{
                padding: 14,
                borderRadius: "var(--r-md)",
                background: "var(--crit-weak)",
                border: "1px solid var(--crit-line)",
                color: "var(--text-2)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {explanation && !loading && (
            <>
              <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                {explanation.summary}
              </p>

              {explanation.whyItMatters && (
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-4)",
                      marginBottom: 6,
                    }}
                  >
                    Why it matters
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.55 }}>
                    {explanation.whyItMatters}
                  </p>
                </div>
              )}

              {explanation.whatToDoNext.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-4)",
                      marginBottom: 8,
                    }}
                  >
                    What to do next
                  </div>
                  <ul className="action-list" style={{ fontSize: 13 }}>
                    {explanation.whatToDoNext.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(explanation.effortLevel || explanation.expectedImpact) && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  {explanation.effortLevel && (
                    <span
                      className={`chip ${
                        explanation.effortLevel === "low"
                          ? "chip-good"
                          : explanation.effortLevel === "high"
                            ? "chip-crit"
                            : "chip-warn"
                      }`}
                    >
                      Effort: {explanation.effortLevel}
                    </span>
                  )}
                  {explanation.expectedImpact && (
                    <span
                      className={`chip ${
                        explanation.expectedImpact === "high"
                          ? "chip-good"
                          : explanation.expectedImpact === "low"
                            ? "chip-neutral"
                            : "chip-warn"
                      }`}
                    >
                      Impact: {explanation.expectedImpact}
                    </span>
                  )}
                </div>
              )}

              {/* Follow-ups */}
              {followUps.length > 0 && (
                <div style={{ marginTop: 24, borderTop: "1px solid var(--border-soft)", paddingTop: 18 }}>
                  {followUps.map((f, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--mint)",
                          marginBottom: 6,
                        }}
                      >
                        Q: {f.question}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: "var(--text)",
                          lineHeight: 1.55,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {f.answer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Follow-up input */}
        {explanation && !loading && (
          <div
            style={{
              borderTop: "1px solid var(--border-soft)",
              padding: "14px 24px 18px",
              background: "var(--inset)",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !askingFollowUp) submitFollowUp();
                }}
                placeholder="Ask a follow-up about this recommendation…"
                disabled={askingFollowUp}
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                  fontSize: 13,
                  outline: "none",
                  fontFamily: "var(--font-body)",
                }}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={submitFollowUp}
                disabled={askingFollowUp || !question.trim()}
              >
                {askingFollowUp ? "…" : "Ask"}
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
