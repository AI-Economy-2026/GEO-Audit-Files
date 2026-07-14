"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import InfoTip from "@/components/audit/InfoTip";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, type CitedDomain } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";

/* When the worker hasn't backfilled top_cited_domains yet (older audits),
   build it client-side from results.citations as a fallback. */
function buildDomainsFromResults(results: { engine: string; citations: string[] | null }[], brandUrl: string): CitedDomain[] {
  const brandDomain = brandUrl
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];

  const counter: Record<string, { count: number; engines: Set<string> }> = {};
  for (const r of results) {
    const list = r.citations || [];
    for (const raw of list) {
      try {
        const u = new URL(raw);
        const d = u.hostname.replace(/^www\./, "").toLowerCase();
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

export default function SourcesPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);

  const domains: CitedDomain[] = useMemo(() => {
    if (!audit) return [];
    const fromSummary = audit.summary_json?.top_cited_domains;
    if (fromSummary && fromSummary.length > 0) return fromSummary;
    // Fallback for audits run before this feature shipped
    return buildDomainsFromResults(results, audit.brand_url || "");
  }, [audit, results]);

  const totalCitations = useMemo(
    () =>
      audit?.summary_json?.citation_totals?.total_citations ??
      domains.reduce((s, d) => s + d.count, 0),
    [audit, domains]
  );

  const uniqueDomains = useMemo(
    () => audit?.summary_json?.citation_totals?.unique_domains ?? domains.length,
    [audit, domains]
  );

  const brandRank = useMemo(() => {
    const idx = domains.findIndex((d) => d.is_brand);
    return idx === -1 ? null : idx + 1;
  }, [domains]);

  /* High-value citation opportunities — non-brand domains AI already trusts,
     ranked by how often they're cited. These are the places to get featured. */
  const opportunities = useMemo(
    () => domains.filter((d) => !d.is_brand).slice(0, 10),
    [domains]
  );

  /* Directories the brand is NOT listed on = quick-win opportunities. */
  const unlistedDirectories = useMemo(
    () => (audit?.summary_json?.directory_citations ?? []).filter((d) => !d.listed),
    [audit]
  );

  /* Per-prompt "cited vs not" — a prompt counts as cited when the brand is
     url_cited OR brand_mentioned in at least one engine response. */
  const promptCitation = useMemo(() => {
    const byPrompt = new Map<
      string,
      { prompt: string; cited: boolean; engines: number }
    >();
    for (const r of results) {
      const key = String(r.prompt_id) || r.prompt_text;
      const existing = byPrompt.get(key);
      const isCited = r.url_cited || r.brand_mentioned;
      if (existing) {
        existing.cited = existing.cited || isCited;
        existing.engines += 1;
      } else {
        byPrompt.set(key, { prompt: r.prompt_text, cited: isCited, engines: 1 });
      }
    }
    const rows = Array.from(byPrompt.values());
    // Not-cited first (those are the opportunities), then alphabetical.
    rows.sort((a, b) => {
      if (a.cited !== b.cited) return a.cited ? 1 : -1;
      return a.prompt.localeCompare(b.prompt);
    });
    const citedCount = rows.filter((r) => r.cited).length;
    return { rows, citedCount, total: rows.length };
  }, [results]);

  if (loading || !audit) {
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
        {loading ? "Loading..." : "Audit not found."}
      </div>
    );
  }

  if (domains.length === 0) {
    return (
      <AuditShell auditId={id} brandName={audit.brand_name}>
        <div className="page-head">
          <div>
            <h1>Sources</h1>
            <p>
              Domains AI engines cite when answering questions in your category.
            </p>
          </div>
        </div>
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          {audit.status !== "completed"
            ? `Citation data will be available once the audit finishes (current status: ${audit.status}).`
            : "No citations were parsed from any AI engine response. This usually means engines returned answers without inline URL citations — re-run the audit if you want fresh data."}
        </div>
      </AuditShell>
    );
  }

  const maxCount = domains[0]?.count || 1;
  const top = domains[0];

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Sources</h1>
          <p>
            Domains AI engines cite when answering questions in your category. Aim for content on the
            top-ranked sources here to lift your own citation rate.
          </p>
        </div>
        <div className="actions">
          <Tooltip label="Download every cited domain with count, share % and engines that cited it">
            <button
              className="btn btn-sm"
              onClick={() => {
                const rows: (string | number | boolean)[][] = [
                  ["Rank", "Domain", "Citations", "Share %", "Engines", "Is your brand"],
                  ...domains.map((d, i) => [
                    i + 1,
                    d.domain,
                    d.count,
                    d.share_percent,
                    d.engines.join("; "),
                    d.is_brand,
                  ]),
                ];
                downloadCsv(`${safeFilename(audit.brand_name)}-sources`, rows);
              }}
            >
              Export CSV
            </button>
          </Tooltip>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Total URLs the AI engines cited across every response in this audit. Higher count = more references AI is reaching for in your category.">
              Total citations
            </InfoTip>
          </div>
          <div className="kpi-number">{totalCitations}</div>
          <div className="kpi-sub">across {results.length} responses</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Number of distinct domains those citations point to. Smaller pool = AI keeps reaching for the same 10-20 sites — those are the ones to target.">
              Unique domains
            </InfoTip>
          </div>
          <div className="kpi-number">{uniqueDomains}</div>
          <div className="kpi-sub">distinct sources cited</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="The single domain AI engines reach for most often in your category. If you can get content placed here, your citation odds jump.">
              Top source
            </InfoTip>
          </div>
          <div className="kpi-number num-good">{top.share_percent}<span className="unit">%</span></div>
          <div className="kpi-sub" style={{ wordBreak: "break-all" }}>{top.domain}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Where your own domain sits in the ranked list of cited sources. #1 means you're the most-cited site in your category; '—' means no engine cited you at all.">
              Your domain rank
            </InfoTip>
          </div>
          <div className={`kpi-number num-${brandRank ? "good" : "crit"}`}>
            {brandRank ? `#${brandRank}` : "—"}
          </div>
          <div className="kpi-sub">
            {brandRank ? "in the top sources" : "not cited by any engine"}
          </div>
        </div>
      </div>

      {/* RANKED BAR LIST */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Most-cited domains</h2>
            <div className="sub">
              Ranked by citation share across all {results.length} engine responses for this audit.
              {brandRank && (
                <>
                  {" "}
                  <strong style={{ color: "var(--mint)" }}>{audit.brand_name}</strong> highlighted in mint.
                </>
              )}
            </div>
          </div>
          <span className="chip chip-neutral">{domains.length} domains</span>
        </div>

        <div className="card pad-lg">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {domains.map((d, i) => {
              const widthPct = (d.count / maxCount) * 100;
              const t = d.is_brand ? "mint" : d.share_percent >= 5 ? "good" : d.share_percent >= 2 ? "warn" : "info";
              return (
                <div
                  key={d.domain}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 220px 70px",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 14px",
                    borderRadius: "var(--r-md)",
                    background: d.is_brand ? "var(--mint-weak)" : "var(--surface-2)",
                    border: `1px solid ${d.is_brand ? "var(--mint-line)" : "var(--border-soft)"}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: d.is_brand ? "var(--mint)" : "var(--text-3)",
                      textAlign: "center",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: d.is_brand ? "var(--mint)" : "var(--text)",
                      }}
                    >
                      {d.domain}
                      {d.is_brand && (
                        <span
                          style={{
                            fontSize: 10,
                            marginLeft: 8,
                            color: "var(--mint)",
                            opacity: 0.8,
                            fontWeight: 700,
                            letterSpacing: "0.05em",
                          }}
                        >
                          YOU
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                      }}
                    >
                      {d.engines.slice(0, 5).map((e) => (
                        <span
                          key={e}
                          className="tag"
                          style={{ fontSize: 9, padding: "2px 6px" }}
                        >
                          {e}
                        </span>
                      ))}
                      {d.engines.length > 5 && (
                        <span style={{ fontSize: 10, color: "var(--text-4)" }}>
                          +{d.engines.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bar" style={{ width: "100%", height: 10 }}>
                    <div
                      className={`bar-fill ${t}`}
                      style={{ width: `${Math.max(widthPct, 2)}%` }}
                    />
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 700,
                      textAlign: "right",
                      color: d.is_brand ? "var(--mint)" : "var(--text)",
                    }}
                  >
                    {d.share_percent}
                    <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500, marginLeft: 2 }}>
                      %
                    </span>
                    <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>
                      {d.count} cites
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-3)",
                      textAlign: "center",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--text)",
                        wordBreak: "break-all",
                      }}
                    >
                      {d.domain}
                    </div>
                    <div
                      style={{
                        marginTop: 5,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                      {d.engines.slice(0, 5).map((e) => (
                        <span key={e} className="tag" style={{ fontSize: 9, padding: "2px 6px" }}>
                          {e}
                        </span>
                      ))}
                      {d.engines.length > 5 && (
                        <span style={{ fontSize: 10, color: "var(--text-4)" }}>
                          +{d.engines.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 700,
                        color: "var(--text)",
                      }}
                    >
                      {d.share_percent}
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text-3)",
                          fontWeight: 500,
                          marginLeft: 2,
                        }}
                      >
                        %
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>
                      cited {d.count}×
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {unlistedDirectories.length > 0 && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px dashed var(--border-soft)" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-3)",
                  marginBottom: 10,
                }}
              >
                Quick-win directories — not listed yet
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {unlistedDirectories.map((dir) => (
                  <span key={dir.directory} className="chip chip-crit">
                    {dir.directory}
                  </span>
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
                    <td className="center" style={{ color: "var(--text-3)" }}>
                      {r.engines}
                    </td>
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

      {/* PLAY HINT */}
      <div
        className="card pad-lg"
        style={{
          borderColor: "var(--mint-line)",
          background:
            "linear-gradient(135deg, rgba(94,234,212,.04) 0%, rgba(125,211,252,.04) 100%)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 600,
            color: "var(--text)",
            margin: "0 0 8px",
          }}
        >
          How to use this
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
          AI engines pick sources from a small set of high-trust domains. To get cited yourself, get
          content placed on the top-ranked domains above. For each top source, ask: <em>can we
          contribute a guest post, an answer, a profile, or a citation here?</em>{" "}
          {brandRank
            ? `You currently rank #${brandRank} in your own category — work the list above to climb.`
            : "Your domain isn't cited by any engine yet — that's your starting point."}
        </p>
      </div>
    </AuditShell>
  );
}
