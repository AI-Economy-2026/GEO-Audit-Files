"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface EngineStats {
  display_name: string;
  visibility_rate: number;
  brand_mentioned: number;
  total_queries: number;
}

interface CategoryStats {
  total_queries: number;
  brand_mentioned: number;
  visibility_rate: number;
}

interface KeywordGap {
  prompt_id: number;
  prompt_text: string;
  category: string;
  engines_missed: string[];
  engines_hit: string[];
  engines_tested: number;
  gap_severity: string;
  competitors_present: { name: string; count: number }[];
}

interface DirectoryCitation {
  directory: string;
  listed: boolean;
  link: string | null;
  error: string | null;
}

interface SerpComparison {
  prompt_id: number;
  prompt_text: string;
  ai_mentioned: boolean;
  organic_rank: number | null;
  in_top_10: boolean;
  gap_type: string;
}

interface ContentRec {
  id: number;
  type: string;
  title: string;
  target_query: string;
  target_category: string;
  priority_score: number;
  severity: string;
  rationale: string;
  target_engines: string[];
  competitors_to_beat: string[];
  suggested_outline: string[];
}

interface AuditMetadata {
  brand: string;
  generated_at: string;
  total_prompts: number;
  total_queries: number;
  errors: number;
}

interface SummaryJson {
  audit_metadata?: AuditMetadata;
  overall_visibility?: {
    brand_mentioned_count: number;
    visibility_rate_percent: number;
  };
  engine_breakdown?: Record<string, EngineStats>;
  category_performance?: Record<string, CategoryStats>;
  competitor_analysis?: {
    mention_counts: Record<string, number>;
    most_mentioned: string | null;
  };
  sentiment_breakdown?: { positive: number; neutral: number; negative: number };
  keyword_gap_analysis?: { keyword_gaps: KeywordGap[] };
  directory_citations?: DirectoryCitation[];
  serp_analysis?: {
    site_indexed: { indexed_count: number };
    organic_rankings: { prompt_id: number; prompt_text: string; organic_rank: number | null; in_top_10: boolean }[];
    comparisons: SerpComparison[];
    summary: { seo_strong_ai_weak: number; ai_strong_seo_weak: number; both_strong: number; both_weak: number; total_compared: number };
  };
  alice_brief?: {
    content_recommendations: ContentRec[];
    summary_stats: {
      total_recommendations: number;
      critical_count: number;
      content_pieces_needed: number;
    };
  };
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
  summary_json: SummaryJson | null;
}

interface ResultRow {
  prompt_id: number;
  category: string;
  prompt_text: string;
  engine: string;
  engine_display: string;
  brand_mentioned: boolean;
  url_cited: boolean;
  competitor_mentions: string[];
  sentiment: string;
  response_text: string | null;
  prompt_type: string | null;
}

interface CategoryRanking {
  category: string;
  brands: { rank: number; brand: string; mentions: number; sov: number; isClient: boolean }[];
}

interface PromptData {
  id: number;
  prompt: string;
  category: string;
  type: string;
  engines: Record<string, { mentioned: boolean; excerpt: string }>;
}

/**
 * Visibility rate colour. Mint green is reserved for ACTUALLY good performance (60%+).
 * Between 35-60 is "ok" (navy/blue). 15-35 is weak (amber). <15 is critical (red).
 * Never use green in headlines — only as a semantic indicator next to a metric.
 */
function rateColor(rate: number) {
  if (rate >= 60) return { text: "#1D9E75", bar: "#1D9E75", light: "#E1F5EE", label: "Strong" };
  if (rate >= 35) return { text: "#004AAD", bar: "#004AAD", light: "#E6F1FB", label: "Fair" };
  if (rate >= 15) return { text: "#E8890C", bar: "#E8890C", light: "#FFF3E0", label: "Weak" };
  return { text: "#DC2626", bar: "#DC2626", light: "#FEF2F2", label: "Critical" };
}

function priorityFor(gap: number) {
  if (gap >= 70) return { label: "Critical", bg: "#DC2626", color: "#FFFFFF" };
  if (gap >= 50) return { label: "High", bg: "#E8890C", color: "#FFFFFF" };
  if (gap >= 30) return { label: "Medium", bg: "#FFD740", color: "#333333" };
  return { label: "Low", bg: "#D4F4DD", color: "#2E7D32" };
}

function sevColors(severity: string) {
  switch (severity) {
    case "critical": return { bg: "#FEF2F2", text: "#DC2626" };
    case "high": return { bg: "#FFF3E0", text: "#E8890C" };
    case "medium": return { bg: "#FFF3E0", text: "#E8890C" };
    default: return { bg: "#E6F1FB", text: "#004AAD" };
  }
}

const ITEMS_PER_PAGE = 5;

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modal, setModal] = useState<{ engine: string; prompt: string; excerpt: string } | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/geo-audits/${id}`);
      const data = await res.json();
      if (data.audit) setAudit(data.audit);

      const supabase = createClient();
      const { data: rows } = await supabase
        .from("geo_audit_results")
        .select("prompt_id, category, prompt_text, engine, engine_display, brand_mentioned, url_cited, competitor_mentions, sentiment, response_text, prompt_type")
        .eq("audit_id", id)
        .order("prompt_id");
      if (rows) setResults(rows as ResultRow[]);

      setLoading(false);
    }
    load();
  }, [id]);

  // Compute category rankings client-side
  const categoryRankings: CategoryRanking[] = useMemo(() => {
    if (!audit || !results.length) return [];
    const valid = results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]"));
    const categories = Array.from(new Set(valid.map((r) => r.category)));
    return categories.map((cat) => {
      const catRows = valid.filter((r) => r.category === cat);
      const clientMentions = catRows.filter((r) => r.brand_mentioned).length;
      const compCounts: Record<string, number> = {};
      catRows.forEach((r) => {
        (r.competitor_mentions || []).forEach((c) => {
          compCounts[c] = (compCounts[c] || 0) + 1;
        });
      });
      const allBrands = [
        { brand: audit.brand_name, mentions: clientMentions, isClient: true },
        ...Object.entries(compCounts).map(([b, c]) => ({ brand: b, mentions: c, isClient: false })),
      ].sort((a, b) => b.mentions - a.mentions);
      const total = allBrands.reduce((s, b) => s + b.mentions, 0);
      return {
        category: cat,
        brands: allBrands.slice(0, 8).map((b, i) => ({
          rank: i + 1,
          brand: b.brand,
          mentions: b.mentions,
          sov: total > 0 ? Math.round((b.mentions / total) * 100) : 0,
          isClient: b.isClient,
        })),
      };
    });
  }, [audit, results]);

  // Compute prompt data client-side
  const promptsData: PromptData[] = useMemo(() => {
    const map = new Map<number, PromptData>();
    results.forEach((r) => {
      if (!map.has(r.prompt_id)) {
        map.set(r.prompt_id, {
          id: r.prompt_id,
          prompt: r.prompt_text,
          category: r.category,
          type: (r.prompt_type || "ranking").toUpperCase(),
          engines: {},
        });
      }
      const p = map.get(r.prompt_id)!;
      p.engines[r.engine_display || r.engine] = {
        mentioned: !!r.brand_mentioned,
        excerpt: r.response_text || "",
      };
    });
    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [results]);

  // Filter + paginate
  const filteredPrompts = useMemo(() => {
    if (filter === "all") return promptsData;
    if (filter === "mentioned") return promptsData.filter((p) => Object.values(p.engines).some((e) => e.mentioned));
    if (filter === "intent") return promptsData.filter((p) => p.type === "INTENT");
    if (filter === "ranking") return promptsData.filter((p) => p.type === "RANKING");
    return promptsData.filter((p) => p.category === filter);
  }, [promptsData, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredPrompts.length / ITEMS_PER_PAGE));
  const pagePrompts = filteredPrompts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F1F5F9", color: "#64748B" }}>
        Loading dashboard...
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F1F5F9", color: "#64748B" }}>
        Audit not found.
      </div>
    );
  }

  const summary = audit.summary_json;
  const meta = summary?.audit_metadata;
  const engineBreakdown = summary?.engine_breakdown || {};
  const categoryPerf = summary?.category_performance || {};
  const competitorCounts = summary?.competitor_analysis?.mention_counts || {};
  const keywordGaps = summary?.keyword_gap_analysis?.keyword_gaps || [];
  const directories = summary?.directory_citations || [];
  const sentiment = summary?.sentiment_breakdown;
  const serp = summary?.serp_analysis;
  const alice = summary?.alice_brief;

  const sortedEngines = Object.entries(engineBreakdown).sort((a, b) => b[1].visibility_rate - a[1].visibility_rate);
  // "Strong" = genuinely good: 50%+. "Gaps" = bottom performers with > 0 missed.
  const strongEngines = sortedEngines.filter(([, s]) => s.visibility_rate >= 50).slice(0, 3);
  const gapEngines = [...sortedEngines]
    .filter(([, s]) => s.total_queries - s.brand_mentioned > 0)
    .reverse()
    .slice(0, 3);
  const sortedCategories = Object.entries(categoryPerf).sort((a, b) => b[1].visibility_rate - a[1].visibility_rate);
  const sortedCompetitors = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1]);

  const visRate = audit.visibility_rate ?? 0;
  const visColors = rateColor(visRate);

  const totalSent = (sentiment?.positive || 0) + (sentiment?.neutral || 0) + (sentiment?.negative || 0);

  // Intent vs Ranking visibility
  const intentResults = results.filter((r) => r.prompt_type === "intent");
  const rankingResults = results.filter((r) => r.prompt_type === "ranking");
  const intentMentioned = intentResults.filter((r) => r.brand_mentioned).length;
  const rankingMentioned = rankingResults.filter((r) => r.brand_mentioned).length;
  const intentVis = intentResults.length > 0 ? Math.round((intentMentioned / intentResults.length) * 100) : 0;
  const rankingVis = rankingResults.length > 0 ? Math.round((rankingMentioned / rankingResults.length) * 100) : 0;
  const bestRank = 1; // TODO: compute from position_rank column

  const allCategories = Array.from(new Set(results.map((r) => r.category)));

  return (
    <div
      className="min-h-screen"
      style={{ background: "#F1F5F9", color: "#0F172A", fontFamily: "'Manrope', sans-serif" }}
    >
      {/* Toolbar */}
      <div
        className="px-6 py-3 flex items-center justify-between sticky top-0 z-50"
        style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0" }}
      >
        <button
          onClick={() => router.push(`/audits/${id}`)}
          className="text-sm inline-flex items-center gap-2"
          style={{ color: "#334155" }}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Audit
        </button>
        <span className="text-xs" style={{ color: "#94A3B8" }}>
          Live dashboard • rendered from latest data
        </span>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Hero */}
        <section
          className="rounded-2xl p-10 text-center"
          style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#004AAD" }}>
            GEO Audit & Action Plan
          </p>
          <h1 className="text-4xl font-black mb-1" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
            {audit.brand_name}
          </h1>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>
            {audit.brand_url}
            {audit.completed_at && (
              <>
                {" • "}
                {new Date(audit.completed_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
              </>
            )}
          </p>
          <div className="text-7xl font-black" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
            {Math.round(visRate)}%
          </div>
          <div className="flex items-center justify-center gap-2 mt-2 mb-4">
            <span
              className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full"
              style={{ background: visColors.light, color: visColors.text }}
            >
              {visColors.label}
            </span>
            <span className="text-xs uppercase tracking-widest" style={{ color: "#94A3B8" }}>
              Visibility Score
            </span>
          </div>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#334155" }}>
            <strong style={{ color: "#0F172A" }}>{audit.brand_name}</strong> was mentioned in{" "}
            <strong style={{ color: "#0F172A" }}>{audit.total_mentioned}</strong> of{" "}
            <strong style={{ color: "#0F172A" }}>{audit.total_queries}</strong> AI engine queries across{" "}
            <strong style={{ color: "#0F172A" }}>{audit.engines?.length}</strong> platforms.
          </p>
        </section>

        {/* Executive Summary */}
        {meta && (
          <section
            className="rounded-2xl p-8"
            style={{ background: "#F9F9F9", borderLeft: "5px solid #0F172A" }}
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              Executive Summary
            </h2>
            <p className="mb-4" style={{ color: "#334155", lineHeight: 1.8 }}>
              This audit analyses <strong>{audit.brand_name}</strong>&apos;s visibility across{" "}
              <strong>{meta.total_prompts}</strong> search prompts spanning{" "}
              <strong>{Object.keys(categoryPerf).length || 1}</strong> categories. Testing was conducted
              across <strong>{audit.engines?.length}</strong> leading AI engines —{" "}
              {audit.engines?.join(", ")} — to measure how frequently {audit.brand_name} is surfaced in
              generative AI responses.
            </p>
            <p style={{ color: "#334155", lineHeight: 1.8 }}>
              {audit.brand_name} achieves a{" "}
              <span className="px-2 py-0.5 font-bold" style={{ background: "#0F172A", color: "#FFFFFF" }}>
                {Math.round(visRate)}% visibility rate
              </span>{" "}
              across{" "}
              <span className="px-2 py-0.5 font-bold" style={{ background: "#0F172A", color: "#FFFFFF" }}>
                {meta.total_prompts} search prompts
              </span>
              {sortedCategories[0] && (
                <>
                  , with strongest performance in {sortedCategories[0][0]} ({Math.round(sortedCategories[0][1].visibility_rate)}%)
                </>
              )}
              .
            </p>
          </section>
        )}

        {/* Target Keywords */}
        {audit.keywords?.length > 0 && (
          <section className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <h3 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "#94A3B8" }}>
              Target Keywords
            </h3>
            <div className="flex flex-wrap gap-2">
              {audit.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-sm px-3 py-1.5 rounded-full font-medium"
                  style={{ background: "#F0F0F0", color: "#333", border: "1px solid #DDD" }}
                >
                  {kw}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Performance Overview KPIs */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
            Performance Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Total Prompts", value: meta?.total_prompts ?? promptsData.length, sub: `Across ${Object.keys(categoryPerf).length} categories`, accent: "#004AAD" },
              { label: "Visibility Rate", value: `${Math.round(visRate)}%`, sub: `${audit.total_mentioned} of ${audit.total_queries} queries`, accent: visColors.text },
              { label: "Intent Visibility", value: `${intentVis}%`, sub: `On intent prompts`, accent: rateColor(intentVis).text },
              { label: "Ranking Visibility", value: `${rankingVis}%`, sub: `On ranking prompts`, accent: rateColor(rankingVis).text },
              { label: "AI Engines", value: audit.engines?.length ?? 0, sub: "Platforms tested", accent: "#0BA5C9" },
              { label: "Best Rank", value: `#${bestRank}`, sub: "Highest position", accent: "#0F172A" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl p-5 text-center"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E2E8F0",
                  borderTop: `4px solid ${kpi.accent}`,
                }}
              >
                <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "#64748B" }}>
                  {kpi.label}
                </div>
                <div className="text-3xl font-black" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
                  {kpi.value}
                </div>
                <div className="text-[11px] mt-2 truncate" style={{ color: "#94A3B8" }}>
                  {kpi.sub}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rankings by Category */}
        {categoryRankings.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              {audit.brand_name} Rankings by Category
            </h2>
            {categoryRankings.map((cat) => (
              <div key={cat.category} className="mb-8">
                <h3 className="text-lg font-bold mb-3" style={{ color: "#334155" }}>
                  {cat.category}
                </h3>
                <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                        <th className="text-left p-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Rank</th>
                        <th className="text-left p-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Brand</th>
                        <th className="text-left p-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Mentions</th>
                        <th className="text-left p-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Share of Voice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.brands.map((b) => (
                        <tr
                          key={b.brand}
                          style={{
                            background: b.isClient ? "#E6F1FB" : "transparent",
                            borderBottom: "1px solid #F1F5F9",
                          }}
                        >
                          <td className="p-4">
                            <span
                              className="inline-block px-3 py-1 font-bold min-w-[36px] text-center rounded-md text-xs"
                              style={{
                                background: b.isClient ? "#004AAD" : "#F1F5F9",
                                color: b.isClient ? "#FFFFFF" : "#334155",
                              }}
                            >
                              #{b.rank}
                            </span>
                          </td>
                          <td className="p-4 font-semibold" style={{ color: b.isClient ? "#004AAD" : "#0F172A" }}>
                            {b.brand}
                            {b.isClient && (
                              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider" style={{ color: "#004AAD" }}>
                                (You)
                              </span>
                            )}
                          </td>
                          <td className="p-4" style={{ color: "#334155" }}>
                            {b.mentions}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-1 max-w-[150px] h-2 rounded-full" style={{ background: "#E2E8F0" }}>
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(b.sov, 100)}%`,
                                    background: b.isClient ? "#004AAD" : "#94A3B8",
                                  }}
                                />
                              </div>
                              <span className="font-bold text-sm" style={{ color: "#0F172A" }}>
                                {b.sov}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* AI Engine Performance & Opportunities */}
        <section>
          <h2 className="text-2xl font-bold mb-4" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
            AI Engine Performance &amp; Opportunities
          </h2>

          {/* Strong Performance — only show if engines actually hit 50%+ */}
          {strongEngines.length > 0 && (
            <>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "#334155" }}>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: "#1D9E75" }}
                />
                Strong Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {strongEngines.map(([key, stats]) => (
                  <div
                    key={key}
                    className="p-5 rounded-xl"
                    style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderLeft: "4px solid #1D9E75" }}
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>
                      {stats.display_name}
                    </div>
                    <div className="text-4xl font-black" style={{ color: "#1D9E75", letterSpacing: "-0.02em" }}>
                      {Math.round(stats.visibility_rate)}%
                    </div>
                    <div className="text-xs mt-2" style={{ color: "#94A3B8" }}>
                      {stats.brand_mentioned} of {stats.total_queries} queries
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Critical Gaps */}
          {gapEngines.length > 0 && (
            <>
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2" style={{ color: "#334155" }}>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ background: "#DC2626" }}
                />
                Critical Optimisation Gaps
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {gapEngines.map(([key, stats]) => {
                  const gap = 100 - stats.visibility_rate;
                  const missed = stats.total_queries - stats.brand_mentioned;
                  return (
                    <div
                      key={key}
                      className="p-5 rounded-xl"
                      style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderLeft: "4px solid #DC2626" }}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#64748B" }}>
                        {stats.display_name}
                      </div>
                      <div className="text-4xl font-black" style={{ color: "#DC2626", letterSpacing: "-0.02em" }}>
                        {Math.round(gap)}%
                      </div>
                      <div className="text-xs mt-1" style={{ color: "#94A3B8" }}>
                        Gap
                      </div>
                      <div className="text-xs mt-2" style={{ color: "#64748B" }}>
                        {missed} missed opportunities
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Category Performance */}
          {sortedCategories.length > 0 && (
            <>
              <h3 className="text-lg font-bold mb-3" style={{ color: "#334155" }}>
                Category Performance
              </h3>
              <div className="rounded-2xl p-6 mb-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
                {sortedCategories.map(([cat, s]) => {
                  const c = rateColor(s.visibility_rate);
                  return (
                    <div key={cat} className="flex items-center gap-4 mb-3 last:mb-0">
                      <div className="min-w-[200px] text-sm font-semibold" style={{ color: "#334155" }}>
                        {cat}
                      </div>
                      <div className="flex-1 h-7" style={{ background: "#E8E8E8" }}>
                        <div
                          className="h-full"
                          style={{ width: `${s.visibility_rate}%`, background: c.bar }}
                        />
                      </div>
                      <div className="min-w-[50px] text-right font-bold" style={{ color: "#0F172A" }}>
                        {Math.round(s.visibility_rate)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Complete Engine Gap Analysis */}
          <h3 className="text-lg font-bold mb-3" style={{ color: "#334155" }}>
            Complete Engine Gap Analysis
          </h3>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                  <th className="text-left p-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>AI Engine</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Tested</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Mentioned</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Rate</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Missed</th>
                  <th className="text-center p-3 text-[10px] font-bold uppercase tracking-wider" style={{ color: "#64748B" }}>Priority</th>
                </tr>
              </thead>
              <tbody>
                {sortedEngines.map(([key, stats]) => {
                  const gap = 100 - stats.visibility_rate;
                  const missed = stats.total_queries - stats.brand_mentioned;
                  const p = priorityFor(gap);
                  return (
                    <tr key={key} style={{ borderBottom: "1px solid #F1F5F9" }}>
                      <td className="p-3 font-bold" style={{ color: "#0F172A" }}>
                        {stats.display_name}
                      </td>
                      <td className="p-3 text-center" style={{ color: "#64748B" }}>
                        {stats.total_queries}
                      </td>
                      <td className="p-3 text-center" style={{ color: "#64748B" }}>
                        {stats.brand_mentioned}
                      </td>
                      <td className="p-3 text-center font-bold" style={{ color: rateColor(stats.visibility_rate).text }}>
                        {Math.round(stats.visibility_rate)}%
                      </td>
                      <td className="p-3 text-center" style={{ color: "#D32F2F" }}>
                        {missed}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className="px-3 py-1 text-xs font-bold"
                          style={{ background: p.bg, color: p.color, letterSpacing: "0.5px" }}
                        >
                          {p.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Competitor Mentions */}
        {sortedCompetitors.length > 0 && (
          <section className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              Competitor Mentions
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "#FFF3E0", border: "1px solid #E8890C33" }}>
                <span className="text-sm font-bold w-40 truncate" style={{ color: "#E8890C" }}>
                  {audit.brand_name} (You)
                </span>
                <div className="flex-1">
                  <div className="w-full rounded-full h-3" style={{ background: "#E2E8F0" }}>
                    <div
                      className="h-3 rounded-full"
                      style={{
                        width: `${Math.max(((audit.total_mentioned || 0) / Math.max(audit.total_queries || 1, 1)) * 100, 2)}%`,
                        background: "#E8890C",
                      }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold w-16 text-right" style={{ color: "#E8890C" }}>
                  {audit.total_mentioned}
                </span>
              </div>
              {sortedCompetitors.map(([name, count]) => {
                const maxM = Math.max(audit.total_queries || 1, count, 1);
                return (
                  <div key={name} className="flex items-center gap-3 rounded-xl p-3" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <span className="text-sm w-40 truncate" style={{ color: "#334155" }}>{name}</span>
                    <div className="flex-1">
                      <div className="w-full rounded-full h-3" style={{ background: "#E2E8F0" }}>
                        <div className="h-3 rounded-full" style={{ width: `${Math.max((count / maxM) * 100, 2)}%`, background: "#94A3B8" }} />
                      </div>
                    </div>
                    <span className="text-sm w-16 text-right" style={{ color: "#64748B" }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Sentiment */}
        {totalSent > 0 && sentiment && (
          <section className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <h2 className="text-xl font-bold mb-4" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              Sentiment Analysis
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Positive", value: sentiment.positive, color: "#1D9E75" },
                { label: "Neutral", value: sentiment.neutral, color: "#64748B" },
                { label: "Negative", value: sentiment.negative, color: "#DC2626" },
              ].map((s) => {
                const pct = Math.round((s.value / totalSent) * 100);
                return (
                  <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                    <div className="text-2xl font-bold" style={{ color: s.color }}>{pct}%</div>
                    <div className="text-xs mt-1 uppercase" style={{ color: "#64748B" }}>{s.label}</div>
                    <div className="w-full rounded-full h-1.5 mt-2" style={{ background: "#E2E8F0" }}>
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.max(pct, 2)}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Keyword Gap Analysis */}
        {keywordGaps.length > 0 && (
          <section className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              Keyword Gap Analysis
            </h2>
            <p className="text-sm mb-4" style={{ color: "#64748B" }}>
              Queries where competitors are being recommended but your brand is missing.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #E2E8F0", color: "#94A3B8" }}>
                    <th className="text-left py-3 px-2 text-xs uppercase">Query</th>
                    <th className="text-center py-3 px-2 text-xs uppercase">Category</th>
                    <th className="text-center py-3 px-2 text-xs uppercase">Engines Missed</th>
                    <th className="text-center py-3 px-2 text-xs uppercase">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {keywordGaps.slice(0, 10).map((gap) => {
                    const sev = sevColors(gap.gap_severity);
                    return (
                      <tr key={gap.prompt_id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td className="py-3 px-2 max-w-xs truncate" style={{ color: "#334155" }}>{gap.prompt_text}</td>
                        <td className="py-3 px-2 text-center" style={{ color: "#64748B" }}>{gap.category}</td>
                        <td className="py-3 px-2 text-center font-bold" style={{ color: "#DC2626" }}>
                          {gap.engines_missed.length} / {gap.engines_tested}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: sev.bg, color: sev.text }}>
                            {gap.gap_severity.charAt(0).toUpperCase() + gap.gap_severity.slice(1)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Directory Citations */}
        {directories.length > 0 && (
          <section className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              Directory &amp; Citation Check
            </h2>
            <p className="text-sm mb-4" style={{ color: "#64748B" }}>
              AI engines reference business directories when recommending brands.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {directories.map((dir) => (
                <div
                  key={dir.directory}
                  className="rounded-xl p-4 flex items-center gap-3"
                  style={{
                    background: dir.listed ? "#E1F5EE" : "#FEF2F2",
                    border: `1px solid ${dir.listed ? "#1D9E7533" : "#DC262633"}`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-lg"
                    style={{ background: dir.listed ? "#1D9E75" : "#DC2626" }}
                  >
                    {dir.listed ? "✓" : "✗"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#0F172A" }}>{dir.directory}</p>
                    {dir.listed && dir.link ? (
                      <a href={dir.link} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline truncate block" style={{ color: "#1D9E75" }}>
                        Listed
                      </a>
                    ) : (
                      <p className="text-xs" style={{ color: "#DC2626" }}>Not found</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SERP Analysis */}
        {serp && serp.comparisons.length > 0 && (
          <section className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              AI vs SEO Visibility
            </h2>
            <p className="text-sm mb-4" style={{ color: "#64748B" }}>
              How your AI engine visibility compares to traditional Google organic rankings.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "SEO Strong, AI Weak", value: serp.summary.seo_strong_ai_weak, color: "#E8890C" },
                { label: "AI Strong, SEO Weak", value: serp.summary.ai_strong_seo_weak, color: "#004AAD" },
                { label: "Both Strong", value: serp.summary.both_strong, color: "#1D9E75" },
                { label: "Both Weak", value: serp.summary.both_weak, color: "#DC2626" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs mt-1 uppercase" style={{ color: "#64748B" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Alice Brief Content Recommendations */}
        {alice && alice.content_recommendations && alice.content_recommendations.length > 0 && (
          <section className="rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
            <h2 className="text-xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              Content Recommendations
            </h2>
            <p className="text-sm mb-4" style={{ color: "#64748B" }}>
              AI-generated content strategy to close your visibility gaps.
            </p>
            <div className="space-y-3">
              {alice.content_recommendations.slice(0, 6).map((rec) => {
                const sev = sevColors(rec.severity);
                return (
                  <div
                    key={rec.id}
                    className="rounded-xl p-4"
                    style={{
                      background: "#F8FAFC",
                      borderLeft: `4px solid ${sev.text}`,
                      border: "1px solid #E2E8F0",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-bold" style={{ color: "#0F172A" }}>{rec.title}</h4>
                      <span className="text-xs px-2 py-1 rounded-full font-bold" style={{ background: sev.bg, color: sev.text }}>
                        {rec.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: "#64748B" }}>{rec.rationale}</p>
                    {rec.competitors_to_beat.length > 0 && (
                      <p className="text-xs" style={{ color: "#E8890C" }}>
                        Competitors to beat: {rec.competitors_to_beat.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Detailed Prompt Analysis */}
        {promptsData.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4" style={{ color: "#0F172A", letterSpacing: "-0.01em" }}>
              Detailed Prompt Analysis
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 flex-wrap mb-6">
              {[
                { cat: "all", label: "All Prompts" },
                ...allCategories.map((c) => ({ cat: c, label: c })),
                { cat: "mentioned", label: `${audit.brand_name} Mentioned` },
                { cat: "intent", label: "Intent Prompts" },
                { cat: "ranking", label: "Ranking Prompts" },
              ].map((t) => (
                <button
                  key={t.cat}
                  onClick={() => {
                    setFilter(t.cat);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 text-sm font-semibold rounded-full transition-all"
                  style={{
                    background: filter === t.cat ? "#004AAD" : "#FFFFFF",
                    color: filter === t.cat ? "#FFFFFF" : "#334155",
                    border: filter === t.cat ? "1px solid #004AAD" : "1px solid #E2E8F0",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Prompt List */}
            <div className="space-y-3 mb-6">
              {pagePrompts.map((p) => {
                const engineNames = Object.keys(p.engines);
                const mentionCount = engineNames.filter((e) => p.engines[e].mentioned).length;
                const hasMention = mentionCount > 0;
                const expanded = expandedId === p.id;

                return (
                  <div
                    key={p.id}
                    className="rounded-xl overflow-hidden transition-all cursor-pointer"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderLeft: hasMention ? "4px solid #1D9E75" : "4px solid #E2E8F0",
                    }}
                    onClick={() => setExpandedId(expanded ? null : p.id)}
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <span className="font-bold text-lg min-w-[40px]" style={{ color: "#999" }}>
                          {String(p.id).padStart(2, "0")}
                        </span>
                        <span
                          className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider rounded"
                          style={{ background: "#F1F5F9", color: "#64748B" }}
                        >
                          {p.type}
                        </span>
                        <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "#334155" }}>
                          {p.prompt}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {hasMention ? (
                          <span
                            className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider rounded-full"
                            style={{ background: "#E1F5EE", color: "#1D9E75" }}
                          >
                            ✓ Mentioned
                          </span>
                        ) : (
                          <span
                            className="text-[10px] px-2 py-1 font-bold uppercase tracking-wider rounded-full"
                            style={{ background: "#FEF2F2", color: "#DC2626" }}
                          >
                            ✗ Not Mentioned
                          </span>
                        )}
                        <span className="text-sm font-bold" style={{ color: "#0F172A" }}>
                          {mentionCount}/{engineNames.length}
                        </span>
                        <span className="text-xs" style={{ color: "#94A3B8" }}>engines</span>
                        <span
                          className="text-lg transition-transform"
                          style={{ color: "#94A3B8", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
                        >
                          ▼
                        </span>
                      </div>
                    </div>

                    {expanded && (
                      <div className="px-4 pb-4 pt-2 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2" style={{ borderColor: "#E2E8F0" }}>
                        {engineNames.map((eName) => {
                          const eData = p.engines[eName];
                          const isError = eData.excerpt?.startsWith("[ERROR]");
                          return (
                            <div
                              key={eName}
                              className="p-3 rounded-lg flex items-center justify-between"
                              style={{
                                background: "#FFFFFF",
                                border: "1px solid #E2E8F0",
                                borderLeft: eData.mentioned && !isError
                                  ? "3px solid #1D9E75"
                                  : isError
                                    ? "3px solid #CBD5E1"
                                    : "3px solid #E2E8F0",
                                cursor: eData.mentioned && !isError ? "pointer" : "default",
                              }}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (eData.mentioned && !isError) {
                                  setModal({ engine: eName, prompt: p.prompt, excerpt: eData.excerpt });
                                }
                              }}
                            >
                              <span className="text-xs font-semibold" style={{ color: "#0F172A" }}>{eName}</span>
                              {isError ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Unavailable</span>
                              ) : eData.mentioned ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#1D9E75" }}>✓ Mentioned</span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#94A3B8" }}>Not mentioned</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-6 py-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="px-5 py-2.5 text-sm font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", color: "#334155" }}
              >
                ← Previous
              </button>
              <span className="text-sm font-semibold" style={{ color: "#64748B" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-5 py-2.5 text-sm font-bold rounded-full disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                style={{ background: "#004AAD", border: "1px solid #004AAD", color: "#FFFFFF" }}
              >
                Next →
              </button>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="rounded-2xl p-6 text-center mt-12" style={{ background: "#FFFFFF", border: "1px solid #E2E8F0" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#0F172A" }}>
            AI <span style={{ color: "#E8890C" }}>ECONOMY</span>
          </p>
          <p className="text-xs mt-1" style={{ color: "#94A3B8" }}>
            Generative Engine Optimisation • Dashboard rendered from live audit data
          </p>
        </footer>
      </main>

      {/* Modal for mention detail */}
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-6 overflow-auto"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setModal(null)}
        >
          <div
            className="rounded-xl p-8 max-w-3xl w-full mt-16"
            style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 20px 40px rgba(15,23,42,0.15)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-4 mb-4" style={{ borderBottom: "1px solid #E2E8F0" }}>
              <h3 className="text-xl font-bold" style={{ color: "#0F172A" }}>
                {modal.engine} — Mention Detail
              </h3>
              <button onClick={() => setModal(null)} className="text-2xl leading-none hover:opacity-80" style={{ color: "#94A3B8" }}>×</button>
            </div>
            <div className="text-[10px] uppercase tracking-widest font-bold mb-3" style={{ color: "#64748B" }}>
              Prompt: {modal.prompt}
            </div>
            <div
              className="p-5 text-sm leading-relaxed rounded-lg"
              style={{
                background: "#F8FAFC",
                borderLeft: "4px solid #004AAD",
                lineHeight: 1.8,
                color: "#334155",
              }}
              dangerouslySetInnerHTML={{
                __html: modal.excerpt.replace(
                  new RegExp(`(${audit.brand_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                  '<mark style="background:#E1F5EE;color:#1D9E75;padding:2px 6px;font-weight:bold;border-radius:3px;">$1</mark>'
                ),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
