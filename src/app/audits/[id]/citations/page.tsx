"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import InfoTip from "@/components/audit/InfoTip";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, type CitedDomain } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";

/* Fallback for audits run before top_cited_domains was persisted — rebuild
   the cited-domain list client-side from each result's citations array. */
function buildDomainsFromResults(
  results: { engine: string; citations: string[] | null }[],
  brandUrl: string
): CitedDomain[] {
  const brandDomain = brandUrl
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const counter: Record<string, { count: number; engines: Set<string> }> = {};
  for (const r of results) {
    for (const raw of r.citations || []) {
      try {
        const d = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
        if (!d) continue;
        if (!counter[d]) counter[d] = { count: 0, engines: new Set() };
        counter[d].count += 1;
        counter[d].engines.add(r.engine);
      } catch {
        // ignore malformed URLs
      }
    }
  }
  const total = Object.values(counter).reduce((s, v) => s + v.count, 0);
  return Object.entries(counter)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 50)
    .map(([domain, v]) => ({
      domain,
      count: v.count,
      share_percent: total > 0 ? +((v.count / total) * 100).toFixed(1) : 0,
      engines: Array.from(v.engines).sort(),
      is_brand: brandDomain !== "" && (brandDomain === domain || domain.endsWith("." + brandDomain)),
    }));
}

export default function CitationsPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);

  const domains: CitedDomain[] = useMemo(() => {
    if (!audit) return [];
    const fromSummary = audit.summary_json?.top_cited_domains;
    if (fromSummary && fromSummary.length > 0) return fromSummary;
    return buildDomainsFromResults(results, audit.brand_url || "");
  }, [audit, results]);

  const brandRank = useMemo(() => {
    const idx = domains.findIndex((d) => d.is_brand);
    return idx === -1 ? null : idx + 1;
  }, [domains]);

  /* High-value opportunities — non-brand domains AI already trusts. */
  const opportunities = useMemo(() => domains.filter((d) => !d.is_brand).slice(0, 10), [domains]);

  /* Directories the brand is NOT listed on = quick wins. */
  const unlistedDirectories = useMemo(
    () => (audit?.summary_json?.directory_citations ?? []).filter((d) => !d.listed),
    [audit]
  );

  /* Per-prompt "cited vs not" — cited if brand url_cited OR mentioned in ≥1 engine. */
  const promptCitation = useMemo(() => {
    const byPrompt = new Map<string, { prompt: string; cited: boolean; engines: number }>();
    for (const r of results) {
      const key = String(r.prompt_id) || r.prompt_text;
      const isCited = r.url_cited || r.brand_mentioned;
      const existing = byPrompt.get(key);
      if (existing) {
        existing.cited = existing.cited || isCited;
        existing.engines += 1;
      } else {
        byPrompt.set(key, { prompt: r.prompt_text, cited: isCited, engines: 1 });
      }
    }
    const rows = Array.from(byPrompt.values());
    rows.sort((a, b) => (a.cited !== b.cited ? (a.cited ? 1 : -1) : a.prompt.localeCompare(b.prompt)));
    const citedCount = rows.filter((r) => r.cited).length;
    return { rows, citedCount, total: rows.length };
  }, [results]);

  if (loading || !audit) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
        {loading ? "Loading..." : "Audit not found."}
      </div>
    );
  }

  const citedPct =
    promptCitation.total > 0 ? Math.round((promptCitation.citedCount / promptCitation.total) * 100) : 0;

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Citations</h1>
          <p>
            High-value places to earn citations, and exactly which queries {audit.brand_name} is —
            and isn&apos;t — cited in across the AI engines.
          </p>
        </div>
        {promptCitation.total > 0 && (
          <div className="actions">
            <Tooltip label="Download every query with its cited / not-cited status">
              <button
                className="btn btn-sm"
                onClick={() => {
                  const rows: (string | number | boolean)[][] = [
                    ["Query", "Engines tested", "Cited"],
                    ...promptCitation.rows.map((r) => [r.prompt, r.engines, r.cited]),
                  ];
                  downloadCsv(`${safeFilename(audit.brand_name)}-citations`, rows);
                }}
              >
                Export CSV
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Share of tested queries where at least one AI engine cited or mentioned your brand.">
              Citation coverage
            </InfoTip>
          </div>
          <div className={`kpi-number num-${citedPct >= 50 ? "good" : citedPct >= 20 ? "warn" : "crit"}`}>
            {citedPct}<span className="unit">%</span>
          </div>
          <div className="kpi-sub">{promptCitation.citedCount} of {promptCitation.total} queries</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Where your own domain sits among all cited sources. '—' means no engine cited you.">
              Your domain rank
            </InfoTip>
          </div>
          <div className={`kpi-number num-${brandRank ? "good" : "crit"}`}>
            {brandRank ? `#${brandRank}` : "—"}
          </div>
          <div className="kpi-sub">{brandRank ? "among cited sources" : "not cited yet"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Non-brand domains AI already trusts — the best places to get featured.">
              Opportunities
            </InfoTip>
          </div>
          <div className="kpi-number">{opportunities.length}</div>
          <div className="kpi-sub">high-value targets</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Directories AI leans on where your brand isn't listed yet — quick wins.">
              Quick-win directories
            </InfoTip>
          </div>
          <div className={`kpi-number num-${unlistedDirectories.length ? "warn" : "good"}`}>
            {unlistedDirectories.length}
          </div>
          <div className="kpi-sub">not listed yet</div>
        </div>
      </div>

      {/* HIGH-VALUE CITATION OPPORTUNITIES */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>High-value citation opportunities</h2>
            <div className="sub">
              AI engines cite these sources when answering questions in your category —
              getting featured here directly improves your chances of being cited too.
            </div>
          </div>
          <span className="chip chip-neutral">{opportunities.length} targets</span>
        </div>

        <div className="card pad-lg">
          {opportunities.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              No citation opportunities yet — no non-brand domains were cited.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {opportunities.map((d, i) => (
                <div
                  key={d.domain}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr auto",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: "var(--r-md)",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border-soft)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-3)", textAlign: "center" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 600, color: "var(--text)", wordBreak: "break-all" }}>
                      {d.domain}
                    </div>
                    <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                      {d.engines.slice(0, 5).map((e) => (
                        <span key={e} className="tag" style={{ fontSize: 9, padding: "2px 6px" }}>{e}</span>
                      ))}
                      {d.engines.length > 5 && (
                        <span style={{ fontSize: 10, color: "var(--text-4)" }}>+{d.engines.length - 5}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text)" }}>
                      {d.share_percent}
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, marginLeft: 2 }}>%</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>cited {d.count}×</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unlistedDirectories.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--border-soft)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 10 }}>
                Quick-win directories — not listed yet
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {unlistedDirectories.map((dir) => (
                  <span key={dir.directory} className="chip chip-crit">{dir.directory}</span>
                ))}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-3)", lineHeight: 1.55 }}>
                Claiming these listings is a fast way to earn citations — AI engines lean on
                directories when recommending brands.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* WHERE YOU'RE CITED VS NOT */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Where you&apos;re cited vs. not</h2>
            <div className="sub">
              For each query we tested, whether {audit.brand_name} was cited or mentioned by
              at least one AI engine. Not-cited queries are your biggest opportunities.
            </div>
          </div>
          {promptCitation.total > 0 && (
            <span className="chip chip-neutral">
              Cited in {promptCitation.citedCount} of {promptCitation.total} queries
            </span>
          )}
        </div>

        {promptCitation.total === 0 ? (
          <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
            No citation data yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Query</th>
                  <th className="center">Engines</th>
                  <th className="center">Status</th>
                </tr>
              </thead>
              <tbody>
                {promptCitation.rows.map((r, i) => (
                  <tr key={`${r.prompt}-${i}`}>
                    <td style={{ color: "var(--text)" }}>{r.prompt}</td>
                    <td className="center" style={{ color: "var(--text-3)" }}>{r.engines}</td>
                    <td className="center">
                      <span className={`chip ${r.cited ? "chip-good" : "chip-crit"}`}>
                        {r.cited ? "Cited" : "Not cited"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* HOW TO USE */}
      <div
        className="card pad-lg"
        style={{
          borderColor: "var(--mint-line)",
          background: "linear-gradient(135deg, rgba(94,234,212,.04) 0%, rgba(125,211,252,.04) 100%)",
        }}
      >
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: "var(--text)", margin: "0 0 8px" }}>
          How to use this
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
          AI engines pull from a small set of high-trust sources. Work the opportunity list above —
          for each one ask: <em>can we contribute a guest post, an answer, a profile, or a citation here?</em>{" "}
          Then focus your content on the not-cited queries to close those gaps.
        </p>
      </div>
    </AuditShell>
  );
}
