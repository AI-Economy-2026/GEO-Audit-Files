"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/audit/WorkspaceShell";
import { tone } from "@/components/audit/useAuditData";

interface Audit {
  id: string;
  brand_name: string;
  brand_url: string;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  engines: string[];
  created_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  parent_audit_id?: string | null;
  version?: number;
}

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-neutral",
  running: "chip-info",
  completed: "chip-good",
  failed: "chip-crit",
  cancelled: "chip-neutral",
};

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/geo-audits");
      const data = await res.json();
      setAudits(data.audits || []);
      setLoading(false);
    })();
  }, []);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  const totalAudits = audits.length;
  const completed = audits.filter((a) => a.status === "completed").length;
  const running = audits.filter((a) => a.status === "running" || a.status === "pending").length;
  const completedAudits = audits.filter((a) => a.visibility_rate != null);
  const avgVisibility = completedAudits.length
    ? Math.round(
        completedAudits.reduce((sum, a) => sum + (a.visibility_rate || 0), 0) / completedAudits.length
      )
    : 0;

  return (
    <WorkspaceShell
      title="Audits"
      actions={
        <button className="btn btn-sm btn-primary" onClick={() => router.push("/audits/new")}>
          New audit
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>Your audits</h1>
          <p>
            Every AI Search Visibility audit run from this workspace. Click any row to open the full
            report.
          </p>
        </div>
      </div>

      {!loading && totalAudits > 0 && (
        <div className="kpi-strip">
          <div className="kpi">
            <div className="kpi-label">Total audits</div>
            <div className="kpi-number">{totalAudits}</div>
            <div className="kpi-sub">in this workspace</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Completed</div>
            <div className="kpi-number num-good">{completed}</div>
            <div className="kpi-sub">finished runs</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Running</div>
            <div className={`kpi-number ${running > 0 ? "num-info" : ""}`}>{running}</div>
            <div className="kpi-sub">in progress</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Avg visibility</div>
            <div className={`kpi-number num-${tone(avgVisibility)}`}>
              {completedAudits.length ? avgVisibility : "—"}
              {completedAudits.length ? <span className="unit">%</span> : null}
            </div>
            <div className="kpi-sub">across completed runs</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          Loading audits...
        </div>
      ) : audits.length === 0 ? (
        <div className="card pad-lg" style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 14px",
              borderRadius: 14,
              background: "var(--mint-weak)",
              border: "1px solid var(--mint-line)",
              display: "grid",
              placeItems: "center",
              color: "var(--mint)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 8px",
            }}
          >
            No audits yet
          </h3>
          <p style={{ color: "var(--text-3)", maxWidth: 440, margin: "0 auto 18px" }}>
            Run your first AI visibility audit to see how your brand appears across ChatGPT, Claude,
            Gemini, Perplexity and more.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/audits/new")}>
            Create your first audit
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-head-bar">
            <div>
              <h3>Audit history</h3>
              <div className="sub">Latest first.</div>
            </div>
          </div>
          <div className="scroll">
            <table className="data" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Brand</th>
                  <th className="center">Status</th>
                  <th className="center">Visibility</th>
                  <th className="center">Engines</th>
                  <th className="center">Duration</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  const t = tone(audit.visibility_rate ?? 0);
                  return (
                    <tr
                      key={audit.id}
                      className="clickable"
                      onClick={() => router.push(`/audits/${audit.id}`)}
                    >
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {audit.brand_name}
                          {audit.version && audit.version > 1 && (
                            <span
                              style={{
                                padding: "2px 7px",
                                borderRadius: 999,
                                background: "var(--mint-weak)",
                                color: "var(--mint)",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: "0.05em",
                                border: "1px solid var(--mint-line)",
                              }}
                            >
                              v{audit.version}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-3)",
                            fontFamily: "var(--font-mono)",
                            marginTop: 2,
                          }}
                        >
                          {audit.brand_url}
                        </div>
                      </td>
                      <td className="center">
                        <span className={`chip ${STATUS_CHIP[audit.status] || "chip-neutral"}`}>
                          {audit.status}
                        </span>
                      </td>
                      <td className="center">
                        {audit.visibility_rate != null ? (
                          <span className={`num-big num-${t}`}>
                            {audit.visibility_rate}
                            <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>%</span>
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                      <td className="center" style={{ color: "var(--text-2)" }}>
                        {audit.engines?.length || 0}
                      </td>
                      <td className="center" style={{ color: "var(--text-2)" }}>
                        {formatDuration(audit.duration_seconds)}
                      </td>
                      <td style={{ color: "var(--text-3)" }}>{formatDate(audit.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
