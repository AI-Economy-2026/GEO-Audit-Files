"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface AuditData {
  id: string;
  brand_name: string;
  brand_url: string;
  status: string;
  progress_current: number;
  progress_total: number;
  progress_message: string | null;
  error_message: string | null;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  dashboard_url: string | null;
  summary_json: Record<string, unknown> | null;
  engines: string[];
  competitors: string[];
  created_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  parent_audit_id: string | null;
  version: number;
}

interface AuditHistoryEntry {
  id: string;
  version: number;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  engines: Record<string, number>;
  created_at: string;
  completed_at: string | null;
}

const ENGINE_LABELS: Record<string, string> = {
  openai: "ChatGPT",
  anthropic: "Claude",
  google: "Gemini",
  perplexity: "Perplexity",
  xai: "Grok",
  deepseek: "DeepSeek",
  meta_llama: "Llama",
  google_ai_mode: "AI Mode",
  google_ai_overview: "AI Overview",
  bing_copilot: "Bing Copilot",
};

export default function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
  const [reAuditLoading, setReAuditLoading] = useState(false);

  const fetchAudit = useCallback(async () => {
    const res = await fetch(`/api/geo-audits/${id}`);
    const data = await res.json();
    if (data.audit) {
      setAudit(data.audit);
    }
    setLoading(false);
  }, [id]);

  const fetchHistory = useCallback(async () => {
    const res = await fetch(`/api/geo-audits/${id}/history`);
    const data = await res.json();
    if (data.history) {
      setHistory(data.history);
    }
  }, [id]);

  async function handleReAudit() {
    setReAuditLoading(true);
    try {
      const res = await fetch(`/api/geo-audits/${id}/re-audit`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.audit_id) {
        router.push(`/audits/${data.audit_id}`);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setReAuditLoading(false);
    }
  }

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  // Supabase Realtime subscription for live progress
  useEffect(() => {
    if (!id) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`audit-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "geo_audits",
          filter: `id=eq.${id}`,
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
  }, [id]);

  // Fetch audit history when audit is completed
  useEffect(() => {
    if (audit?.status === "completed") {
      fetchHistory();
    }
  }, [audit?.status, fetchHistory]);

  async function handleCancel() {
    await fetch(`/api/geo-audits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    fetchAudit();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading audit...</p>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Audit not found.</p>
      </div>
    );
  }

  const progressPercent =
    audit.progress_total > 0
      ? Math.round((audit.progress_current / audit.progress_total) * 100)
      : 0;

  const isRunning = audit.status === "running" || audit.status === "pending";
  const isCompleted = audit.status === "completed";
  const isFailed = audit.status === "failed";

  // Extract engine breakdown from summary_json
  const engineBreakdown = audit.summary_json?.engine_breakdown as
    | Record<string, { display_name: string; visibility_rate: number; brand_mentioned: number; total_queries: number }>
    | undefined;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/audits")}
            className="text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {audit.brand_name}
          </h1>
          {audit.version > 1 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              v{audit.version}
            </span>
          )}
          <span className="text-sm text-gray-500">{audit.brand_url}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Progress Section (visible while running) */}
        {isRunning && (
          <section className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Audit in Progress
              </h2>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                Cancel
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-4 mb-3">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-sm text-gray-600">
              <span>
                {audit.progress_current} / {audit.progress_total} queries
              </span>
              <span>{progressPercent}%</span>
            </div>

            {audit.progress_message && (
              <p className="mt-3 text-sm text-gray-500 font-mono">
                {audit.progress_message}
              </p>
            )}

            {/* Estimated time remaining */}
            {audit.progress_current > 0 && (
              <p className="mt-2 text-xs text-gray-400">
                ~{Math.ceil(((audit.progress_total - audit.progress_current) * 2) / 60)}{" "}
                min remaining
              </p>
            )}
          </section>
        )}

        {/* Error Section */}
        {isFailed && (
          <section className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">
              Audit Failed
            </h2>
            <p className="text-red-700">{audit.error_message || "Unknown error."}</p>
          </section>
        )}

        {/* Results Section (visible when completed) */}
        {isCompleted && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {audit.visibility_rate}%
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Overall Visibility
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {audit.total_mentioned}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Brand Mentions
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {audit.total_queries}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Total Queries
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {audit.engines?.length}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Engines Tested
                </div>
              </div>
            </div>

            {/* Engine Breakdown */}
            {engineBreakdown && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Engine Performance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(engineBreakdown).map(([key, stats]) => (
                    <div
                      key={key}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-900">
                          {stats.display_name}
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            stats.visibility_rate >= 50
                              ? "text-green-600"
                              : stats.visibility_rate >= 25
                                ? "text-orange-500"
                                : "text-red-500"
                          }`}
                        >
                          {stats.visibility_rate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            stats.visibility_rate >= 50
                              ? "bg-green-500"
                              : stats.visibility_rate >= 25
                                ? "bg-orange-400"
                                : "bg-red-400"
                          }`}
                          style={{ width: `${stats.visibility_rate}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {stats.brand_mentioned} / {stats.total_queries} mentions
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap">
              {audit.dashboard_url && (
                <>
                  <button
                    onClick={() => router.push(`/audits/${id}/dashboard`)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                  >
                    View Full Dashboard
                  </button>
                  <a
                    href={audit.dashboard_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    Open in New Tab
                  </a>
                </>
              )}
              {!history.some((h) => h.status === "running" || h.status === "pending") && (
                <button
                  onClick={handleReAudit}
                  disabled={reAuditLoading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reAuditLoading ? "Starting Re-Audit..." : "Re-Audit"}
                </button>
              )}
            </div>

            {/* Score History (shown when there are multiple versions) */}
            {history.length > 1 && (
              <section className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Audit History &mdash; Score Changes
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-3 pr-4">Version</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Visibility</th>
                        <th className="pb-3 pr-4">Change</th>
                        <th className="pb-3 pr-4">Mentions</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((entry, idx) => {
                        const prev = idx > 0 ? history[idx - 1] : null;
                        const delta =
                          prev && entry.visibility_rate != null && prev.visibility_rate != null
                            ? +(entry.visibility_rate - prev.visibility_rate).toFixed(1)
                            : null;

                        return (
                          <tr
                            key={entry.id}
                            className={`border-b border-gray-100 ${entry.id === id ? "bg-blue-50" : "hover:bg-gray-50"}`}
                          >
                            <td className="py-3 pr-4 font-medium">
                              <button
                                onClick={() => router.push(`/audits/${entry.id}`)}
                                className="text-blue-600 hover:underline"
                              >
                                v{entry.version}
                              </button>
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {entry.completed_at
                                ? new Date(entry.completed_at).toLocaleDateString("en-AU", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "In progress"}
                            </td>
                            <td className="py-3 pr-4 font-semibold">
                              {entry.visibility_rate != null ? `${entry.visibility_rate}%` : "—"}
                            </td>
                            <td className="py-3 pr-4">
                              {delta != null ? (
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold ${
                                    delta > 0
                                      ? "text-green-600"
                                      : delta < 0
                                        ? "text-red-600"
                                        : "text-gray-400"
                                  }`}
                                >
                                  {delta > 0 ? "+" : ""}
                                  {delta}%
                                  {delta > 0 && <span>&#9650;</span>}
                                  {delta < 0 && <span>&#9660;</span>}
                                </span>
                              ) : (
                                <span className="text-gray-400">&mdash;</span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-gray-700">
                              {entry.total_mentioned != null
                                ? `${entry.total_mentioned} / ${entry.total_queries}`
                                : "—"}
                            </td>
                            <td className="py-3">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                                  entry.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : entry.status === "running"
                                      ? "bg-blue-100 text-blue-700"
                                      : entry.status === "failed"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {entry.status}
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

            {/* Duration */}
            {audit.duration_seconds && (
              <p className="text-sm text-gray-500">
                Completed in {Math.floor(audit.duration_seconds / 60)}m{" "}
                {audit.duration_seconds % 60}s on{" "}
                {new Date(audit.completed_at!).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
