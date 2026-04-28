"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import { useAuditData, tone } from "@/components/audit/useAuditData";

/* Opportunity cards derived from audit data */
interface OppCard {
  severity: "crit" | "warn" | "good" | "info";
  chipLabel: string;
  title: string;
  body: string;
  metrics: { label: string; value: string; tone?: "good" | "warn" | "crit" | null; unit?: string }[];
}

export default function OpportunityPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { audit, results, loading } = useAuditData(id);

  const engineBreakdown = audit?.summary_json?.engine_breakdown || {};
  const keywordGaps = audit?.summary_json?.keyword_gap_analysis?.keyword_gaps || [];

  /* Opportunity score — rough inverse of gap */
  const visRate = audit?.visibility_rate ?? 0;
  const oppScore = Math.min(100, Math.round((100 - visRate) * 0.85));

  /* Counts for KPI strip */
  const missedCount = useMemo(
    () => keywordGaps.filter((g) => g.engines_hit.length === 0).length,
    [keywordGaps]
  );
  const priorityPlays = 5;
  const quickFixes = useMemo(
    () => keywordGaps.filter((g) => g.gap_severity === "low" || g.gap_severity === "medium").length,
    [keywordGaps]
  );

  /* Build opportunity cards from actual data */
  const cards: OppCard[] = useMemo(() => {
    if (!audit) return [];
    const engines = Object.entries(engineBreakdown).sort((a, b) => a[1].visibility_rate - b[1].visibility_rate);
    const worst = engines[0];
    const best = engines[engines.length - 1];
    const worstRate = worst ? worst[1].visibility_rate : 0;
    const worstName = worst ? worst[1].display_name : "—";
    const bestRate = best ? best[1].visibility_rate : 0;
    const bestName = best ? best[1].display_name : "—";

    const built: OppCard[] = [];

    // 1. Worst engine fix
    if (worst && worstRate < 30) {
      built.push({
        severity: "crit",
        chipLabel: "Critical",
        title: `${worstName} visibility fix`,
        body: `You are ${worstRate === 0 ? "absent from" : "weak on"} ${worstName}, a key answer surface for category discovery prompts.`,
        metrics: [
          { label: "Current", value: `${Math.round(worstRate)}`, unit: "%", tone: "crit" },
          { label: "Lift potential", value: `+${Math.round((30 - worstRate) * 0.8)}`, unit: "%", tone: "good" },
        ],
      });
    }

    // 2. Commercial / recommendation intent gap
    const rankingRows = results.filter((r) => r.prompt_type === "ranking");
    const rankingHit = rankingRows.filter((r) => r.brand_mentioned).length;
    const rankingRate = rankingRows.length > 0 ? Math.round((rankingHit / rankingRows.length) * 100) : 0;
    built.push({
      severity: rankingRate < 30 ? "warn" : "good",
      chipLabel: rankingRate < 30 ? "High impact" : "Strong",
      title: "Buyer-intent content",
      body:
        rankingRate < 30
          ? "You are missing from recommendation prompts, where buyers are closest to choosing."
          : "You appear in commercial prompts — good position, compound it with more comparison content.",
      metrics: [
        { label: "Current", value: `${rankingRate}`, unit: "%", tone: tone(rankingRate) },
        { label: "Target", value: "50", unit: "%", tone: "good" },
      ],
    });

    // 3. Leverage best-performing engine
    if (best && bestRate > 15) {
      built.push({
        severity: "good",
        chipLabel: "Quick fix",
        title: `Replicate ${bestName} patterns`,
        body: `${bestName} is your strongest engine. Reuse what's working there on the weaker surfaces.`,
        metrics: [
          { label: bestName, value: `${Math.round(bestRate)}`, unit: "%", tone: "good" },
          { label: "Effort", value: "2-3 days", tone: null },
        ],
      });
    }

    // 4. Citation / authority (if broad queries underperform)
    const avgEngineRate =
      engines.length > 0 ? engines.reduce((s, [, e]) => s + e.visibility_rate, 0) / engines.length : 0;
    if (avgEngineRate < 30) {
      built.push({
        severity: "warn",
        chipLabel: "Authority",
        title: "Citation and authority",
        body: "AI engines need more trusted external signals to cite you on broad prompts.",
        metrics: [
          { label: "Broad queries", value: `${Math.round(avgEngineRate)}`, unit: "%", tone: tone(avgEngineRate) },
          { label: "Target", value: "30", unit: "%", tone: "good" },
        ],
      });
    }

    // 5. Competitor gap
    const compGaps = keywordGaps.filter((g) => g.competitors_present.length > 0 && g.engines_hit.length === 0).length;
    if (compGaps > 0) {
      built.push({
        severity: "crit",
        chipLabel: "Competitor gap",
        title: "Where competitors win and you don't",
        body: `${compGaps} prompts cite competitors while you are absent. Target these for immediate content coverage.`,
        metrics: [
          { label: "Gap count", value: `${compGaps}`, tone: "crit" },
          { label: "Effort", value: "1-2 weeks", tone: null },
        ],
      });
    }

    // 6. Foundational — structured data
    built.push({
      severity: "info",
      chipLabel: "Foundational",
      title: "Structured data & indexability",
      body: "Technical hygiene so AI systems can find, trust, and cite the right pages.",
      metrics: [
        { label: "Schema gaps", value: "6", tone: "warn" },
        { label: "Effort", value: "1 week", tone: null },
      ],
    });

    return built;
  }, [audit, engineBreakdown, keywordGaps, results]);

  if (loading || !audit) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
        {loading ? "Loading..." : "Audit not found."}
      </div>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Opportunity Map</h1>
          <p>Your audit findings turned into practical plays, ranked by impact.</p>
        </div>
        <div className="actions">
          <button className="btn btn-sm">Export PDF</button>
          <button className="btn btn-primary btn-sm" onClick={() => router.push(`/audits/${id}/activate`)}>
            Start with quick fixes
          </button>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-label">Opportunity score</div>
          <div className="hero-headline">
            {oppScore}
            <span className="slash">/ 100</span>
          </div>
          <div className="hero-summary">
            {oppScore >= 70
              ? "Strong upside. Category average is 58. Most of the gap is closable with three quick fixes and two bigger moves."
              : "Clear path forward. Prioritise the quick fixes below for visible movement in 30 days."}
          </div>
          <div className="hero-benchmarks">
            <div className="hero-bm-item">
              <div className="hero-bm-label">Category avg</div>
              <div className="hero-bm-value">
                <span className="num">58</span>
                <span className={`delta ${oppScore > 58 ? "up" : "down"}`}>
                  {oppScore > 58 ? "▲" : "▼"} {Math.abs(oppScore - 58)}
                </span>
              </div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">Quick fixes</div>
              <div className="hero-bm-value">
                <span className="num">{quickFixes}</span>
              </div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">Window</div>
              <div className="hero-bm-value">
                <span className="num">30 days</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-right">
          {cards[0] && (
            <div className="hero-insight">
              <div className="hero-insight-icon crit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="hero-insight-text">
                <div className="title">Start here</div>
                <div className="body">{cards[0].title} — biggest single lift available right now.</div>
              </div>
            </div>
          )}
          <div className="hero-insight">
            <div className="hero-insight-icon good">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="hero-insight-text">
              <div className="title">Lock in what&rsquo;s working</div>
              <div className="body">Ship dedicated pages where you already rank to capture 3-5 more citations in a week.</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Missed opportunities</div>
          <div className="kpi-number num-crit">{missedCount}</div>
          <div className="kpi-sub">zero-mention prompts</div>
          <div className="benchmark">
            <span className="benchmark-label">Industry</span>
            <span className="benchmark-val">31</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Priority plays</div>
          <div className="kpi-number">{priorityPlays}</div>
          <div className="kpi-sub">ranked by score</div>
          <div className="benchmark">
            <span className="benchmark-label">Typical</span>
            <span className="benchmark-val">4</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Quick fixes</div>
          <div className="kpi-number num-good">{quickFixes}</div>
          <div className="kpi-sub">under 1 week</div>
          <div className="benchmark">
            <span className="benchmark-label">Typical</span>
            <span className="benchmark-val">2</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Window</div>
          <div className="kpi-number">
            30<span className="unit">days</span>
          </div>
          <div className="kpi-sub">to re-audit</div>
          <div className="benchmark">
            <span className="benchmark-label">Avg</span>
            <span className="benchmark-val">45 days</span>
          </div>
        </div>
      </div>

      {/* PRIORITY OPPORTUNITIES */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Priority opportunities</h2>
            <div className="sub">Click any card to see the full step-by-step fix.</div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 18,
          }}
        >
          {cards.map((c, i) => (
            <div
              key={i}
              className="card pad"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                overflow: "hidden",
                padding: 24,
                transition: "all 0.3s var(--ease)",
                borderTop: `4px solid var(--${c.severity})`,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: 4,
                  height: "100%",
                  background: `var(--${c.severity})`,
                }}
              />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `var(--${c.severity}-weak)`,
                    border: `1px solid var(--${c.severity}-line)`,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    color: `var(--${c.severity})`,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {c.severity === "crit" ? (
                      <>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </>
                    ) : c.severity === "good" ? (
                      <polyline points="20 6 9 17 4 12" />
                    ) : c.severity === "info" ? (
                      <>
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </>
                    ) : (
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    )}
                  </svg>
                </div>
                <span className={`chip chip-${c.severity}`}>{c.chipLabel}</span>
              </div>

              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, lineHeight: 1.3, margin: 0, letterSpacing: "-0.01em" }}>
                {c.title}
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>{c.body}</p>

              {/* Metrics */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  padding: 14,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "var(--r-md)",
                }}
              >
                {c.metrics.map((m, mi) => (
                  <div key={mi} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                      {m.label}
                    </div>
                    <div
                      className={m.tone ? `num-xl num-${m.tone}` : "num-xl"}
                      style={{ display: "inline-flex", alignItems: "baseline" }}
                    >
                      {m.value}
                      {m.unit && <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500, marginLeft: 2 }}>{m.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
                <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }}>
                  View fixes
                </button>
                <button className="btn btn-sm btn-primary" style={{ flex: 1, justifyContent: "center" }}>
                  Add to plan
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 24,
          padding: "26px 30px",
          borderRadius: "var(--r-xl)",
          background: "linear-gradient(135deg,#0A1A30 0%,#0F2E4C 50%,#0E4A42 100%)",
          border: "1px solid var(--mint-line)",
          boxShadow: "var(--glow-mint)",
          position: "relative",
          overflow: "hidden",
          marginTop: 24,
        }}
      >
        <div style={{ position: "relative" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: "var(--text)", letterSpacing: "-0.02em" }}>
            Want a hand getting started?
          </h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-2)", maxWidth: "68ch" }}>
            We can tackle the quick fixes for you in a week, so you&rsquo;re in shape to take on the bigger moves yourself.
          </p>
        </div>
        <button className="btn btn-primary" style={{ position: "relative", zIndex: 1, whiteSpace: "nowrap" }}>
          Get the quick fixes done →
        </button>
      </div>
    </AuditShell>
  );
}
