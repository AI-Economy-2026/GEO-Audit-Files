"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, tone } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";

type Direction = "up" | "down" | "flat";

function directionOf(delta: number): Direction {
  return delta > 0 ? "up" : delta < 0 ? "down" : "flat";
}

function arrowFor(dir: Direction): string {
  return dir === "up" ? "▲" : dir === "down" ? "▼" : "±";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function statusChipClass(status: string): string {
  if (status === "completed") return "chip-good";
  if (status === "failed") return "chip-crit";
  return "chip-warn";
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
          <div style={{ fontFamily: "var(--font-display)", fontSize: 48, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 8 }}>
            {Math.round(audit.visibility_rate ?? 0)}<span style={{ fontSize: 20, color: "var(--text-3)", fontWeight: 500 }}>%</span>
          </div>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginBottom: 20 }}>
            This is {audit.brand_name}&rsquo;s baseline audit. Run another audit to start tracking movement.
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

  const directionVsPrev = directionOf(movement.deltaVsPrev);
  const directionVsBaseline = directionOf(movement.deltaVsBaseline);
  const completedCount = history.filter((h) => h.status === "completed").length;
  const bestRate = Math.max(...history.map((h) => h.visibility_rate ?? 0));

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
          <button className="btn btn-primary btn-sm" onClick={handleReAudit} disabled={reAuditLoading}>
            {reAuditLoading ? "Starting…" : "Run re-audit now"}
          </button>
        </div>
      </div>
      {reAuditError && (
        <div style={{ marginBottom: 20, fontSize: 13, color: "var(--crit)" }}>{reAuditError}</div>
      )}

      {/* HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-label">AI visibility now</div>
          <div className="hero-headline">
            {Math.round(movement.currentRate)}
            <span className="slash">%</span>
          </div>
          <span
            className={`chip ${directionVsPrev === "up" ? "chip-good" : directionVsPrev === "down" ? "chip-crit" : "chip-neutral"}`}
            style={{ marginTop: 10, alignSelf: "flex-start" }}
          >
            {arrowFor(directionVsPrev)} {Math.abs(movement.deltaVsPrev)} points since {fmtDate(movement.prev.completed_at)}
          </span>
          <div className="hero-summary">
            {audit.brand_name} has moved from {Math.round(movement.baselineRate)}% at baseline to{" "}
            {Math.round(movement.currentRate)}% across {completedCount} audit{completedCount === 1 ? "" : "s"}
            {directionVsBaseline === "flat"
              ? ", holding steady since the first run."
              : `, ${directionVsBaseline === "up" ? "a gain" : "a drop"} of ${Math.abs(movement.deltaVsBaseline)} points since the first run.`}
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-benchmarks" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
            <div className="hero-bm-item">
              <div className="hero-bm-label">Baseline (v{movement.baseline.version})</div>
              <div className="hero-bm-value">
                <span className="num">{Math.round(movement.baselineRate)}</span>
              </div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">Best so far</div>
              <div className="hero-bm-value">
                <span className="num">{Math.round(bestRate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">vs Last audit</div>
          <div className={`kpi-number ${directionVsPrev === "up" ? "num-good" : directionVsPrev === "down" ? "num-warn" : ""}`}>
            {arrowFor(directionVsPrev)} {Math.abs(movement.deltaVsPrev)}
          </div>
          <div className="kpi-sub">v{movement.prev.version} → v{movement.current.version}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">vs Baseline</div>
          <div className={`kpi-number ${directionVsBaseline === "up" ? "num-good" : directionVsBaseline === "down" ? "num-warn" : ""}`}>
            {arrowFor(directionVsBaseline)} {Math.abs(movement.deltaVsBaseline)}
          </div>
          <div className="kpi-sub">since {fmtDate(movement.baseline.completed_at)}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Audits completed</div>
          <div className="kpi-number">{completedCount}</div>
          <div className="kpi-sub">total rounds run on this brand</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Current version</div>
          <div className="kpi-number">v{audit.version}</div>
          <div className="kpi-sub">latest run, {fmtDate(audit.completed_at)}</div>
        </div>
      </div>

      {/* AUDIT HISTORY TABLE */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Audit history</h2>
            <div className="sub">Each audit run with its score, mentions and movement vs the run before it.</div>
          </div>
        </div>
        <div className="table-wrap">
          <div className="scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Date</th>
                  <th>Visibility</th>
                  <th className="center">Mentions</th>
                  <th className="center">vs previous</th>
                  <th>Status</th>
                  <th className="center"></th>
                </tr>
              </thead>
              <tbody>
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
                    const dir: Direction = delta == null ? "flat" : directionOf(delta);
                    const rate = h.visibility_rate ?? 0;
                    const t = tone(rate);

                    return (
                      <tr
                        key={h.id}
                        className="clickable"
                        onClick={() => router.push(`/audits/${h.id}/dashboard`)}
                      >
                        <td style={{ fontWeight: 600 }}>
                          v{h.version}
                          {isLatest && (
                            <span className="chip chip-mint" style={{ marginLeft: 8, padding: "1px 7px", fontSize: 9 }}>
                              Latest
                            </span>
                          )}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, color: "var(--text-2)" }}>
                          {fmtDate(h.completed_at)}
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div className="bar" style={{ flex: 1, maxWidth: 160 }}>
                              <div className={`bar-fill ${t}`} style={{ width: `${Math.max(rate, 2)}%` }} />
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 14, width: 40, textAlign: "right" }}>
                              {Math.round(rate)}%
                            </span>
                          </div>
                        </td>
                        <td className="center">
                          {h.total_mentioned ?? 0} / {h.total_queries ?? 0}
                        </td>
                        <td className="center">
                          {delta == null ? (
                            <span style={{ color: "var(--text-3)" }}>baseline</span>
                          ) : (
                            <span
                              style={{
                                color: dir === "up" ? "var(--good)" : dir === "down" ? "var(--crit)" : "var(--text-3)",
                                fontWeight: 600,
                              }}
                            >
                              {arrowFor(dir)} {Math.abs(delta)}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={`chip ${statusChipClass(h.status)}`}>{h.status}</span>
                        </td>
                        <td className="center">
                          <span className="row-chevron">→</span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuditShell>
  );
}
