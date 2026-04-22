"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ════════════════════════════════════════════════════════════════════
   BENCHMARKS — hardcoded defaults until Sarah provides industry numbers.
   These become the "Industry avg" and "Top 25%" anchors on every KPI.
   ════════════════════════════════════════════════════════════════════ */
const BENCHMARKS = {
  visibility: { industry: 30, top25: 50 },
  engineVis: { industry: 28 },
  prompts: { industry: 50 },
  mentions: { top25: 42 },
} as const;

/* ════════════════════════════════════════════════════════════════════ */

interface EngineStats {
  display_name: string;
  visibility_rate: number;
  brand_mentioned: number;
  total_queries: number;
}

interface SummaryJson {
  audit_metadata?: {
    brand: string;
    generated_at: string;
    total_prompts: number;
    total_queries: number;
    errors: number;
  };
  overall_visibility?: { brand_mentioned_count: number; visibility_rate_percent: number };
  engine_breakdown?: Record<string, EngineStats>;
  category_performance?: Record<string, { total_queries: number; brand_mentioned: number; visibility_rate: number }>;
  competitor_analysis?: { mention_counts: Record<string, number>; most_mentioned: string | null };
}

interface AuditData {
  id: string;
  brand_name: string;
  brand_url: string;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  engines: string[];
  competitors: string[];
  keywords: string[];
  completed_at: string | null;
  duration_seconds: number | null;
  summary_json: SummaryJson | null;
  parent_audit_id: string | null;
  version: number;
}

interface HistoryEntry {
  id: string;
  version: number;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  completed_at: string | null;
}

interface ResultRow {
  prompt_id: number;
  category: string;
  prompt_text: string;
  engine: string;
  engine_display: string;
  brand_mentioned: boolean;
  competitor_mentions: string[];
  response_text: string | null;
  prompt_type: string | null;
}

/* ════════════════════════════════════════════════════════════════════
   Visibility tone — mint RESERVED for brand only; sage = good (60+),
   gold = medium (30-60), rose = critical (<30).
   ════════════════════════════════════════════════════════════════════ */
function tone(rate: number): "good" | "warn" | "crit" {
  if (rate >= 60) return "good";
  if (rate >= 30) return "warn";
  return "crit";
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function Delta({ value, suffix = "" }: { value: number | null; suffix?: string }) {
  if (value == null || isNaN(value)) return <span className="delta" style={{ color: "var(--text-4)" }}>—</span>;
  if (value === 0) return <span className="delta" style={{ color: "var(--text-4)" }}>±0{suffix}</span>;
  const up = value > 0;
  return (
    <span className={`delta ${up ? "up" : "down"}`}>
      {up ? "▲" : "▼"} {Math.abs(value).toFixed(0)}{suffix}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const [auditRes, histRes, resRes] = await Promise.all([
        fetch(`/api/geo-audits/${id}`).then((r) => r.json()),
        fetch(`/api/geo-audits/${id}/history`).then((r) => r.json()),
        sb
          .from("geo_audit_results")
          .select("prompt_id, category, prompt_text, engine, engine_display, brand_mentioned, competitor_mentions, response_text, prompt_type")
          .eq("audit_id", id)
          .order("prompt_id"),
      ]);
      if (auditRes.audit) setAudit(auditRes.audit);
      if (histRes.history) setHistory(histRes.history);
      if (resRes.data) setResults(resRes.data as ResultRow[]);
      setLoading(false);
    }
    load();
  }, [id]);

  /* ═══════════════ Derived values ═══════════════ */

  const baseline = history[0] ?? null; // version 1 = baseline
  const previous = useMemo(() => {
    if (!audit || history.length < 2) return null;
    const idx = history.findIndex((h) => h.id === audit.id);
    return idx > 0 ? history[idx - 1] : null;
  }, [audit, history]);

  const visRate = audit?.visibility_rate ?? 0;
  const isFirstAudit = !baseline || baseline.id === audit?.id;
  const deltaVsLast = previous?.visibility_rate != null ? +(visRate - previous.visibility_rate).toFixed(1) : null;
  const deltaVsBaseline = baseline?.visibility_rate != null && !isFirstAudit ? +(visRate - baseline.visibility_rate).toFixed(1) : null;
  const deltaVsIndustry = +(visRate - BENCHMARKS.visibility.industry).toFixed(1);

  const engineBreakdown = audit?.summary_json?.engine_breakdown || {};
  const sortedEngines = Object.entries(engineBreakdown).sort((a, b) => b[1].visibility_rate - a[1].visibility_rate);

  /* Category rankings with SOV — computed client-side */
  const sovStats = useMemo(() => {
    if (!audit || !results.length) return null;
    const valid = results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]"));
    const clientMentions = valid.filter((r) => r.brand_mentioned).length;
    const compCounts: Record<string, number> = {};
    valid.forEach((r) => (r.competitor_mentions || []).forEach((c) => { compCounts[c] = (compCounts[c] || 0) + 1; }));
    const totalMentions = clientMentions + Object.values(compCounts).reduce((s, n) => s + n, 0);
    const sov = totalMentions > 0 ? Math.round((clientMentions / totalMentions) * 100) : 0;
    const ranked = [
      { brand: audit.brand_name, mentions: clientMentions, isClient: true },
      ...Object.entries(compCounts).map(([b, c]) => ({ brand: b, mentions: c, isClient: false })),
    ].sort((a, b) => b.mentions - a.mentions);
    return { sov, totalMentions, clientMentions, ranked };
  }, [audit, results]);

  /* Prompt-type breakdown (intent vs ranking) with industry benchmark markers */
  const promptTypeBreakdown = useMemo(() => {
    if (!results.length) return [];
    const types: Array<"intent" | "ranking"> = ["intent", "ranking"];
    return types.map((t) => {
      const rows = results.filter((r) => r.prompt_type === t);
      const mentioned = rows.filter((r) => r.brand_mentioned).length;
      const rate = rows.length > 0 ? Math.round((mentioned / rows.length) * 100) : 0;
      return {
        type: t,
        label: t === "intent" ? "Informational / intent prompts" : "Ranking / commercial prompts",
        rate,
        mentioned,
        total: rows.length,
        // Rough industry markers per prompt type
        industryAvg: t === "intent" ? 28 : 35,
      };
    });
  }, [results]);

  /* Biggest gap & strength insights */
  const insights = useMemo(() => {
    if (!sortedEngines.length) return { gap: null, strength: null };
    const worst = sortedEngines[sortedEngines.length - 1];
    const best = sortedEngines[0];
    return {
      gap: worst ? { name: worst[1].display_name, rate: worst[1].visibility_rate } : null,
      strength: best ? { name: best[1].display_name, rate: best[1].visibility_rate } : null,
    };
  }, [sortedEngines]);

  /* Opportunity score — rough: inverse of gap, 0-100 */
  const opportunityScore = Math.min(100, Math.round((100 - visRate) * 0.85));

  /* ═══════════════ Render ═══════════════ */

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text-3)" }}>
        Loading dashboard...
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: "var(--text-3)" }}>
        Audit not found.
      </div>
    );
  }

  const visTone = tone(visRate);
  const sovTone = sovStats ? tone(sovStats.sov) : "crit";
  const oppTone = "good"; // opportunity score always shown in mint as upside

  return (
    <div className="min-h-screen">
      {/* TOP BAR */}
      <div
        className="flex items-center justify-between sticky top-0 z-50"
        style={{
          padding: "14px 32px",
          background: "rgba(14,26,45,.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div className="flex items-center gap-3" style={{ fontSize: 13, color: "var(--text-3)" }}>
          <button onClick={() => router.push(`/audits/${id}`)} className="flex items-center gap-2 hover:text-white transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Audit detail
          </button>
          <span style={{ color: "var(--text-4)" }}>/</span>
          <strong style={{ color: "var(--text-2)", fontWeight: 600 }}>{audit.brand_name}</strong>
          <span style={{ color: "var(--text-4)" }}>/</span>
          <span>
            Visibility audit <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-4)" }}>#V-{audit.id.slice(0, 4).toUpperCase()}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-sm">Export PDF</button>
          <button className="btn btn-sm">Share</button>
          <button className="btn btn-sm btn-primary" onClick={() => router.push(`/audits/${id}`)}>
            Re-audit
          </button>
        </div>
      </div>

      <main style={{ padding: "28px 36px 60px", maxWidth: 1320, margin: "0 auto" }}>
        {/* PAGE HEAD */}
        <div className="page-head">
          <div>
            <h1>{audit.brand_name}</h1>
            <p>
              Your AI Search Visibility Rank across {audit.engines?.length ?? 0} AI engines and {audit.summary_json?.audit_metadata?.total_prompts ?? "—"} buyer prompts.
            </p>
          </div>
          <div className="actions">
            <span className="chip chip-neutral chip-lg">Completed {fmtDuration(audit.duration_seconds)}</span>
            {isFirstAudit ? (
              <span className="chip chip-mint chip-lg">Baseline audit</span>
            ) : (
              <span className="chip chip-good chip-lg">Fresh data</span>
            )}
          </div>
        </div>

        {/* HERO */}
        <div className="hero">
          <div className="hero-left">
            <div className="hero-label">Your AI Search Visibility Rank</div>
            <div className="hero-headline">
              {Math.round(visRate)}
              <span className="slash">/ 100</span>
              {deltaVsLast != null && (
                <span className={`big-delta ${deltaVsLast > 0 ? "up" : deltaVsLast < 0 ? "down" : ""}`}>
                  {deltaVsLast > 0 ? "▲" : deltaVsLast < 0 ? "▼" : "±"} {Math.abs(deltaVsLast)}
                </span>
              )}
            </div>
            <div className="hero-summary">
              {audit.brand_name} appears in about {Math.round(visRate)}% of AI answers for your category.
              {isFirstAudit
                ? " This is your baseline — future audits will track movement from here."
                : deltaVsLast != null && deltaVsLast > 0
                  ? ` Up ${deltaVsLast} points since last audit — moving in the right direction.`
                  : deltaVsLast != null && deltaVsLast < 0
                    ? ` Down ${Math.abs(deltaVsLast)} points since last audit — needs attention.`
                    : " Movement flat since last audit."}
            </div>
            <div className="hero-benchmarks">
              <div className="hero-bm-item">
                <div className="hero-bm-label">Industry avg</div>
                <div className="hero-bm-value">
                  <span className="num">{BENCHMARKS.visibility.industry}</span>
                  <Delta value={deltaVsIndustry} />
                </div>
              </div>
              <div className="hero-bm-item">
                <div className="hero-bm-label">Top 25%</div>
                <div className="hero-bm-value">
                  <span className="num">{BENCHMARKS.visibility.top25}</span>
                  <Delta value={+(visRate - BENCHMARKS.visibility.top25).toFixed(1)} />
                </div>
              </div>
              {!isFirstAudit && baseline?.visibility_rate != null && (
                <div className="hero-bm-item">
                  <div className="hero-bm-label">Baseline (v1)</div>
                  <div className="hero-bm-value">
                    <span className="num">{Math.round(baseline.visibility_rate)}</span>
                    <Delta value={deltaVsBaseline} />
                  </div>
                </div>
              )}
              {previous?.visibility_rate != null && (
                <div className="hero-bm-item">
                  <div className="hero-bm-label">Last audit</div>
                  <div className="hero-bm-value">
                    <span className="num">{Math.round(previous.visibility_rate)}</span>
                    <Delta value={deltaVsLast} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="hero-right">
            {insights.gap && (
              <div className="hero-insight">
                <div className="hero-insight-icon crit">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="hero-insight-text">
                  <div className="title">Biggest gap</div>
                  <div className="body">
                    {Math.round(insights.gap.rate)}% visibility on <strong style={{ color: "var(--text)" }}>{insights.gap.name}</strong>. This is where
                    recovery effort has the highest leverage.
                  </div>
                </div>
              </div>
            )}
            {insights.strength && (
              <div className="hero-insight">
                <div className="hero-insight-icon good">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="hero-insight-text">
                  <div className="title">Biggest strength</div>
                  <div className="body">
                    {insights.strength.name} cites you on {Math.round(insights.strength.rate)}% of prompts — your strongest engine.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* KPI STRIP */}
        <div className="kpi-strip">
          <div className="kpi">
            <div className="kpi-label">Prompts tested</div>
            <div className="kpi-number">{audit.summary_json?.audit_metadata?.total_prompts ?? "—"}</div>
            <div className="kpi-sub">across {audit.engines?.length ?? 0} engines</div>
            <div className="benchmark">
              <span className="benchmark-label">Industry</span>
              <span className="benchmark-val">{BENCHMARKS.prompts.industry}</span>
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Brand mentions</div>
            <div className={`kpi-number num-${tone(visRate)}`}>{audit.total_mentioned ?? 0}</div>
            <div className="kpi-sub">of {audit.total_queries ?? 0} possible</div>
            <div className="benchmark">
              <span className="benchmark-label">Top 25%</span>
              <span className="benchmark-val">{BENCHMARKS.mentions.top25}+</span>
            </div>
          </div>
          {sovStats && (
            <div className="kpi">
              <div className="kpi-label">Share of voice</div>
              <div className={`kpi-number num-${sovTone}`}>
                {sovStats.sov}<span className="unit">%</span>
              </div>
              <div className="kpi-sub">{sovStats.clientMentions} of {sovStats.totalMentions} brand mentions</div>
              <div className="benchmark">
                <span className="benchmark-label">Category</span>
                <span className="benchmark-val">Mid</span>
              </div>
            </div>
          )}
          <div className="kpi">
            <div className="kpi-label">Opportunity</div>
            <div className={`kpi-number num-${oppTone}`}>{opportunityScore}</div>
            <div className="kpi-sub">upside score</div>
            <div className="benchmark">
              <span className="benchmark-label">Addressable gap</span>
              <span className="benchmark-val">{Math.round(100 - visRate)} pts</span>
            </div>
          </div>
        </div>

        {/* WHERE YOU SHOW UP — prompt type bars with industry markers */}
        {promptTypeBreakdown.length > 0 && (
          <div className="section">
            <div className="section-head">
              <div>
                <h2>Where you show up and where you don&rsquo;t</h2>
                <div className="sub">Your rate by prompt type, with industry average markers for context.</div>
              </div>
            </div>
            <div className="card pad-lg">
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {promptTypeBreakdown.map((pt) => {
                  const t = tone(pt.rate);
                  return (
                    <div key={pt.type}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                        <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{pt.label}</span>
                        <span className={`num-big num-${t}`} style={{ fontSize: 16 }}>
                          {pt.rate}
                          <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>%</span>
                        </span>
                      </div>
                      <div className="benchmark-bar">
                        <div
                          className="fill"
                          style={{
                            width: `${Math.max(pt.rate, 2)}%`,
                            background:
                              t === "good"
                                ? "linear-gradient(90deg,var(--good),var(--good-2))"
                                : t === "warn"
                                  ? "linear-gradient(90deg,var(--warn),var(--warn-2))"
                                  : "linear-gradient(90deg,var(--crit),var(--crit-2))",
                            borderRadius: 999,
                          }}
                        />
                        <div className="marker" style={{ left: `${pt.industryAvg}%` }}>
                          <span className="marker-label">Avg {pt.industryAvg}%</span>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 12 }}>
                        {pt.mentioned} of {pt.total} prompts mentioned you
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ENGINE PERFORMANCE */}
        {sortedEngines.length > 0 && (
          <div className="section">
            <div className="section-head">
              <div>
                <h2>How each engine sees you</h2>
                <div className="sub">Percentage of prompts where each AI engine cites {audit.brand_name}.</div>
              </div>
            </div>
            <div className="grid-3">
              {sortedEngines.map(([key, stats]) => {
                const t = tone(stats.visibility_rate);
                const chipLabel = t === "good" ? "Strongest" : t === "warn" ? "Medium" : stats.visibility_rate === 0 ? "Absent" : "Weak";
                const industryDelta = +(stats.visibility_rate - BENCHMARKS.engineVis.industry).toFixed(1);
                return (
                  <div key={key} className="engine-card">
                    <div className="engine-head">
                      <div className="engine-name">
                        <span className={`engine-dot ${t}`} /> {stats.display_name}
                      </div>
                      <span className={`chip chip-${t}`}>{chipLabel}</span>
                    </div>
                    <div className={`engine-pct num-${t}`}>
                      {Math.round(stats.visibility_rate)}
                      <span className="unit">%</span>
                    </div>
                    <div className="engine-sub">
                      {stats.brand_mentioned} of {stats.total_queries} prompts
                    </div>
                    <div className="bar" style={{ width: "100%" }}>
                      <div className={`bar-fill ${t}`} style={{ width: `${Math.max(stats.visibility_rate, 2)}%` }} />
                    </div>
                    <div className="benchmark" style={{ marginTop: 12 }}>
                      <span className="benchmark-label">Industry</span>
                      <span className="benchmark-val">{BENCHMARKS.engineVis.industry}%</span>
                      <Delta value={industryDelta} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* COMPETITOR MENTIONS */}
        {sovStats && sovStats.ranked.length > 0 && (
          <div className="section">
            <div className="section-head">
              <div>
                <h2>Share of voice — you vs competitors</h2>
                <div className="sub">Total brand mentions across all AI responses. Your share is the headline number.</div>
              </div>
            </div>
            <div>
              {sovStats.ranked.slice(0, 8).map((b, i) => {
                const pct = sovStats.totalMentions > 0 ? Math.round((b.mentions / sovStats.totalMentions) * 100) : 0;
                return (
                  <div key={b.brand} className={`comp-row ${b.isClient ? "is-you" : ""}`}>
                    <div className="comp-rank">#{i + 1}</div>
                    <div>
                      <div className="comp-name">
                        {b.brand}{" "}
                        {b.isClient && <span className="chip chip-mint" style={{ marginLeft: 6 }}>You</span>}
                      </div>
                    </div>
                    <div>
                      <div className="bar">
                        <div
                          className={`bar-fill ${b.isClient ? "mint" : "info"}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                    <div className="comp-mentions">{b.mentions}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ASK SARAH */}
        <div className="ask-sarah">
          <div className="ask-avatar">S</div>
          <div className="ask-body">
            <h4>Ask Sarah</h4>
            <p>Want this explained in plain English, or need a steer on what to tackle first?</p>
            <div className="ask-prompts">
              <button className="ask-prompt">What does this mean for us?</button>
              <button className="ask-prompt">What should we work on first?</button>
              <button className="ask-prompt">What&rsquo;s doable in 30 days?</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
