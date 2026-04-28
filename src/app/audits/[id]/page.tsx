"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuditShell from "@/components/audit/AuditShell";
import { tone } from "@/components/audit/useAuditData";

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

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-neutral",
  running: "chip-info",
  completed: "chip-good",
  failed: "chip-crit",
  cancelled: "chip-neutral",
};

const AUDIT_STATUS_CHIP: Record<string, string> = {
  completed: "chip-good",
  running: "chip-info",
  pending: "chip-neutral",
  failed: "chip-crit",
  cancelled: "chip-neutral",
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

  useEffect(() => {
    if (audit?.status === "completed") {
      fetchHistory();
    }
  }, [audit?.status, fetchHistory]);

  /* Once an audit is completed, redirect to the new Overview dashboard.
     The current page serves only as a progress/status view while audits are running. */
  useEffect(() => {
    if (audit?.status === "completed") {
      router.replace(`/audits/${id}/dashboard`);
    }
  }, [audit?.status, id, router]);

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
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-3)",
        }}
      >
        Loading audit...
      </div>
    );
  }

  if (!audit) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--crit)",
        }}
      >
        Audit not found.
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

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0 }}>{audit.brand_name}</h1>
            {audit.version > 1 && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "var(--mint-weak)",
                  color: "var(--mint)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  border: "1px solid var(--mint-line)",
                }}
              >
                v{audit.version}
              </span>
            )}
            <span className={`chip ${STATUS_CHIP[audit.status] || "chip-neutral"} chip-lg`}>
              {audit.status}
            </span>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", color: "var(--text-3)" }}>{audit.brand_url}</p>
        </div>
        <div className="actions">
          {isCompleted && audit.dashboard_url && (
            <button
              className="btn btn-sm"
              onClick={() => router.push(`/audits/${id}/dashboard`)}
            >
              Open dashboard
            </button>
          )}
          {isCompleted && !hasRunningVersion && (
            <button
              className="btn btn-sm btn-primary"
              onClick={handleReAudit}
              disabled={reAuditLoading}
            >
              {reAuditLoading ? "Starting..." : "Re-audit"}
            </button>
          )}
        </div>
      </div>

      {/* RUNNING — progress card */}
      {isRunning && (
        <div className="card pad-lg" style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
              gap: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: "var(--info)",
                  boxShadow: "0 0 12px var(--info)",
                }}
              />
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 600,
                  margin: 0,
                  color: "var(--text)",
                }}
              >
                Audit in progress
              </h3>
            </div>
            <button className="btn btn-sm" onClick={handleCancel}>
              Cancel
            </button>
          </div>

          <div className="bar" style={{ height: 10, marginBottom: 10 }}>
            <div className="bar-fill info" style={{ width: `${progressPercent}%` }} />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
              marginBottom: 8,
            }}
          >
            <span style={{ color: "var(--text-3)" }}>
              {audit.progress_current} / {audit.progress_total} queries
            </span>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                color: "var(--info)",
              }}
            >
              {progressPercent}%
            </span>
          </div>

          {audit.progress_message && (
            <p
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                marginTop: 10,
                marginBottom: 0,
              }}
            >
              {audit.progress_message}
            </p>
          )}

          {audit.progress_current > 0 && (
            <p style={{ fontSize: 11, color: "var(--text-4)", marginTop: 6, marginBottom: 0 }}>
              ~
              {Math.ceil(((audit.progress_total - audit.progress_current) * 2) / 60)} min remaining
            </p>
          )}
        </div>
      )}

      {/* FAILED — error banner */}
      {isFailed && (
        <div
          className="card pad-lg"
          style={{
            marginBottom: 24,
            borderColor: "var(--crit-line)",
            background: "var(--crit-weak)",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: "var(--crit-weak)",
                border: "1px solid var(--crit-line)",
                display: "grid",
                placeItems: "center",
                color: "var(--crit)",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  fontWeight: 600,
                  margin: "0 0 6px",
                  color: "var(--text)",
                }}
              >
                Audit failed
              </h3>
              <p style={{ margin: 0, color: "var(--text-2)", fontSize: 14 }}>
                {audit.error_message || "Unknown error."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED — fallback view (page redirects to /dashboard, this only flashes briefly) */}
      {isCompleted && (
        <>
          <div className="kpi-strip">
            <div className="kpi">
              <div className="kpi-label">Visibility</div>
              <div className={`kpi-number num-${tone(audit.visibility_rate ?? 0)}`}>
                {audit.visibility_rate ?? 0}
                <span className="unit">%</span>
              </div>
              <div className="kpi-sub">
                {audit.total_mentioned} of {audit.total_queries} queries
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Total queries</div>
              <div className="kpi-number">{audit.total_queries ?? 0}</div>
              <div className="kpi-sub">prompts run</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Brand mentions</div>
              <div className="kpi-number num-good">{audit.total_mentioned ?? 0}</div>
              <div className="kpi-sub">across engines</div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Engines tested</div>
              <div className="kpi-number">{audit.engines?.length ?? 0}</div>
              <div className="kpi-sub">
                {audit.duration_seconds
                  ? `Completed in ${Math.floor(audit.duration_seconds / 60)}m ${audit.duration_seconds % 60}s`
                  : "Completed"}
              </div>
            </div>
          </div>

          {audit.competitors?.length > 0 && (
            <div className="card pad" style={{ marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--text-4)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 10,
                }}
              >
                Competitors tracked
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {audit.competitors.map((c) => (
                  <span key={c} className="tag">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {engineBreakdown && (
            <div className="section">
              <div className="section-head">
                <div>
                  <h2>Engine performance</h2>
                  <div className="sub">Visibility rate per engine.</div>
                </div>
              </div>
              <div className="grid-3">
                {Object.entries(engineBreakdown).map(([key, stats]) => {
                  const t = tone(stats.visibility_rate);
                  return (
                    <div key={key} className="engine-card">
                      <div className="engine-head">
                        <div className="engine-name">
                          <span className={`engine-dot ${t}`} /> {stats.display_name}
                        </div>
                      </div>
                      <div className={`engine-pct num-${t}`}>
                        {Math.round(stats.visibility_rate)}
                        <span className="unit">%</span>
                      </div>
                      <div className="engine-sub">
                        {stats.brand_mentioned} of {stats.total_queries} mentions
                      </div>
                      <div className="bar" style={{ width: "100%" }}>
                        <div
                          className={`bar-fill ${t}`}
                          style={{ width: `${Math.max(stats.visibility_rate, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {history.length > 1 && (
            <div className="table-wrap">
              <div className="table-head-bar">
                <div>
                  <h3>Audit history — score changes</h3>
                  <div className="sub">All versions for this brand.</div>
                </div>
              </div>
              <div className="scroll">
                <table className="data" style={{ minWidth: 720 }}>
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Date</th>
                      <th className="center">Visibility</th>
                      <th className="center">Change</th>
                      <th className="center">Mentions</th>
                      <th className="center">Status</th>
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
                      const t = tone(entry.visibility_rate ?? 0);
                      const dDir = delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

                      return (
                        <tr
                          key={entry.id}
                          className="clickable"
                          onClick={() => router.push(`/audits/${entry.id}`)}
                          style={isCurrent ? { background: "var(--mint-weak)" } : undefined}
                        >
                          <td>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontWeight: 700,
                                color: "var(--mint)",
                              }}
                            >
                              v{entry.version}
                            </span>
                            {isCurrent && (
                              <span
                                style={{
                                  marginLeft: 8,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  letterSpacing: "0.05em",
                                  textTransform: "uppercase",
                                  padding: "2px 7px",
                                  borderRadius: 999,
                                  background: "var(--mint-weak)",
                                  color: "var(--mint)",
                                  border: "1px solid var(--mint-line)",
                                }}
                              >
                                Current
                              </span>
                            )}
                          </td>
                          <td style={{ color: "var(--text-3)" }}>
                            {entry.completed_at
                              ? new Date(entry.completed_at).toLocaleDateString("en-AU", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "In progress"}
                          </td>
                          <td className="center">
                            {entry.visibility_rate != null ? (
                              <span className={`num-big num-${t}`}>
                                {entry.visibility_rate}
                                <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>%</span>
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-3)" }}>—</span>
                            )}
                          </td>
                          <td className="center">
                            {delta != null ? (
                              <span
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color:
                                    dDir === "up"
                                      ? "var(--good)"
                                      : dDir === "down"
                                        ? "var(--crit)"
                                        : "var(--text-4)",
                                }}
                              >
                                {dDir === "up" ? "▲" : dDir === "down" ? "▼" : "±"} {Math.abs(delta)}%
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-3)" }}>—</span>
                            )}
                          </td>
                          <td className="center" style={{ color: "var(--text-2)" }}>
                            {entry.total_mentioned != null
                              ? `${entry.total_mentioned} / ${entry.total_queries}`
                              : "—"}
                          </td>
                          <td className="center">
                            <span className={`chip ${AUDIT_STATUS_CHIP[entry.status] || "chip-neutral"}`}>
                              {entry.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AuditShell>
  );
}
