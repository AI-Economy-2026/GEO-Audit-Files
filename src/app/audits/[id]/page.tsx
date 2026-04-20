"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/ui/AppShell";
import TopNav from "@/components/ui/TopNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

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

type Tone = "primary" | "secondary" | "error" | "neutral" | "success";

const STATUS_TONE: Record<string, Tone> = {
  pending: "secondary",
  running: "primary",
  completed: "success",
  failed: "error",
  cancelled: "neutral",
};

function visibilityTone(rate: number | null): string {
  if (rate == null) return "text-on-surface-variant";
  if (rate >= 50) return "text-primary";
  if (rate >= 25) return "text-secondary";
  return "text-error";
}

function visibilityBar(rate: number): string {
  if (rate >= 50) return "bg-primary";
  if (rate >= 25) return "bg-secondary";
  return "bg-error";
}

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

  const shell = (children: React.ReactNode) => (
    <AppShell
      topNav={
        <TopNav
          brand="GEO Audit Pro"
          tabs={[
            { href: "/audits", label: "Audits", match: (p) => p.startsWith("/audits") },
            { href: "/clients", label: "Clients", match: (p) => p.startsWith("/clients") },
          ]}
          right={
            <Button variant="ghost" icon="arrow_back" size="sm" onClick={() => router.push("/audits")}>
              Back
            </Button>
          }
        />
      }
    >
      {children}
    </AppShell>
  );

  if (loading) {
    return shell(
      <GlassCard padding="xl" className="text-center">
        <p className="text-on-surface-variant">Loading audit...</p>
      </GlassCard>
    );
  }

  if (!audit) {
    return shell(
      <GlassCard padding="xl" className="text-center">
        <p className="text-error">Audit not found.</p>
      </GlassCard>
    );
  }

  const progressPercent =
    audit.progress_total > 0
      ? Math.round((audit.progress_current / audit.progress_total) * 100)
      : 0;

  const isRunning = audit.status === "running" || audit.status === "pending";
  const isCompleted = audit.status === "completed";
  const isFailed = audit.status === "failed";

  const engineBreakdown = audit.summary_json?.engine_breakdown as
    | Record<
        string,
        {
          display_name: string;
          visibility_rate: number;
          brand_mentioned: number;
          total_queries: number;
        }
      >
    | undefined;

  const hasRunningVersion = history.some(
    (h) => h.status === "running" || h.status === "pending"
  );

  return shell(
    <>
      {/* Header */}
      <div className="flex flex-wrap justify-between items-end mb-10 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface">
              {audit.brand_name}
            </h2>
            {audit.version > 1 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold">
                v{audit.version}
              </span>
            )}
            <Badge tone={STATUS_TONE[audit.status] || "neutral"}>{audit.status}</Badge>
          </div>
          <p className="text-on-surface-variant text-lg">{audit.brand_url}</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {isCompleted && audit.dashboard_url && (
            <>
              <Button
                variant="secondary"
                icon="open_in_new"
                onClick={() => router.push(`/audits/${id}/dashboard`)}
              >
                Full Dashboard
              </Button>
            </>
          )}
          {isCompleted && !hasRunningVersion && (
            <Button
              icon="refresh"
              onClick={handleReAudit}
              disabled={reAuditLoading}
            >
              {reAuditLoading ? "Starting..." : "Re-Audit"}
            </Button>
          )}
        </div>
      </div>

      {/* Running: progress panel */}
      {isRunning && (
        <GlassCard padding="lg" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-3">
              <span className="material-symbols-outlined text-primary animate-pulse">radar</span>
              Audit in Progress
            </h3>
            <Button variant="ghost" size="sm" icon="stop" onClick={handleCancel}>
              Cancel
            </Button>
          </div>

          <div className="w-full h-2 bg-surface-container-lowest rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex justify-between text-sm mb-2">
            <span className="text-on-surface-variant">
              {audit.progress_current} / {audit.progress_total} queries
            </span>
            <span className="text-primary font-bold">{progressPercent}%</span>
          </div>

          {audit.progress_message && (
            <p className="text-xs text-on-surface-variant font-mono mt-3 opacity-70">
              {audit.progress_message}
            </p>
          )}

          {audit.progress_current > 0 && (
            <p className="text-xs text-on-surface-variant mt-2 opacity-60">
              ~
              {Math.ceil(((audit.progress_total - audit.progress_current) * 2) / 60)}{" "}
              min remaining
            </p>
          )}
        </GlassCard>
      )}

      {/* Failed */}
      {isFailed && (
        <GlassCard padding="lg" className="mb-8 border-error/30">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-error-container/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-error">report</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">Audit Failed</h3>
              <p className="text-on-surface-variant">
                {audit.error_message || "Unknown error."}
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Completed */}
      {isCompleted && (
        <div className="space-y-8">
          {/* KPI Bento */}
          <div className="grid grid-cols-12 gap-6">
            {/* Hero visibility score — floating dark glass card with cyan accent */}
            <div className="col-span-12 lg:col-span-4 glass-card p-8 rounded-[2rem] border border-white/5 shadow-[0_0_60px_rgba(68,216,241,0.08)] h-full flex flex-col justify-between items-center text-center">
              <div className="w-full text-left">
                <span className="text-on-surface-variant font-bold uppercase tracking-widest text-xs">
                  Visibility Score
                </span>
              </div>
              <div className="py-8">
                <span className="text-8xl font-black text-primary tracking-tighter drop-shadow-[0_0_30px_rgba(68,216,241,0.35)]">
                  {audit.visibility_rate ?? 0}%
                </span>
                <p className="text-on-surface font-bold mt-3 text-base">
                  {audit.total_mentioned} of {audit.total_queries} queries
                </p>
              </div>
              <div className="w-full bg-white/5 border border-white/5 p-3 rounded-2xl flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">
                  schedule
                </span>
                <span className="text-on-surface-variant text-sm text-left leading-tight">
                  {audit.duration_seconds
                    ? `Completed in ${Math.floor(audit.duration_seconds / 60)}m ${audit.duration_seconds % 60}s`
                    : "Completed"}
                </span>
              </div>
            </div>

            {/* Stat cards column */}
            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-6">
              <GlassCard padding="md">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                  Total Queries
                </p>
                <p className="text-3xl font-black tracking-tighter text-on-surface">
                  {audit.total_queries}
                </p>
              </GlassCard>
              <GlassCard padding="md">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                  Brand Mentions
                </p>
                <p className="text-3xl font-black tracking-tighter text-primary">
                  {audit.total_mentioned}
                </p>
              </GlassCard>
              <GlassCard padding="md">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                  Engines Tested
                </p>
                <p className="text-3xl font-black tracking-tighter text-on-surface">
                  {audit.engines?.length}
                </p>
              </GlassCard>

              {/* Competitors list */}
              {audit.competitors?.length > 0 && (
                <GlassCard padding="md" className="col-span-2 md:col-span-3">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-3">
                    Competitors Tracked
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {audit.competitors.map((c) => (
                      <span
                        key={c}
                        className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-medium text-on-surface"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              )}
            </div>
          </div>

          {/* Engine Performance */}
          {engineBreakdown && (
            <GlassCard padding="lg">
              <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">bar_chart</span>
                Engine Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(engineBreakdown).map(([key, stats]) => (
                  <div
                    key={key}
                    className="p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-on-surface">{stats.display_name}</span>
                      <span
                        className={`text-xl font-black tracking-tighter ${visibilityTone(stats.visibility_rate)}`}
                      >
                        {stats.visibility_rate}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${visibilityBar(stats.visibility_rate)} rounded-full`}
                        style={{ width: `${stats.visibility_rate}%` }}
                      />
                    </div>
                    <p className="text-xs text-on-surface-variant">
                      {stats.brand_mentioned} / {stats.total_queries} mentions
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Score History */}
          {history.length > 1 && (
            <GlassCard padding="lg">
              <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">timeline</span>
                Audit History &mdash; Score Changes
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                        Version
                      </th>
                      <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                        Date
                      </th>
                      <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                        Visibility
                      </th>
                      <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                        Change
                      </th>
                      <th className="pb-3 pr-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                        Mentions
                      </th>
                      <th className="pb-3 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, idx) => {
                      const prev = idx > 0 ? history[idx - 1] : null;
                      const delta =
                        prev &&
                        entry.visibility_rate != null &&
                        prev.visibility_rate != null
                          ? +(entry.visibility_rate - prev.visibility_rate).toFixed(1)
                          : null;
                      const isCurrent = entry.id === id;

                      return (
                        <tr
                          key={entry.id}
                          className={`border-b border-white/5 ${isCurrent ? "bg-primary/10" : "hover:bg-white/5"} transition-colors`}
                        >
                          <td className="py-4 pr-4">
                            <button
                              onClick={() => router.push(`/audits/${entry.id}`)}
                              className="text-primary font-bold hover:underline"
                            >
                              v{entry.version}
                            </button>
                            {isCurrent && (
                              <span className="ml-2 text-[9px] bg-primary text-on-primary-fixed px-1.5 py-0.5 rounded font-bold uppercase">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-4 pr-4 text-on-surface-variant">
                            {entry.completed_at
                              ? new Date(entry.completed_at).toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "In progress"}
                          </td>
                          <td className={`py-4 pr-4 font-black tracking-tighter ${visibilityTone(entry.visibility_rate)}`}>
                            {entry.visibility_rate != null ? `${entry.visibility_rate}%` : "—"}
                          </td>
                          <td className="py-4 pr-4">
                            {delta != null ? (
                              <span
                                className={`inline-flex items-center gap-1 font-bold ${
                                  delta > 0
                                    ? "text-primary"
                                    : delta < 0
                                      ? "text-error"
                                      : "text-on-surface-variant"
                                }`}
                              >
                                {delta > 0 ? "+" : ""}
                                {delta}%
                                {delta > 0 && <span>&#9650;</span>}
                                {delta < 0 && <span>&#9660;</span>}
                              </span>
                            ) : (
                              <span className="text-on-surface-variant">—</span>
                            )}
                          </td>
                          <td className="py-4 pr-4 text-on-surface-variant">
                            {entry.total_mentioned != null
                              ? `${entry.total_mentioned} / ${entry.total_queries}`
                              : "—"}
                          </td>
                          <td className="py-4">
                            <Badge tone={STATUS_TONE[entry.status] || "neutral"}>
                              {entry.status}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
      )}
    </>
  );
}
