"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PrioritiseTab from "./components/PrioritiseTab";

interface ClientData {
  id: string;
  name: string;
  url: string;
  status: string;
  audit_id: string | null;
  report_slug: string;
}

interface AuditData {
  id: string;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  dashboard_url: string | null;
  summary_json: SummaryJson | null;
  engines: string[];
  completed_at: string | null;
  progress_current: number;
  progress_total: number;
  progress_message: string | null;
}

interface EngineStats {
  display_name: string;
  visibility_rate: number;
  brand_mentioned: number;
  total_queries: number;
  url_cited_count: number;
  url_citation_rate: number;
  average_rank: number | null;
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

interface ContentRecommendation {
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

interface DirectoryAction {
  directory: string;
  listed: boolean;
  current_link: string | null;
  action: string;
  urgency: string;
  recommendation: string;
}

interface SummaryJson {
  audit_metadata: {
    brand: string;
    generated_at: string;
    total_prompts: number;
    total_queries: number;
    errors: number;
  };
  overall_visibility: {
    brand_mentioned_count: number;
    visibility_rate_percent: number;
  };
  engine_breakdown: Record<string, EngineStats>;
  category_performance: Record<string, CategoryStats>;
  competitor_analysis: {
    mention_counts: Record<string, number>;
    most_mentioned: string | null;
  };
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  keyword_gap_analysis?: {
    keyword_gaps: KeywordGap[];
    strengths: { prompt_id: number; prompt_text: string; category: string; engines_hit: string[]; coverage_rate: number }[];
    low_competition: { prompt_id: number; prompt_text: string; category: string; opportunity: string }[];
    keyword_frequency: Record<string, number>;
    competitor_advantages: { competitor: string; advantage_count: number; prompts_where_they_beat_us: string[] }[];
  };
  directory_citations?: DirectoryCitation[];
  serp_analysis?: {
    site_indexed: { indexed_count: number; top_pages: { title: string; link: string }[]; error: string | null };
    organic_rankings: { prompt_id: number; prompt_text: string; organic_rank: number | null; in_top_10: boolean }[];
    comparisons: SerpComparison[];
    summary: { seo_strong_ai_weak: number; ai_strong_seo_weak: number; both_strong: number; both_weak: number; total_compared: number };
  };
  alice_brief?: {
    content_recommendations: ContentRecommendation[];
    directory_actions: DirectoryAction[];
    keyword_opportunities: { prompt_text: string; organic_rank: number | null; gap_type: string; recommendation: string; priority: string }[];
    summary_stats: { total_recommendations: number; critical_count: number; content_pieces_needed: number; directories_to_claim: number; directories_to_optimise: number };
  };
}

const ENGINE_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  perplexity: "Perplexity",
  xai: "Grok",
  deepseek: "DeepSeek",
  meta_llama: "Llama",
  google_ai_mode: "Google AI Mode",
  google_ai_overview: "Google AI Overview",
  bing_copilot: "Bing Copilot",
};

function rateColor(rate: number) {
  if (rate >= 50) return { text: "text-green-400", bar: "bg-green-500", badge: "bg-green-900 text-green-300" };
  if (rate >= 25) return { text: "text-orange-400", bar: "bg-orange-500", badge: "bg-orange-900 text-orange-300" };
  return { text: "text-red-400", bar: "bg-red-500", badge: "bg-red-900 text-red-300" };
}

function priorityLabel(gap: number) {
  if (gap >= 70) return { label: "Critical", cls: "bg-red-600 text-white" };
  if (gap >= 50) return { label: "High", cls: "bg-orange-600 text-white" };
  if (gap >= 30) return { label: "Medium", cls: "bg-yellow-600 text-black" };
  return { label: "Low", cls: "bg-green-600 text-white" };
}

export default function ReportPage() {
  const { slug } = useParams<{ slug: string }>();
  const [client, setClient] = useState<ClientData | null>(null);
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"overview" | "prioritise">("overview");

  // Add more queries state
  const [additionalQueries, setAdditionalQueries] = useState<string[]>([""]);
  const [addingQueries, setAddingQueries] = useState(false);
  const [addQueryError, setAddQueryError] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/report/${slug}`);
      if (!res.ok) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setClient(data.client);
      setAudit(data.audit);
      setLoading(false);
    } catch {
      setNotFound(true);
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  async function handleAddQueries() {
    const validQueries = additionalQueries.filter((q) => q.trim());
    if (validQueries.length === 0) return;

    setAddingQueries(true);
    setAddQueryError("");

    try {
      const res = await fetch(`/api/report/${slug}/add-queries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries: validQueries }),
      });
      const data = await res.json();

      if (!res.ok) {
        setAddQueryError(data.error || "Failed to add queries.");
        setAddingQueries(false);
        return;
      }

      setAdditionalQueries([""]);
      setAddingQueries(false);
      fetchReport();
    } catch {
      setAddQueryError("Network error. Please try again.");
      setAddingQueries(false);
    }
  }

  // Realtime subscription for in-progress audits
  useEffect(() => {
    if (!audit?.id || audit.status === "completed" || audit.status === "failed")
      return;

    const supabase = createClient();
    const channel = supabase
      .channel(`report-${audit.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "geo_audits",
          filter: `id=eq.${audit.id}`,
        },
        (payload) => {
          const updated = payload.new as AuditData;
          setAudit((prev) => (prev ? { ...prev, ...updated } : updated));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [audit?.id, audit?.status]);

  const brandedHeader = (
    <header className="bg-black text-white py-6 border-b-4 border-orange-500">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold tracking-widest uppercase"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          >
            BALMER AGENCY
          </h1>
          <p className="text-xs text-gray-400 uppercase tracking-wider">
            AI Visibility Audit Report
          </p>
        </div>
        {client && (
          <div className="text-right">
            <p
              className="text-2xl font-bold uppercase tracking-wider"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              {client.name}
            </p>
            <p className="text-sm text-gray-400">{client.url}</p>
          </div>
        )}
      </div>
    </header>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
        {brandedHeader}
        <div className="text-center py-20 text-gray-500">
          Loading report...
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950">
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
          rel="stylesheet"
        />
        {brandedHeader}
        <div className="max-w-lg mx-auto px-4 py-16 text-center">
          <h2 className="text-xl font-bold text-white mb-2">
            Report Not Found
          </h2>
          <p className="text-gray-400">
            This report link is invalid or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const isRunning =
    audit && (audit.status === "running" || audit.status === "pending");
  const isCompleted = audit?.status === "completed";
  const isFailed = audit?.status === "failed";

  const progressPercent =
    audit && audit.progress_total > 0
      ? Math.round((audit.progress_current / audit.progress_total) * 100)
      : 0;

  const summary = audit?.summary_json as SummaryJson | null;
  const engineBreakdown = summary?.engine_breakdown;
  const categoryPerf = summary?.category_performance;
  const competitorAnalysis = summary?.competitor_analysis;
  const sentimentBreakdown = summary?.sentiment_breakdown;

  const visRate = audit?.visibility_rate || 0;
  const visColors = rateColor(visRate);

  // Sort engines by visibility rate descending
  const sortedEngines = engineBreakdown
    ? Object.entries(engineBreakdown).sort(
        (a, b) => b[1].visibility_rate - a[1].visibility_rate
      )
    : [];

  // Sort categories by visibility rate descending
  const sortedCategories = categoryPerf
    ? Object.entries(categoryPerf).sort(
        (a, b) => b[1].visibility_rate - a[1].visibility_rate
      )
    : [];

  // Sort competitors by mention count
  const sortedCompetitors = competitorAnalysis?.mention_counts
    ? Object.entries(competitorAnalysis.mention_counts).sort(
        (a, b) => b[1] - a[1]
      )
    : [];

  const totalSentiment =
    (sentimentBreakdown?.positive || 0) +
    (sentimentBreakdown?.neutral || 0) +
    (sentimentBreakdown?.negative || 0);

  // New analysis data
  const keywordGaps = summary?.keyword_gap_analysis?.keyword_gaps || [];
  const keywordStrengths = summary?.keyword_gap_analysis?.strengths || [];
  const lowCompetition = summary?.keyword_gap_analysis?.low_competition || [];
  const directoryCitations = summary?.directory_citations || [];
  const serpAnalysis = summary?.serp_analysis;
  const serpComparisons = serpAnalysis?.comparisons || [];
  const aliceBrief = summary?.alice_brief;
  const contentRecs = aliceBrief?.content_recommendations || [];
  const directoryActions = aliceBrief?.directory_actions || [];

  return (
    <div className="min-h-screen bg-gray-950">
      <link
        href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap"
        rel="stylesheet"
      />
      {brandedHeader}

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Awaiting intake */}
        {!audit && client?.status === "pending_intake" && (
          <div className="text-center py-16">
            <h2 className="text-xl font-bold text-white mb-2">
              Audit Not Started
            </h2>
            <p className="text-gray-400">
              The intake form hasn&apos;t been submitted yet.
            </p>
          </div>
        )}

        {/* In progress */}
        {isRunning && (
          <section className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <h2
              className="text-2xl font-bold text-white uppercase tracking-wider mb-4"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              Analysing AI Visibility
            </h2>
            <p className="text-gray-400 mb-6">
              Querying {audit!.engines?.length || 7} AI search engines for{" "}
              <strong className="text-white">{client?.name}</strong>...
            </p>

            <div className="max-w-md mx-auto">
              <div className="w-full bg-gray-800 rounded-full h-4 mb-3">
                <div
                  className="bg-orange-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-400">
                <span>
                  {audit!.progress_current} / {audit!.progress_total} queries
                </span>
                <span>{progressPercent}%</span>
              </div>
              {audit!.progress_message && (
                <p className="mt-3 text-sm text-gray-500 font-mono">
                  {audit!.progress_message}
                </p>
              )}
              {audit!.progress_current > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  ~
                  {Math.ceil(
                    ((audit!.progress_total - audit!.progress_current) * 2) / 60
                  )}{" "}
                  min remaining
                </p>
              )}
            </div>
          </section>
        )}

        {/* Failed */}
        {isFailed && (
          <section className="bg-red-950 border border-red-900 rounded-xl p-8 text-center">
            <h2 className="text-xl font-bold text-red-300 mb-2">
              Audit Failed
            </h2>
            <p className="text-red-400 mb-6">
              Something went wrong during the audit. Our team has been notified.
            </p>
            <a
              href="https://balmeragency.com.au/contact"
              className="inline-block px-8 py-3 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 transition-colors uppercase tracking-wider"
            >
              Contact Us to Re-Run
            </a>
          </section>
        )}

        {/* Completed */}
        {isCompleted && (
          <>
            {/* Visibility Score Hero */}
            <section className="bg-black border border-gray-800 rounded-xl p-10 text-center">
              <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">
                Your AI Visibility Score
              </p>
              <div
                className={`text-8xl font-bold ${visColors.text}`}
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
              >
                {Math.round(visRate)}%
              </div>
              <div className="w-16 h-1 bg-orange-500 mx-auto my-4" />
              <p className="text-gray-400 text-lg">
                <strong className="text-white">{client?.name}</strong> was
                mentioned in{" "}
                <strong className="text-orange-400">
                  {audit!.total_mentioned}
                </strong>{" "}
                out of{" "}
                <strong className="text-white">{audit!.total_queries}</strong>{" "}
                AI engine queries across{" "}
                <strong className="text-white">
                  {audit!.engines?.length}
                </strong>{" "}
                platforms.
              </p>
              {visRate < 25 && (
                <p className="mt-4 text-orange-400 text-sm">
                  Your brand has significant room for improvement in AI search visibility.
                  Scroll down to see how we can help.
                </p>
              )}
            </section>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Visibility Rate",
                  value: `${Math.round(visRate)}%`,
                  color: visColors.text,
                },
                {
                  label: "Brand Mentions",
                  value: audit!.total_mentioned,
                  color: "text-orange-400",
                },
                {
                  label: "Total Queries",
                  value: audit!.total_queries,
                  color: "text-white",
                },
                {
                  label: "Engines Tested",
                  value: audit!.engines?.length,
                  color: "text-white",
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-black border border-gray-800 rounded-xl p-5 text-center"
                >
                  <div className={`text-3xl font-bold ${kpi.color}`}>
                    {kpi.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 uppercase tracking-wider">
                    {kpi.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Performance by AI Engine */}
            {sortedEngines.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-6"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Performance by AI Engine
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sortedEngines.map(([key, stats]) => {
                    const rate = stats.visibility_rate;
                    const colors = rateColor(rate);
                    const gap = 100 - rate;
                    const priority = priorityLabel(gap);
                    return (
                      <div
                        key={key}
                        className="bg-black border border-gray-800 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-white">
                            {stats.display_name || ENGINE_LABELS[key] || key}
                          </span>
                          <span className={`text-lg font-bold ${colors.text}`}>
                            {Math.round(rate)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${colors.bar}`}
                            style={{ width: `${Math.max(rate, 2)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">
                            {stats.brand_mentioned} / {stats.total_queries} mentions
                          </p>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priority.cls}`}
                          >
                            {priority.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Engine Gap Analysis Table */}
            {sortedEngines.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  AI Engine Gap Analysis
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
                        <th className="text-left py-3 px-2">AI Engine</th>
                        <th className="text-center py-3 px-2">Queries</th>
                        <th className="text-center py-3 px-2">Mentioned</th>
                        <th className="text-center py-3 px-2">Mention Rate</th>
                        <th className="text-center py-3 px-2">Missed</th>
                        <th className="text-center py-3 px-2">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedEngines.map(([key, stats]) => {
                        const gap = 100 - stats.visibility_rate;
                        const missed =
                          stats.total_queries - stats.brand_mentioned;
                        const priority = priorityLabel(gap);
                        const colors = rateColor(stats.visibility_rate);
                        return (
                          <tr
                            key={key}
                            className="border-b border-gray-800 hover:bg-gray-800/50"
                          >
                            <td className="py-3 px-2 text-white font-medium">
                              {stats.display_name || ENGINE_LABELS[key] || key}
                            </td>
                            <td className="py-3 px-2 text-center text-gray-400">
                              {stats.total_queries}
                            </td>
                            <td className="py-3 px-2 text-center text-gray-400">
                              {stats.brand_mentioned}
                            </td>
                            <td
                              className={`py-3 px-2 text-center font-bold ${colors.text}`}
                            >
                              {Math.round(stats.visibility_rate)}%
                            </td>
                            <td className="py-3 px-2 text-center text-red-400">
                              {missed}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span
                                className={`text-xs px-2 py-1 rounded-full font-bold ${priority.cls}`}
                              >
                                {priority.label}
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

            {/* Category Performance */}
            {sortedCategories.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Category Performance
                </h2>
                <div className="space-y-4">
                  {sortedCategories.map(([category, stats]) => {
                    const colors = rateColor(stats.visibility_rate);
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-white font-medium">
                            {category}
                          </span>
                          <span
                            className={`text-sm font-bold ${colors.text}`}
                          >
                            {Math.round(stats.visibility_rate)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${colors.bar}`}
                            style={{
                              width: `${Math.max(stats.visibility_rate, 2)}%`,
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {stats.brand_mentioned} / {stats.total_queries} queries
                          mentioned
                        </p>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Competitor Analysis */}
            {sortedCompetitors.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Competitor Mentions
                </h2>
                <div className="space-y-3">
                  {/* Client row first */}
                  <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                    <span className="text-sm font-bold text-orange-400 w-40 truncate">
                      {client?.name} (You)
                    </span>
                    <div className="flex-1">
                      <div className="w-full bg-gray-800 rounded-full h-3">
                        <div
                          className="h-3 rounded-full bg-orange-500"
                          style={{
                            width: `${Math.max(
                              ((audit!.total_mentioned || 0) /
                                Math.max(audit!.total_queries || 1, 1)) *
                                100,
                              2
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-orange-400 w-16 text-right">
                      {audit!.total_mentioned}
                    </span>
                  </div>
                  {sortedCompetitors.map(([name, count]) => {
                    const maxMentions = Math.max(
                      audit!.total_queries || 1,
                      count,
                      1
                    );
                    return (
                      <div
                        key={name}
                        className="flex items-center gap-3 bg-black border border-gray-800 rounded-lg p-3"
                      >
                        <span className="text-sm text-gray-300 w-40 truncate">
                          {name}
                        </span>
                        <div className="flex-1">
                          <div className="w-full bg-gray-800 rounded-full h-3">
                            <div
                              className="h-3 rounded-full bg-gray-500"
                              style={{
                                width: `${Math.max(
                                  (count / maxMentions) * 100,
                                  2
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-sm text-gray-400 w-16 text-right">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Sentiment Breakdown */}
            {totalSentiment > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Sentiment Analysis
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Positive",
                      value: sentimentBreakdown?.positive || 0,
                      color: "text-green-400",
                      bg: "bg-green-500",
                    },
                    {
                      label: "Neutral",
                      value: sentimentBreakdown?.neutral || 0,
                      color: "text-gray-400",
                      bg: "bg-gray-500",
                    },
                    {
                      label: "Negative",
                      value: sentimentBreakdown?.negative || 0,
                      color: "text-red-400",
                      bg: "bg-red-500",
                    },
                  ].map((s) => {
                    const pct =
                      totalSentiment > 0
                        ? Math.round((s.value / totalSentiment) * 100)
                        : 0;
                    return (
                      <div
                        key={s.label}
                        className="bg-black border border-gray-800 rounded-lg p-4 text-center"
                      >
                        <div className={`text-2xl font-bold ${s.color}`}>
                          {pct}%
                        </div>
                        <div className="text-xs text-gray-500 mt-1 uppercase">
                          {s.label}
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full ${s.bg}`}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Keyword Gap Analysis */}
            {keywordGaps.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Keyword Gap Analysis
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  Queries where competitors are being recommended but your brand is missing.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
                        <th className="text-left py-3 px-2">Query</th>
                        <th className="text-center py-3 px-2">Category</th>
                        <th className="text-center py-3 px-2">Engines Missed</th>
                        <th className="text-center py-3 px-2">Competitors Present</th>
                        <th className="text-center py-3 px-2">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywordGaps.slice(0, 10).map((gap) => {
                        const sevColors: Record<string, string> = {
                          critical: "bg-red-600 text-white",
                          high: "bg-orange-600 text-white",
                          medium: "bg-yellow-600 text-black",
                          low: "bg-green-600 text-white",
                        };
                        return (
                          <tr key={gap.prompt_id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-3 px-2 text-gray-300 max-w-xs truncate">{gap.prompt_text}</td>
                            <td className="py-3 px-2 text-center text-gray-400">{gap.category}</td>
                            <td className="py-3 px-2 text-center text-red-400 font-bold">
                              {gap.engines_missed.length} / {gap.engines_tested}
                            </td>
                            <td className="py-3 px-2 text-center text-gray-400">
                              {gap.competitors_present.slice(0, 2).map((c) => c.name).join(", ") || "—"}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${sevColors[gap.gap_severity] || sevColors.medium}`}>
                                {gap.gap_severity.charAt(0).toUpperCase() + gap.gap_severity.slice(1)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Strengths */}
                {keywordStrengths.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider mb-3">
                      Your Strengths ({keywordStrengths.length} queries with visibility)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {keywordStrengths.slice(0, 6).map((s) => (
                        <div key={s.prompt_id} className="bg-black border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                          <span className="text-sm text-gray-300 truncate flex-1 mr-2">{s.prompt_text}</span>
                          <span className="text-xs font-bold text-green-400 whitespace-nowrap">{s.coverage_rate}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Low Competition Opportunities */}
                {lowCompetition.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-3">
                      Low-Competition Opportunities ({lowCompetition.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {lowCompetition.slice(0, 4).map((opp) => (
                        <div key={opp.prompt_id} className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-3">
                          <p className="text-sm text-blue-300 truncate">{opp.prompt_text}</p>
                          <p className="text-xs text-blue-400/70 mt-1">{opp.opportunity}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Directory & Citation Check */}
            {directoryCitations.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Directory &amp; Citation Check
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  AI engines reference business directories when recommending brands. Being listed increases your visibility.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {directoryCitations.map((dir) => (
                    <div
                      key={dir.directory}
                      className={`border rounded-lg p-4 flex items-center gap-3 ${
                        dir.listed
                          ? "bg-green-950/20 border-green-800/50"
                          : "bg-red-950/20 border-red-800/50"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        dir.listed ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"
                      }`}>
                        {dir.listed ? "✓" : "✗"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{dir.directory}</p>
                        {dir.listed && dir.link ? (
                          <a href={dir.link} target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline truncate block">
                            Listed
                          </a>
                        ) : (
                          <p className="text-xs text-red-400">Not found</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {directoryActions.length > 0 && (
                  <div className="mt-4 p-4 bg-orange-950/20 border border-orange-800/50 rounded-lg">
                    <p className="text-sm font-bold text-orange-400 mb-2">
                      Action Required: {directoryActions.filter((d) => d.action === "claim").length} directories to claim
                    </p>
                    <p className="text-xs text-gray-400">
                      Claiming these listings improves your chances of being cited by AI engines.
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* AI vs SEO Visibility */}
            {serpComparisons.length > 0 && serpAnalysis && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  AI vs SEO Visibility
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  How your AI engine visibility compares to your traditional Google organic rankings.
                </p>

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    { label: "SEO Strong, AI Weak", value: serpAnalysis.summary.seo_strong_ai_weak, color: "text-orange-400", desc: "Priority GEO targets" },
                    { label: "AI Strong, SEO Weak", value: serpAnalysis.summary.ai_strong_seo_weak, color: "text-blue-400", desc: "AI advantage" },
                    { label: "Both Strong", value: serpAnalysis.summary.both_strong, color: "text-green-400", desc: "Well positioned" },
                    { label: "Both Weak", value: serpAnalysis.summary.both_weak, color: "text-red-400", desc: "Needs content" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-black border border-gray-800 rounded-lg p-4 text-center">
                      <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-gray-500 mt-1 uppercase">{stat.label}</div>
                      <div className="text-[10px] text-gray-600 mt-1">{stat.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Comparison table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
                        <th className="text-left py-3 px-2">Query</th>
                        <th className="text-center py-3 px-2">Google Rank</th>
                        <th className="text-center py-3 px-2">AI Mentioned</th>
                        <th className="text-center py-3 px-2">Gap Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serpComparisons.slice(0, 10).map((comp) => {
                        const gapColors: Record<string, string> = {
                          seo_strong_ai_weak: "bg-orange-600 text-white",
                          ai_strong_seo_weak: "bg-blue-600 text-white",
                          both_strong: "bg-green-600 text-white",
                          both_weak: "bg-red-600 text-white",
                        };
                        const gapLabels: Record<string, string> = {
                          seo_strong_ai_weak: "SEO > AI",
                          ai_strong_seo_weak: "AI > SEO",
                          both_strong: "Strong",
                          both_weak: "Weak",
                        };
                        return (
                          <tr key={comp.prompt_id} className="border-b border-gray-800 hover:bg-gray-800/50">
                            <td className="py-3 px-2 text-gray-300 max-w-xs truncate">{comp.prompt_text}</td>
                            <td className="py-3 px-2 text-center">
                              {comp.organic_rank ? (
                                <span className="text-green-400 font-bold">#{comp.organic_rank}</span>
                              ) : (
                                <span className="text-gray-600">Not ranked</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              {comp.ai_mentioned ? (
                                <span className="text-green-400">Yes</span>
                              ) : (
                                <span className="text-red-400">No</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className={`text-xs px-2 py-1 rounded-full font-bold ${gapColors[comp.gap_type] || "bg-gray-600 text-white"}`}>
                                {gapLabels[comp.gap_type] || comp.gap_type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Site index info */}
                {serpAnalysis.site_indexed && serpAnalysis.site_indexed.indexed_count > 0 && (
                  <div className="mt-4 p-3 bg-black border border-gray-800 rounded-lg">
                    <p className="text-sm text-gray-400">
                      <span className="text-white font-bold">{serpAnalysis.site_indexed.indexed_count.toLocaleString()}</span> pages indexed on Google
                    </p>
                  </div>
                )}
              </section>
            )}

            {/* Content Recommendations (Alice Brief) */}
            {contentRecs.length > 0 && (
              <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Content Recommendations
                </h2>
                <p className="text-sm text-gray-400 mb-6">
                  AI-generated action plan to improve your visibility across AI search engines.
                </p>

                {/* Summary stats */}
                {aliceBrief?.summary_stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-black border border-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-white">{aliceBrief.summary_stats.total_recommendations}</div>
                      <div className="text-xs text-gray-500 mt-1 uppercase">Total Recommendations</div>
                    </div>
                    <div className="bg-black border border-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-red-400">{aliceBrief.summary_stats.critical_count}</div>
                      <div className="text-xs text-gray-500 mt-1 uppercase">Critical Priority</div>
                    </div>
                    <div className="bg-black border border-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-400">{aliceBrief.summary_stats.directories_to_claim}</div>
                      <div className="text-xs text-gray-500 mt-1 uppercase">Directories to Claim</div>
                    </div>
                    <div className="bg-black border border-gray-800 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{aliceBrief.summary_stats.content_pieces_needed}</div>
                      <div className="text-xs text-gray-500 mt-1 uppercase">Content Pieces Needed</div>
                    </div>
                  </div>
                )}

                {/* Recommendation cards */}
                <div className="space-y-3">
                  {contentRecs.slice(0, 8).map((rec) => {
                    const typeColors: Record<string, string> = {
                      landing_page: "bg-purple-900 text-purple-300",
                      comparison_article: "bg-blue-900 text-blue-300",
                      blog_post: "bg-green-900 text-green-300",
                      faq_page: "bg-yellow-900 text-yellow-300",
                      case_study: "bg-pink-900 text-pink-300",
                      directory_listing: "bg-orange-900 text-orange-300",
                    };
                    const sevBorder: Record<string, string> = {
                      critical: "border-l-red-500",
                      high: "border-l-orange-500",
                      medium: "border-l-yellow-500",
                      low: "border-l-green-500",
                      opportunity: "border-l-blue-500",
                    };
                    return (
                      <div
                        key={rec.id}
                        className={`bg-black border border-gray-800 border-l-4 ${sevBorder[rec.severity] || "border-l-gray-500"} rounded-lg p-4`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-white flex-1">{rec.title}</h4>
                          <div className="flex gap-1.5 shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${typeColors[rec.type] || "bg-gray-800 text-gray-300"}`}>
                              {rec.type.replace(/_/g, " ")}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              rec.severity === "critical" ? "bg-red-600 text-white" :
                              rec.severity === "high" ? "bg-orange-600 text-white" :
                              "bg-gray-700 text-gray-300"
                            }`}>
                              {rec.severity}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mb-2">{rec.rationale}</p>
                        {rec.competitors_to_beat.length > 0 && (
                          <p className="text-xs text-orange-400">
                            Competitors to beat: {rec.competitors_to_beat.join(", ")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Tab navigation ── */}
            <div className="flex gap-1 border-b border-gray-800 pb-0">
              {(["overview", "prioritise"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                    activeTab === tab
                      ? "border-orange-500 text-orange-400"
                      : "border-transparent text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {tab === "overview" ? "Overview" : "Prioritise & Activate"}
                </button>
              ))}
            </div>

            {/* ── Prioritise & Activate tab ── */}
            {activeTab === "prioritise" && (
              <section className="bg-gray-50 rounded-xl p-6 -mx-0">
                <PrioritiseTab
                  brandName={client?.name ?? ""}
                  overallVisibility={audit!.visibility_rate ?? 0}
                  totalQueries={audit!.total_queries ?? 0}
                  totalMentioned={audit!.total_mentioned ?? 0}
                  keywordGaps={keywordGaps}
                  engineBreakdown={engineBreakdown}
                />
              </section>
            )}

            {/* ── Overview tab content (existing sections) ── */}
            {activeTab === "overview" && (
              <>

            {/* Test More Queries */}
            {audit!.status === "completed" && (
              <section className="bg-gray-900 border-2 border-dashed border-orange-500/50 rounded-xl p-6">
                <h2
                  className="text-xl font-bold text-white uppercase tracking-wider mb-2"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  Test More Queries
                </h2>
                <p className="text-sm text-gray-400 mb-4">
                  Want to check more queries? Add them below and we&apos;ll run
                  them against the same AI engines.
                </p>
                <div className="space-y-2 mb-4">
                  {additionalQueries.map((q, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={q}
                        onChange={(e) => {
                          const updated = [...additionalQueries];
                          updated[idx] = e.target.value;
                          setAdditionalQueries(updated);
                        }}
                        placeholder="e.g. best digital marketing agency in Sydney"
                        className="flex-1 px-4 py-3 bg-gray-950 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500"
                      />
                      {additionalQueries.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setAdditionalQueries(
                              additionalQueries.filter((_, i) => i !== idx)
                            )
                          }
                          className="px-3 text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setAdditionalQueries([...additionalQueries, ""])
                    }
                    className="text-sm text-orange-400 hover:text-orange-300 underline"
                  >
                    + Add another query
                  </button>
                  <button
                    type="button"
                    disabled={
                      addingQueries ||
                      additionalQueries.filter((q) => q.trim()).length === 0
                    }
                    onClick={handleAddQueries}
                    className="px-6 py-3 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 disabled:opacity-50 transition-colors uppercase tracking-wider text-sm"
                  >
                    {addingQueries ? "Adding..." : "Run These Queries"}
                  </button>
                </div>
                {addQueryError && (
                  <p className="mt-3 text-red-400 text-sm">{addQueryError}</p>
                )}
              </section>
            )}

            {/* CTA: Agent Alice */}
            <section className="bg-gradient-to-br from-gray-900 via-black to-gray-900 border-2 border-orange-500 rounded-xl overflow-hidden">
              <div className="p-10 text-center border-b border-orange-500/30">
                <p className="text-orange-400 text-sm uppercase tracking-widest font-bold mb-3">
                  Part 1 Complete
                </p>
                <h2
                  className="text-4xl md:text-5xl font-bold text-white uppercase tracking-wider mb-4"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  There&apos;s a Part 2 to This Report
                </h2>
                <div className="w-16 h-1 bg-orange-500 mx-auto my-4" />
                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                  You&apos;ve seen where you stand. Now discover exactly{" "}
                  <strong className="text-white">
                    what you need to rank for
                  </strong>{" "}
                  in order to succeed in AI search.
                </p>
              </div>

              <div className="p-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="bg-black/60 border border-gray-800 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-black"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold mb-2">
                      Your AI Ranking Plan
                    </h3>
                    <p className="text-gray-400 text-sm">
                      A detailed, query-by-query strategy for getting your brand
                      recommended by every AI engine.
                    </p>
                  </div>
                  <div className="bg-black/60 border border-gray-800 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-black"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold mb-2">
                      On-Brand Content
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Not AI slop. On-brand content specifically designed to rank
                      in AI search results.
                    </p>
                  </div>
                  <div className="bg-black/60 border border-gray-800 rounded-xl p-6 text-center">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-black"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-white font-bold mb-2">
                      Automated Execution
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Our AI agents implement the plan for you. Activate it, and
                      watch your visibility climb.
                    </p>
                  </div>
                </div>

                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-8 text-center mb-8">
                  <p className="text-lg text-white mb-2">
                    We&apos;ve built{" "}
                    <strong className="text-orange-400">Agent Alice</strong> to
                    do exactly this.
                  </p>
                  <p className="text-gray-400">
                    She analyses your gaps, creates the content plan, and writes
                    on-brand content that gets you mentioned by AI search
                    engines. Not generic AI slop &mdash; content designed to
                    rank.
                  </p>
                </div>

                <div className="text-center">
                  <a
                    href="https://balmeragency.com.au/contact"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-10 py-4 bg-orange-500 text-black font-bold rounded-lg hover:bg-orange-400 transition-colors text-lg uppercase tracking-wider"
                  >
                    Activate the Plan
                  </a>
                  <p className="text-gray-500 text-sm mt-3">
                    Talk to us about Part 2 &mdash; your AI visibility action
                    plan
                  </p>
                </div>
              </div>
            </section>
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>
            Powered by{" "}
            <a
              href="https://balmeragency.com.au"
              className="text-orange-400 hover:underline"
            >
              Balmer Agency
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
