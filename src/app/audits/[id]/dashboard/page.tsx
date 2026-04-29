"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import AskSarahCard from "@/components/audit/AskSarahCard";
import { useAuditData, tone } from "@/components/audit/useAuditData";

const BENCHMARKS = {
  visibility: { industry: 30, top25: 50 },
  prompts: { industry: 50 },
  mentions: { top25: 42 },
};

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

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function OverviewPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, history, results, loading } = useAuditData(id);

  const baseline = history[0] ?? null;
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

  const sovStats = useMemo(() => {
    if (!audit || !results.length) return null;
    const valid = results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]"));
    const clientMentions = valid.filter((r) => r.brand_mentioned).length;
    const compCounts: Record<string, number> = {};
    valid.forEach((r) => (r.competitor_mentions || []).forEach((c) => { compCounts[c] = (compCounts[c] || 0) + 1; }));
    const totalMentions = clientMentions + Object.values(compCounts).reduce((s, n) => s + n, 0);
    const sov = totalMentions > 0 ? Math.round((clientMentions / totalMentions) * 100) : 0;
    return { sov, totalMentions, clientMentions };
  }, [audit, results]);

  const promptTypeBreakdown = useMemo(() => {
    if (!results.length) return [];
    const types: Array<"intent" | "ranking"> = ["intent", "ranking"];
    return types.map((t) => {
      // Backend uses "informational" — alias it to "intent" for filtering.
      const rows = results.filter((r) =>
        t === "ranking" ? r.prompt_type === "ranking" : r.prompt_type !== "ranking"
      );
      const mentioned = rows.filter((r) => r.brand_mentioned).length;
      const rate = rows.length > 0 ? Math.round((mentioned / rows.length) * 100) : 0;
      return {
        type: t,
        label: t === "intent" ? "Informational / intent prompts" : "Ranking / commercial prompts",
        rate,
        mentioned,
        total: rows.length,
        industryAvg: t === "intent" ? 28 : 35,
      };
    });
  }, [results]);

  const insights = useMemo(() => {
    if (!sortedEngines.length) return { gap: null, strength: null };
    const worst = sortedEngines[sortedEngines.length - 1];
    const best = sortedEngines[0];
    return {
      gap: worst ? { name: worst[1].display_name, rate: worst[1].visibility_rate } : null,
      strength: best ? { name: best[1].display_name, rate: best[1].visibility_rate } : null,
    };
  }, [sortedEngines]);

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
          <h1>{audit.brand_name}</h1>
          <p>
            Your AI Search Visibility Rank across {audit.engines?.length ?? 0} AI engines and{" "}
            {audit.summary_json?.audit_metadata?.total_prompts ?? "—"} buyer prompts.
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
                  {Math.round(insights.gap.rate)}% visibility on <strong style={{ color: "var(--text)" }}>{insights.gap.name}</strong>. Highest-leverage
                  recovery target.
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
            <div className={`kpi-number num-${tone(sovStats.sov)}`}>
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
          <div className="kpi-number num-good">{Math.min(100, Math.round((100 - visRate) * 0.85))}</div>
          <div className="kpi-sub">upside score</div>
          <div className="benchmark">
            <span className="benchmark-label">Addressable gap</span>
            <span className="benchmark-val">{Math.round(100 - visRate)} pts</span>
          </div>
        </div>
      </div>

      {/* WHERE YOU SHOW UP */}
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

      {/* ASK SARAH */}
      <AskSarahCard
        brandName={audit.brand_name}
        visibilityRate={visRate}
        totalQueries={audit.total_queries ?? 0}
        totalMentioned={audit.total_mentioned ?? 0}
        results={results}
        engineBreakdown={Object.keys(engineBreakdown).length ? engineBreakdown : undefined}
      />
    </AuditShell>
  );
}
