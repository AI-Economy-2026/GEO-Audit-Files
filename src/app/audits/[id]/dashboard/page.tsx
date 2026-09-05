"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import AskSarahCard from "@/components/audit/AskSarahCard";
import { useAuditData, tone, statusForEngine } from "@/components/audit/useAuditData";
import { useOverviewInsights } from "@/lib/use-overview-insights";
import type { NextStepCard } from "@/lib/overview-insights";
import { useMe } from "@/lib/me-context";

const BENCHMARKS = { visibility: { industry: 30, top25: 50 } };

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, history, results, loading } = useAuditData(id);
  const { insights } = useOverviewInsights(id);
  const { me } = useMe();

  const previous = useMemo(() => {
    if (!audit || history.length < 2) return null;
    const idx = history.findIndex((h) => h.id === audit.id);
    return idx > 0 ? history[idx - 1] : null;
  }, [audit, history]);

  const visRate = audit?.visibility_rate ?? 0;
  const deltaVsLast = previous?.visibility_rate != null ? +(visRate - previous.visibility_rate).toFixed(1) : null;

  const engineBreakdown = audit?.summary_json?.engine_breakdown || {};
  const sortedEngines = Object.entries(engineBreakdown).sort((a, b) => b[1].visibility_rate - a[1].visibility_rate);

  const validResults = useMemo(
    () => results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]")),
    [results]
  );

  const linkSplit = useMemo(() => {
    const mentioned = validResults.filter((r) => r.brand_mentioned);
    if (!mentioned.length) return null;
    const withLink = mentioned.filter((r) => r.url_cited).length;
    const noLink = mentioned.length - withLink;
    return {
      withLinkPct: Math.round((withLink / validResults.length) * 100),
      noLinkPct: Math.round((noLink / validResults.length) * 100),
    };
  }, [validResults]);

  const promptStats = useMemo(() => {
    const byPrompt = new Map<number, boolean>();
    validResults.forEach((r) => {
      byPrompt.set(r.prompt_id, byPrompt.get(r.prompt_id) || r.brand_mentioned);
    });
    const total = byPrompt.size;
    const covered = Array.from(byPrompt.values()).filter(Boolean).length;
    return { covered, total, gaps: total - covered };
  }, [validResults]);

  const engineCoverage = useMemo(() => {
    const citing = sortedEngines.filter(([, e]) => e.brand_mentioned > 0).length;
    return { citing, total: sortedEngines.length };
  }, [sortedEngines]);

  const competitorLead = useMemo(() => {
    const counts = audit?.summary_json?.competitor_analysis?.mention_counts || {};
    const topName = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topName || !promptStats.total) return null;

    const promptsNamingCompetitor = new Set<number>();
    validResults.forEach((r) => {
      if ((r.competitor_mentions || []).includes(topName)) promptsNamingCompetitor.add(r.prompt_id);
    });

    return { name: topName, pct: Math.round((promptsNamingCompetitor.size / promptStats.total) * 100) };
  }, [audit, validResults, promptStats.total]);

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p>
            {audit.brand_url} &middot; {audit.summary_json?.audit_metadata?.total_prompts ?? "-"} prompts &middot;{" "}
            {audit.engines?.length ?? 0} engines &middot; Run {formatDate(audit.completed_at)}
          </p>
        </div>
        <div className="actions">
          <span className="chip chip-good chip-lg">Completed</span>
        </div>
      </div>

      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-label">Overall AI visibility</div>
          <div className="hero-headline">
            {Math.round(visRate)}
            <span className="slash">%</span>
          </div>
          {deltaVsLast != null && (
            <span className={`chip ${deltaVsLast >= 0 ? "chip-good" : "chip-crit"}`} style={{ marginTop: 10, alignSelf: "flex-start" }}>
              {deltaVsLast > 0 ? "▲" : deltaVsLast < 0 ? "▼" : "±"} {Math.abs(deltaVsLast)} points since last audit
            </span>
          )}
          <div className="hero-summary">
            {audit.brand_name} is named in about {Math.round(visRate)}% of tracked answers.
            {linkSplit && ` Most of that is ${linkSplit.withLinkPct > linkSplit.noLinkPct ? "cited with a link back" : "mentioned with no link"} to the site.`}
          </div>
          {linkSplit && (
            <div style={{ marginTop: 18, maxWidth: 360 }}>
              <div className="bar" style={{ display: "flex" }}>
                <div className="bar-fill good" style={{ width: `${linkSplit.withLinkPct}%` }} />
                <div className="bar-fill warn" style={{ width: `${linkSplit.noLinkPct}%` }} />
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 10, fontSize: 12, color: "var(--text-3)" }}>
                <span><span className="dot good" style={{ marginRight: 6 }} />Cited with a link {linkSplit.withLinkPct}%</span>
                <span><span className="dot warn" style={{ marginRight: 6 }} />Mentioned, no link {linkSplit.noLinkPct}%</span>
              </div>
            </div>
          )}
        </div>
        <div className="hero-right">
          <div className="hero-benchmarks" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
            <div className="hero-bm-item">
              <div className="hero-bm-label">Industry avg</div>
              <div className="hero-bm-value"><span className="num">{BENCHMARKS.visibility.industry}</span></div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">Top 25%</div>
              <div className="hero-bm-value"><span className="num">{BENCHMARKS.visibility.top25}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* STAT STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Engines citing you</div>
          <div className="kpi-number">
            {engineCoverage.citing}<span className="unit">/{engineCoverage.total}</span>
          </div>
          <div className="kpi-sub">across every engine tested</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Prompts covered</div>
          <div className="kpi-number">
            {promptStats.covered}<span className="unit">/{promptStats.total}</span>
          </div>
          <div className="kpi-sub">at least one engine names you</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Gaps to close</div>
          <div className={`kpi-number ${promptStats.gaps > 0 ? "num-warn" : "num-good"}`}>{promptStats.gaps}</div>
          <div className="kpi-sub">prompts with no mention anywhere</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Competitor lead</div>
          {competitorLead ? (
            <>
              <div className="kpi-number" style={{ fontSize: 24 }}>{competitorLead.name}</div>
              <div className="kpi-sub">named in {competitorLead.pct}% of the same prompts</div>
            </>
          ) : (
            <>
              <div className="kpi-number">-</div>
              <div className="kpi-sub">no competitor data tracked</div>
            </>
          )}
        </div>
      </div>

      {/* ENGINE TABLE */}
      {sortedEngines.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2>How you show up in AI search engines</h2>
              <div className="sub">Each engine reads different sources, so results vary engine to engine.</div>
            </div>
          </div>
          <div className="table-wrap">
            <div className="scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Engine</th>
                    <th>Visibility</th>
                    <th className="center">Prompts hit</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEngines.map(([key, e]) => {
                    const status = statusForEngine(e.visibility_rate);
                    return (
                      <tr key={key}>
                        <td style={{ fontWeight: 600 }}>{e.display_name}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className="bar" style={{ flex: 1, maxWidth: 180 }}>
                              <div className={`bar-fill ${tone(e.visibility_rate)}`} style={{ width: `${e.visibility_rate}%` }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 14, width: 40, textAlign: "right" }}>
                              {Math.round(e.visibility_rate)}%
                            </span>
                          </div>
                        </td>
                        <td className="center">{e.brand_mentioned} / {e.total_queries}</td>
                        <td>
                          <span className={`chip chip-${status.className}`}>{status.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NEXT STEPS */}
      {insights && insights.nextSteps.length > 0 && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2>Next steps</h2>
              <div className="sub">Start here to increase your visibility.</div>
            </div>
          </div>
          <div className="grid-3">
            {insights.nextSteps.map((step: NextStepCard, i: number) => (
              <div className="card pad-lg" key={step.tag}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--surface-3)", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)" }}>
                    {step.tag}
                  </span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 15.5, marginBottom: 10 }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 16 }}>{step.body}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--border-soft)", fontSize: 12.5 }}>
                  <span>
                    <b>Win</b> {step.promptsWon} of {step.totalPrompts}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXECUTIVE SUMMARY */}
      {insights && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2>Executive summary</h2>
              <div className="sub">The whole audit in a paragraph, for anyone who needs the short version.</div>
            </div>
          </div>
          <div className="card pad-lg">
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.7, color: "var(--text-2)" }}>{insights.executiveSummary}</p>
          </div>
        </div>
      )}

      {me?.role === "admin" && (
        <AskSarahCard
          brandName={audit.brand_name}
          visibilityRate={visRate}
          totalQueries={audit.total_queries ?? 0}
          totalMentioned={audit.total_mentioned ?? 0}
          results={results}
          engineBreakdown={Object.keys(engineBreakdown).length ? engineBreakdown : undefined}
        />
      )}
    </AuditShell>
  );
}
