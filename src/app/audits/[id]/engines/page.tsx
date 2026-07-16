"use client";

import { useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import InfoTip from "@/components/audit/InfoTip";
import { useAuditData, tone, type EngineStats } from "@/components/audit/useAuditData";

const INDUSTRY_ENGINE_AVG = 28;
const LOG_PREFIX = "[engines]";

/** Defensively coerce one engine entry; returns null if it's not usable. */
function coerceEngineEntry(key: string, raw: unknown): [string, EngineStats] | null {
  if (!raw || typeof raw !== "object") {
    console.warn(`${LOG_PREFIX} skipping engine "${key}" — value is not an object`, raw);
    return null;
  }
  const e = raw as Record<string, unknown>;
  const visibility_rate = typeof e.visibility_rate === "number" ? e.visibility_rate : NaN;
  const brand_mentioned = typeof e.brand_mentioned === "number" ? e.brand_mentioned : 0;
  const total_queries = typeof e.total_queries === "number" ? e.total_queries : 0;
  const display_name = typeof e.display_name === "string" && e.display_name ? e.display_name : key;
  if (Number.isNaN(visibility_rate)) {
    console.warn(`${LOG_PREFIX} skipping engine "${key}" — missing/invalid visibility_rate`, e);
    return null;
  }
  return [key, { display_name, visibility_rate, brand_mentioned, total_queries }];
}

export default function EngineGapsPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);

  // Diagnostic logging — fires once per data update so we can see the shape
  // in production browser console when something looks off.
  useEffect(() => {
    if (loading) return;
    console.log(`${LOG_PREFIX} audit_id=${id}`, {
      audit_status: audit?.status,
      audit_loaded: !!audit,
      summary_json_present: !!audit?.summary_json,
      engine_breakdown_keys: audit?.summary_json?.engine_breakdown
        ? Object.keys(audit.summary_json.engine_breakdown)
        : null,
      engine_breakdown_sample:
        audit?.summary_json?.engine_breakdown &&
        Object.values(audit.summary_json.engine_breakdown)[0],
      results_count: results.length,
      first_result: results[0] || null,
    });
  }, [id, audit, results, loading]);

  const rawBreakdown = audit?.summary_json?.engine_breakdown;
  const engineBreakdown: Record<string, EngineStats> = useMemo(() => {
    if (!rawBreakdown || typeof rawBreakdown !== "object") {
      if (audit && !rawBreakdown) {
        console.warn(`${LOG_PREFIX} audit ${id} has no engine_breakdown in summary_json`);
      }
      return {};
    }
    const safe: Record<string, EngineStats> = {};
    for (const [key, value] of Object.entries(rawBreakdown)) {
      const coerced = coerceEngineEntry(key, value);
      if (coerced) safe[coerced[0]] = coerced[1];
    }
    return safe;
  }, [rawBreakdown, audit, id]);

  const sortedEngines = useMemo(
    () =>
      Object.entries(engineBreakdown).sort(
        (a, b) => (b[1]?.visibility_rate ?? 0) - (a[1]?.visibility_rate ?? 0)
      ),
    [engineBreakdown]
  );

  const strongest = sortedEngines[0];
  const weakest = sortedEngines[sortedEngines.length - 1];
  const spread =
    strongest && weakest
      ? Math.round((strongest[1]?.visibility_rate ?? 0) - (weakest[1]?.visibility_rate ?? 0))
      : 0;

  /* Engine × prompt-type matrix — guarded against malformed result rows */
  const matrix = useMemo(() => {
    try {
      if (!audit || !results.length) return null;
      const engines = Object.keys(engineBreakdown);
      if (engines.length === 0) {
        console.warn(`${LOG_PREFIX} no engines in breakdown — matrix skipped`);
        return null;
      }
      const types: Array<"intent" | "ranking"> = ["intent", "ranking"];
      const cells: Record<string, Record<string, { total: number; hit: number }>> = {};
      engines.forEach((e) => {
        cells[e] = {};
        types.forEach((t) => (cells[e][t] = { total: 0, hit: 0 }));
      });
      results.forEach((r) => {
        if (!r || !r.engine) return;
        // Normalise prompt_type: backend emits "informational" / "ranking";
        // anything else falls under "intent" so the matrix stays 2-col.
        const raw = r.prompt_type || "";
        const t: "intent" | "ranking" = raw === "ranking" ? "ranking" : "intent";
        if (!cells[r.engine]) return;
        if (!cells[r.engine][t]) cells[r.engine][t] = { total: 0, hit: 0 };
        cells[r.engine][t].total += 1;
        if (r.brand_mentioned) cells[r.engine][t].hit += 1;
      });
      return { engines, types, cells };
    } catch (err) {
      console.error(`${LOG_PREFIX} matrix build failed`, err);
      return null;
    }
  }, [audit, results, engineBreakdown]);

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  // Empty-state — engine_breakdown missing or unusable
  if (sortedEngines.length === 0) {
    return (
      <AuditShell auditId={id} brandName={audit.brand_name}>
        <div className="page-head">
          <div>
            <h1>Engine Gaps</h1>
            <p>Which AI engines cite {audit.brand_name}, and which ignore you entirely.</p>
          </div>
        </div>
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          {audit.status !== "completed"
            ? `Engine breakdown will be available once the audit finishes (current status: ${audit.status}).`
            : "No engine breakdown data found in this audit's summary. Try re-running the audit, or contact support if the issue persists."}
        </div>
      </AuditShell>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Engine Gaps</h1>
          <p>Which AI engines cite {audit.brand_name}, and which ignore you entirely.</p>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="The AI engine that cites your brand most often. Look at what's working here (page structure, schema, comparison content) and replicate the pattern on weaker engines.">
              Strongest engine
            </InfoTip>
          </div>
          <div className={`kpi-number num-${strongest ? tone(strongest[1].visibility_rate) : "crit"}`}>
            {strongest ? Math.round(strongest[1].visibility_rate) : 0}<span className="unit">%</span>
          </div>
          <div className="kpi-sub">{strongest ? strongest[1].display_name : "—"}</div>
          <div className="benchmark">
            <span className="benchmark-label">Industry</span>
            <span className="benchmark-val">{INDUSTRY_ENGINE_AVG}%</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="The AI engine that cites you least (often 0%). This is usually the single biggest lift opportunity — fix what makes this engine ignore you and your overall rank jumps.">
              Weakest engine
            </InfoTip>
          </div>
          <div className={`kpi-number num-${weakest ? tone(weakest[1].visibility_rate) : "crit"}`}>
            {weakest ? Math.round(weakest[1].visibility_rate) : 0}<span className="unit">%</span>
          </div>
          <div className="kpi-sub">{weakest ? weakest[1].display_name : "—"}</div>
          <div className="benchmark">
            <span className="benchmark-label">Industry</span>
            <span className="benchmark-val">19%</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Gap between your best and worst engine in percentage points. Low spread = consistent visibility. High spread = you're winning some engines but invisible on others — target the laggards.">
              Engine spread
            </InfoTip>
          </div>
          <div className={`kpi-number num-${spread > 20 ? "warn" : "good"}`}>
            {spread}<span className="unit">pt</span>
          </div>
          <div className="kpi-sub">{spread > 20 ? "inconsistent" : "consistent"}</div>
          <div className="benchmark">
            <span className="benchmark-label">Target</span>
            <span className="benchmark-val">&lt; 15pt</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Number of AI engines included in this audit. We cover the 7 most-used: ChatGPT, Claude, Gemini, Perplexity, Grok, Google AI Mode, Google AI Overview.">
              Engines tested
            </InfoTip>
          </div>
          <div className="kpi-number">{audit.engines?.length ?? 0}</div>
          <div className="kpi-sub">weighted by usage</div>
          <div className="benchmark">
            <span className="benchmark-label">Coverage</span>
            <span className="benchmark-val">Full</span>
          </div>
        </div>
      </div>

      {/* ENGINE CARDS */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>How each engine sees you</h2>
            <div className="sub">Percentage of prompts where you are cited.</div>
          </div>
        </div>
        <div className="grid-3">
          {sortedEngines.map(([key, stats]) => {
            const t = tone(stats.visibility_rate);
            const chipLabel = t === "good" ? "Strongest" : t === "warn" ? "Medium" : stats.visibility_rate === 0 ? "Absent" : "Weak";
            const industryDelta = +(stats.visibility_rate - INDUSTRY_ENGINE_AVG).toFixed(0);
            return (
              <div key={key} className="engine-card">
                <div className="engine-head">
                  <div className="engine-name">
                    <span className={`engine-dot ${t}`} /> {stats.display_name}
                  </div>
                  <span className={`chip chip-${t}`}>{chipLabel}</span>
                </div>
                <div className={`engine-pct num-${t}`}>
                  {Math.round(stats.visibility_rate)}<span className="unit">%</span>
                </div>
                <div className="engine-sub">
                  {stats.brand_mentioned} of {stats.total_queries} prompts
                </div>
                <div className="bar" style={{ width: "100%" }}>
                  <div className={`bar-fill ${t}`} style={{ width: `${Math.max(stats.visibility_rate, 2)}%` }} />
                </div>
                <div className="benchmark" style={{ marginTop: 12 }}>
                  <span className="benchmark-label">Industry</span>
                  <span className="benchmark-val">{INDUSTRY_ENGINE_AVG}%</span>
                  {industryDelta !== 0 && (
                    <span className={`delta ${industryDelta > 0 ? "up" : "down"}`}>
                      {industryDelta > 0 ? "▲" : "▼"} {Math.abs(industryDelta)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ENGINE × PROMPT-TYPE MATRIX */}
      {matrix && (
        <div className="table-wrap">
          <div className="table-head-bar">
            <div>
              <h3>Engine × prompt-type matrix</h3>
              <div className="sub">Where each engine surfaces you by prompt category.</div>
            </div>
          </div>
          <div className="scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Engine</th>
                  {matrix.types.map((t) => (
                    <th key={t} className="center">
                      {t === "intent" ? "Intent prompts" : "Ranking prompts"}
                    </th>
                  ))}
                  <th className="center">Total</th>
                </tr>
              </thead>
              <tbody>
                {matrix.engines.map((e) => {
                  const engineInfo = engineBreakdown[e];
                  if (!engineInfo) return null;
                  let totalHit = 0;
                  let totalAll = 0;
                  return (
                    <tr key={e}>
                      <td style={{ fontWeight: 600, color: "var(--text)" }}>{engineInfo.display_name}</td>
                      {matrix.types.map((t) => {
                        const cell = matrix.cells[e][t];
                        totalHit += cell.hit;
                        totalAll += cell.total;
                        const rate = cell.total > 0 ? Math.round((cell.hit / cell.total) * 100) : 0;
                        return (
                          <td key={t} className="center">
                            <span className={`num-big num-${tone(rate)}`}>
                              {rate}<span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>%</span>
                            </span>
                            <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                              {cell.hit}/{cell.total}
                            </div>
                          </td>
                        );
                      })}
                      <td className="center">
                        <span className={`num-big num-${tone(engineInfo.visibility_rate)}`}>
                          {Math.round(engineInfo.visibility_rate)}
                          <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>%</span>
                        </span>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>
                          {totalHit}/{totalAll}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AuditShell>
  );
}
