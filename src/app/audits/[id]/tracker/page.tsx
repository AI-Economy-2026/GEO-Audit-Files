"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, tone } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function TrackerPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { audit, history, loading } = useAuditData(id);
  const [reAuditLoading, setReAuditLoading] = useState(false);
  const [reAuditError, setReAuditError] = useState<string | null>(null);

  /* Trigger a real re-audit: clones this audit, starts the worker, opens the new run. */
  async function handleReAudit() {
    setReAuditLoading(true);
    setReAuditError(null);
    try {
      const res = await fetch(`/api/geo-audits/${id}/re-audit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start re-audit.");
      router.push(`/audits/${data.audit_id}`);
    } catch (err) {
      setReAuditError(err instanceof Error ? err.message : "Failed to start re-audit.");
      setReAuditLoading(false);
    }
  }

  /* Movement over time: compare each audit to the previous */
  const movement = useMemo(() => {
    if (history.length === 0) return null;
    const baseline = history[0];
    const current = history[history.length - 1];
    const prev = history.length > 1 ? history[history.length - 2] : baseline;

    const currentRate = current.visibility_rate ?? 0;
    const baselineRate = baseline.visibility_rate ?? 0;
    const prevRate = prev.visibility_rate ?? 0;

    return {
      baseline,
      prev,
      current,
      deltaVsPrev: +(currentRate - prevRate).toFixed(1),
      deltaVsBaseline: +(currentRate - baselineRate).toFixed(1),
      currentRate,
      baselineRate,
      prevRate,
    };
  }, [history]);

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  if (!movement || history.length < 2) {
    return (
      <AuditShell auditId={id} brandName={audit.brand_name}>
        <div className="page-head">
          <div>
            <h1>Tracker</h1>
            <p>Movement of your visibility score over time. Needs at least two audits to show change.</p>
          </div>
        </div>
        <div className="card pad-lg" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 12 }}>
            This is your baseline audit. Run another audit to start tracking movement.
          </div>
          <button className="btn btn-primary" onClick={handleReAudit} disabled={reAuditLoading}>
            {reAuditLoading ? "Starting re-audit…" : "Run re-audit now"}
          </button>
          {reAuditError && (
            <div style={{ marginTop: 12, fontSize: 13, color: "var(--crit)" }}>{reAuditError}</div>
          )}
        </div>
      </AuditShell>
    );
  }

  const directionVsPrev: "up" | "down" | "flat" =
    movement.deltaVsPrev > 0 ? "up" : movement.deltaVsPrev < 0 ? "down" : "flat";
  const directionVsBaseline: "up" | "down" | "flat" =
    movement.deltaVsBaseline > 0 ? "up" : movement.deltaVsBaseline < 0 ? "down" : "flat";

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Tracker</h1>
          <p>
            Movement of your AI visibility score over time. Baseline is audit #1, deltas measured against the previous run.
          </p>
        </div>
        <div className="actions">
          <Tooltip label="Download every audit version with visibility / mentions / dates">
            <button
              className="btn btn-sm"
              onClick={() => {
                const rows: (string | number)[][] = [
                  ["Version", "Status", "Visibility %", "Mentions", "Total queries", "Completed"],
                  ...history.map((h) => [
                    h.version,
                    h.status,
                    h.visibility_rate ?? "",
                    h.total_mentioned ?? "",
                    h.total_queries ?? "",
                    h.completed_at ?? "",
                  ]),
                ];
                downloadCsv(`${safeFilename(audit.brand_name)}-tracker`, rows);
              }}
            >
              Export CSV
            </button>
          </Tooltip>
        </div>
      </div>

      {/* MOVEMENT CARDS */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Latest movement</h2>
            <div className="sub">What happened between the last two audits and vs baseline.</div>
          </div>
        </div>
        <div className="movement-grid">
          <div className={`mv-card ${directionVsPrev}`}>
            <div className="mv-label">vs Last audit</div>
            <div className="mv-before-after">
              <span className="mv-num mv-before">{Math.round(movement.prevRate)}</span>
              <span className="mv-arrow">→</span>
              <span className={`mv-num mv-after ${directionVsPrev}`}>{Math.round(movement.currentRate)}</span>
            </div>
            <span className={`mv-delta ${directionVsPrev}`}>
              {directionVsPrev === "up" ? "▲" : directionVsPrev === "down" ? "▼" : "±"}{" "}
              {Math.abs(movement.deltaVsPrev)}
            </span>
            <div className="mv-sub">
              {fmtDate(movement.prev.completed_at)} → {fmtDate(movement.current.completed_at)}
            </div>
          </div>

          <div className={`mv-card ${directionVsBaseline}`}>
            <div className="mv-label">vs Baseline</div>
            <div className="mv-before-after">
              <span className="mv-num mv-before">{Math.round(movement.baselineRate)}</span>
              <span className="mv-arrow">→</span>
              <span className={`mv-num mv-after ${directionVsBaseline}`}>{Math.round(movement.currentRate)}</span>
            </div>
            <span className={`mv-delta ${directionVsBaseline}`}>
              {directionVsBaseline === "up" ? "▲" : directionVsBaseline === "down" ? "▼" : "±"}{" "}
              {Math.abs(movement.deltaVsBaseline)}
            </span>
            <div className="mv-sub">
              Baseline set {fmtDate(movement.baseline.completed_at)}
            </div>
          </div>

          <div className="mv-card">
            <div className="mv-label">Audits completed</div>
            <div className="mv-before-after">
              <span className="mv-num mv-after">{history.filter((h) => h.status === "completed").length}</span>
            </div>
            <span className="mv-delta flat">v{audit.version} live</span>
            <div className="mv-sub">Total rounds run on this brand</div>
          </div>
        </div>
      </div>

      {/* AUDIT HISTORY TABLE */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Audit history</h2>
            <div className="sub">Each audit run with its score, mentions and movement.</div>
          </div>
        </div>
        <div>
          {history
            .slice()
            .reverse()
            .map((h, i, arr) => {
              const isLatest = i === 0;
              const prevEntry = arr[i + 1];
              const delta =
                prevEntry?.visibility_rate != null && h.visibility_rate != null
                  ? +(h.visibility_rate - prevEntry.visibility_rate).toFixed(1)
                  : null;
              const dir: "up" | "down" | "flat" = delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
              const rate = h.visibility_rate ?? 0;
              const t = tone(rate);

              return (
                <div
                  key={h.id}
                  className={`history-row ${isLatest ? "latest" : ""}`}
                  onClick={() => router.push(`/audits/${h.id}/dashboard`)}
                >
                  <div className="history-date">
                    {fmtDate(h.completed_at)}
                    {isLatest && (
                      <span
                        style={{
                          display: "inline-block",
                          marginLeft: 6,
                          padding: "2px 7px",
                          borderRadius: 999,
                          background: "var(--mint-weak)",
                          color: "var(--mint)",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          border: "1px solid var(--mint-line)",
                          textTransform: "uppercase",
                          verticalAlign: "middle",
                        }}
                      >
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="history-label">
                    Visibility audit v{h.version}
                    {prevEntry ? ` (${prevEntry.version} → ${h.version})` : " (baseline)"}
                  </div>
                  <div className={`history-metric ${t}`}>
                    {Math.round(rate)}
                    <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, marginLeft: 2 }}>%</span>
                  </div>
                  <div className="history-metric">
                    {h.total_mentioned ?? 0}
                    <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, marginLeft: 2 }}>
                      /{h.total_queries ?? 0}
                    </span>
                  </div>
                  <div className={`history-delta ${dir}`}>
                    {delta == null ? "baseline" : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "±"} ${Math.abs(delta)}`}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {h.status}
                  </div>
                  <div className="history-label" style={{ textAlign: "right" }}>
                    View →
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </AuditShell>
  );
}
