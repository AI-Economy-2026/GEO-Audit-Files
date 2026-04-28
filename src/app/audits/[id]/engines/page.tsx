"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import { useAuditData, tone } from "@/components/audit/useAuditData";

const INDUSTRY_ENGINE_AVG = 28;

export default function EngineGapsPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);

  const engineBreakdown = audit?.summary_json?.engine_breakdown || {};
  const sortedEngines = Object.entries(engineBreakdown).sort((a, b) => b[1].visibility_rate - a[1].visibility_rate);

  const strongest = sortedEngines[0];
  const weakest = sortedEngines[sortedEngines.length - 1];
  const spread =
    strongest && weakest ? Math.round(strongest[1].visibility_rate - weakest[1].visibility_rate) : 0;

  /* Engine × prompt-type matrix */
  const matrix = useMemo(() => {
    if (!audit || !results.length) return null;
    const engines = Object.keys(engineBreakdown);
    const types: Array<"intent" | "ranking"> = ["intent", "ranking"];
    const cells: Record<string, Record<string, { total: number; hit: number }>> = {};
    engines.forEach((e) => {
      cells[e] = {};
      types.forEach((t) => (cells[e][t] = { total: 0, hit: 0 }));
    });
    results.forEach((r) => {
      const t = (r.prompt_type || "ranking") as "intent" | "ranking";
      if (!cells[r.engine]) return;
      cells[r.engine][t].total += 1;
      if (r.brand_mentioned) cells[r.engine][t].hit += 1;
    });
    return { engines, types, cells };
  }, [audit, results, engineBreakdown]);

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
          <h1>Engine Gaps</h1>
          <p>Which AI engines cite {audit.brand_name}, and which ignore you entirely.</p>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Strongest engine</div>
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
          <div className="kpi-label">Weakest engine</div>
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
          <div className="kpi-label">Engine spread</div>
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
          <div className="kpi-label">Engines tested</div>
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
