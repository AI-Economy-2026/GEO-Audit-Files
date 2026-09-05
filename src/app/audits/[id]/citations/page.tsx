"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import InfoTip from "@/components/audit/InfoTip";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, type CitedDomain, type ResultRow } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";

const CITATIONS_PREVIEW_COUNT = 8;

/* Fallback for audits run before top_cited_domains was persisted: rebuild
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

/* "OpenAI (ChatGPT)" -> "ChatGPT"; names without parentheses pass through. */
function shortEngineName(name: string): string {
  const m = name.match(/\(([^)]+)\)/);
  return (m ? m[1] : name).trim();
}

function firstHostname(raw: string): string | null {
  try {
    const d = new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
    return d || null;
  } catch {
    return null;
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

interface CitationEvent {
  key: string;
  engine: string;
  prompt: string;
  source: string | null;
  withLink: boolean;
}

export default function CitationsPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, history, results, loading } = useAuditData(id);
  const [citationFilter, setCitationFilter] = useState<"all" | "link" | "nolink">("all");
  const [showAllCitations, setShowAllCitations] = useState(false);

  const previous = useMemo(() => {
    if (!audit || history.length < 2) return null;
    const idx = history.findIndex((h) => h.id === audit.id);
    return idx > 0 ? history[idx - 1] : null;
  }, [audit, history]);

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

  /* High-value opportunities: non-brand domains AI already trusts. */
  const opportunities = useMemo(() => domains.filter((d) => !d.is_brand).slice(0, 10), [domains]);

  /* Directories the brand is NOT listed on = quick wins. */
  const unlistedDirectories = useMemo(
    () => (audit?.summary_json?.directory_citations ?? []).filter((d) => !d.listed),
    [audit]
  );

  const validResults = useMemo(
    () => results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]")),
    [results]
  );

  const brandDomain = (audit?.brand_url || "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0];
  const isBrandDomain = (d: string) => brandDomain !== "" && (d === brandDomain || d.endsWith("." + brandDomain));

  /* Flat log of every answer where the brand was mentioned: which engine,
     which query, what it read to get there, and whether it linked back. */
  const citationEvents: CitationEvent[] = useMemo(() => {
    return validResults
      .filter((r: ResultRow) => r.brand_mentioned)
      .map((r, i) => {
        const hostnames = (r.citations || []).map(firstHostname).filter((d): d is string => !!d);
        const brandHost = hostnames.find(isBrandDomain);
        const otherHost = hostnames.find((d) => !isBrandDomain(d));
        const source = r.url_cited ? brandHost ?? (brandDomain || null) : otherHost ?? null;
        return {
          key: `${r.prompt_id}-${r.engine}-${i}`,
          engine: shortEngineName(r.engine_display || r.engine),
          prompt: r.prompt_text,
          source,
          withLink: r.url_cited,
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validResults, brandDomain]);

  const citedWithLinkCount = useMemo(() => citationEvents.filter((e) => e.withLink).length, [citationEvents]);
  const mentionedNoLinkCount = citationEvents.length - citedWithLinkCount;

  const newSinceLast = useMemo(() => {
    if (!previous || previous.total_mentioned == null || audit?.total_mentioned == null) return null;
    return Math.max(0, audit.total_mentioned - previous.total_mentioned);
  }, [audit, previous]);

  const filteredEvents = useMemo(() => {
    if (citationFilter === "link") return citationEvents.filter((e) => e.withLink);
    if (citationFilter === "nolink") return citationEvents.filter((e) => !e.withLink);
    return citationEvents;
  }, [citationEvents, citationFilter]);

  const visibleEvents = showAllCitations ? filteredEvents : filteredEvents.slice(0, CITATIONS_PREVIEW_COUNT);

  /* Per-prompt "cited vs not": cited if brand url_cited OR mentioned in ≥1 engine.
     Also tracks WHICH engines cited the brand, and the most-cited non-brand domain
     for each prompt (= the recommended source to target for not-cited queries). */
  const promptCitation = useMemo(() => {
    const byPrompt = new Map<
      string,
      {
        prompt: string;
        cited: boolean;
        citedEngines: Set<string>;
        allEngines: Set<string>;
        domainCounts: Record<string, number>;
      }
    >();
    for (const r of results) {
      const key = String(r.prompt_id) || r.prompt_text;
      let entry = byPrompt.get(key);
      if (!entry) {
        entry = {
          prompt: r.prompt_text,
          cited: false,
          citedEngines: new Set(),
          allEngines: new Set(),
          domainCounts: {},
        };
        byPrompt.set(key, entry);
      }
      const engineName = shortEngineName(r.engine_display || r.engine);
      entry.allEngines.add(engineName);
      if (r.url_cited || r.brand_mentioned) {
        entry.cited = true;
        entry.citedEngines.add(engineName);
      }
      for (const raw of r.citations || []) {
        const d = firstHostname(raw);
        if (d && !isBrandDomain(d)) entry.domainCounts[d] = (entry.domainCounts[d] || 0) + 1;
      }
    }
    const rows = Array.from(byPrompt.values()).map((e) => {
      const top = Object.entries(e.domainCounts).sort((a, b) => b[1] - a[1])[0];
      return {
        prompt: e.prompt,
        cited: e.cited,
        citedEngines: Array.from(e.citedEngines).sort(),
        totalEngines: e.allEngines.size,
        recSource: top ? top[0] : null,
      };
    });
    rows.sort((a, b) => (a.cited !== b.cited ? (a.cited ? 1 : -1) : a.prompt.localeCompare(b.prompt)));
    const citedCount = rows.filter((r) => r.cited).length;
    return { rows, citedCount, total: rows.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, brandDomain]);

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Citations</h1>
          <p>
            Every answer where {audit.brand_name} appears, whether the engine linked back to your
            site or just named you, and the exact sources to target next.
          </p>
        </div>
        {promptCitation.total > 0 && (
          <div className="actions">
            <Tooltip label="Download every query with which engines cite you and the source to target">
              <button
                className="btn btn-sm"
                onClick={() => {
                  const fallbackSource =
                    opportunities[0]?.domain ?? unlistedDirectories[0]?.directory ?? "";
                  const rows: (string | number | boolean)[][] = [
                    ["Query", "Engines tested", "Cited", "Cited engines", "Recommended source"],
                    ...promptCitation.rows.map((r) => [
                      r.prompt,
                      r.totalEngines,
                      r.cited,
                      r.citedEngines.join("; "),
                      r.cited ? "" : r.recSource ?? fallbackSource,
                    ]),
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
          <div className="kpi-label">Total citations</div>
          <div className="kpi-number">{citationEvents.length}</div>
          <div className="kpi-sub">Times {audit.brand_name} appears in an answer</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Cited with a link</div>
          <div className={`kpi-number ${citedWithLinkCount > 0 ? "num-good" : ""}`}>{citedWithLinkCount}</div>
          <div className="kpi-sub">Engine sends traffic back</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Mentioned, no link</div>
          <div className={`kpi-number ${mentionedNoLinkCount > 0 ? "num-warn" : ""}`}>{mentionedNoLinkCount}</div>
          <div className="kpi-sub">Named without attribution</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="New brand mentions recorded since the previous audit run.">
              New since last audit
            </InfoTip>
          </div>
          <div className={`kpi-number ${newSinceLast ? "num-good" : ""}`}>{newSinceLast ?? "-"}</div>
          <div className="kpi-sub">
            {previous ? `Since ${formatDate(previous.completed_at)}` : "No prior audit yet"}
          </div>
        </div>
      </div>

      {/* EVERY CITATION */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Every citation</h2>
            <div className="sub">
              Each answer where {audit.brand_name} appears, and what the engine read to get there.
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
            <button
              className={citationFilter === "all" ? "chip chip-neutral" : "chip"}
              style={
                citationFilter === "all"
                  ? undefined
                  : { background: "transparent", border: "1px solid transparent", color: "var(--text-3)", cursor: "pointer" }
              }
              onClick={() => {
                setCitationFilter("all");
                setShowAllCitations(false);
              }}
            >
              All {citationEvents.length}
            </button>
            <button
              className={citationFilter === "link" ? "chip chip-neutral" : "chip"}
              style={
                citationFilter === "link"
                  ? undefined
                  : { background: "transparent", border: "1px solid transparent", color: "var(--text-3)", cursor: "pointer" }
              }
              onClick={() => {
                setCitationFilter("link");
                setShowAllCitations(false);
              }}
            >
              With link {citedWithLinkCount}
            </button>
            <button
              className={citationFilter === "nolink" ? "chip chip-neutral" : "chip"}
              style={
                citationFilter === "nolink"
                  ? undefined
                  : { background: "transparent", border: "1px solid transparent", color: "var(--text-3)", cursor: "pointer" }
              }
              onClick={() => {
                setCitationFilter("nolink");
                setShowAllCitations(false);
              }}
            >
              No link {mentionedNoLinkCount}
            </button>
          </div>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            Every time {audit.brand_name} appeared in an answer, and whether the engine linked back
            to your site or just named you.
          </p>
        </div>

        {citationEvents.length === 0 ? (
          <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
            No citations recorded yet.
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <div className="scroll">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Engine</th>
                      <th>Prompt</th>
                      <th>Source cited</th>
                      <th className="center">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEvents.map((e) => (
                      <tr key={e.key}>
                        <td style={{ fontWeight: 500, color: "var(--text)" }}>{e.engine}</td>
                        <td>{e.prompt}</td>
                        <td>
                          {e.source ? (
                            <span className="tag" style={{ fontSize: 10, padding: "2px 7px", wordBreak: "break-all" }}>
                              {e.source}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-4)" }}>-</span>
                          )}
                        </td>
                        <td className="center">
                          <span className={`chip ${e.withLink ? "chip-good" : "chip-warn"}`} style={{ whiteSpace: "nowrap" }}>
                            {e.withLink ? "Cited with link" : "Mentioned, no link"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!showAllCitations && filteredEvents.length > CITATIONS_PREVIEW_COUNT && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, paddingTop: 14 }}>
                <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
                  Showing <span style={{ color: "var(--text)", fontWeight: 600 }}>{visibleEvents.length}</span> of{" "}
                  <span style={{ color: "var(--text)", fontWeight: 600 }}>{filteredEvents.length}</span> citations
                </span>
                <button className="btn btn-sm" onClick={() => setShowAllCitations(true)}>
                  View all {filteredEvents.length} citations <span style={{ fontSize: 11 }}>▾</span>
                </button>
              </div>
            )}
            {showAllCitations && (
              <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--text-3)" }}>
                Showing all {filteredEvents.length} citations.
              </p>
            )}
          </>
        )}
      </div>

      {/* HIGH-VALUE CITATION OPPORTUNITIES */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Sources to get featured on</h2>
            <div className="sub">
              These are the websites AI quotes most when answering questions in your category.
              Get {audit.brand_name} listed or featured on them and AI is far more likely to
              cite you too.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <span className={`chip ${brandRank ? "chip-good" : "chip-crit"}`}>
              Your rank {brandRank ? `#${brandRank}` : "-"}
            </span>
            <span className="chip chip-neutral">{opportunities.length} targets</span>
          </div>
        </div>

        <div className="card pad-lg">
          {opportunities.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
              No citation opportunities yet. No non-brand domains were cited.
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
                Quick-win directories: not listed yet
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {unlistedDirectories.map((dir) => (
                  <span key={dir.directory} className="chip chip-crit">{dir.directory}</span>
                ))}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--text-3)", lineHeight: 1.55 }}>
                Claiming these listings is a fast way to earn citations because AI engines lean on
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
              For each query we tested: which AI engines cite or mention {audit.brand_name},
              and for the queries where none do, the source AI trusts most: your best
              place to get featured for that query.
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
            <div className="scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Query</th>
                    <th className="center">Status</th>
                    <th>Engines</th>
                    <th>Recommended source</th>
                  </tr>
                </thead>
                <tbody>
                  {promptCitation.rows.map((r, i) => {
                    const missed = r.totalEngines - r.citedEngines.length;
                    // Fallback chain: this query's top cited source -> audit-wide top
                    // source -> a directory the brand isn't listed on yet. Ensures a
                    // not-cited query always gets an actionable recommendation.
                    const recSource = r.cited
                      ? null
                      : r.recSource ??
                        opportunities[0]?.domain ??
                        unlistedDirectories[0]?.directory ??
                        null;
                    return (
                      <tr key={`${r.prompt}-${i}`}>
                        <td style={{ color: "var(--text)" }}>{r.prompt}</td>
                        <td className="center">
                          <span
                            className={`chip ${r.cited ? "chip-good" : "chip-crit"}`}
                            style={{ whiteSpace: "nowrap" }}
                          >
                            {r.cited ? `Cited ${r.citedEngines.length}/${r.totalEngines}` : "Not cited"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
                            {r.citedEngines.map((e) => (
                              <span
                                key={e}
                                className="tag"
                                style={{
                                  fontSize: 9,
                                  padding: "2px 6px",
                                  background: "rgba(94,234,212,.10)",
                                  borderColor: "rgba(94,234,212,.28)",
                                  color: "var(--text)",
                                }}
                              >
                                {e}
                              </span>
                            ))}
                            {r.citedEngines.length === 0 ? (
                              <span style={{ fontSize: 11, color: "var(--text-4)", whiteSpace: "nowrap" }}>
                                0 of {r.totalEngines} engines
                              </span>
                            ) : missed > 0 ? (
                              <span style={{ fontSize: 10, color: "var(--text-4)", whiteSpace: "nowrap" }}>
                                +{missed} not citing
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          {recSource ? (
                            <span
                              className="tag"
                              title="AI cites this source most for this query, so get featured here"
                              style={{ fontSize: 10, padding: "2px 7px", cursor: "help", wordBreak: "break-all" }}
                            >
                              {recSource}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-4)" }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
          AI engines pull from a small set of high-trust sources. Work the opportunity list above,
          and for each one ask: <em>can we contribute a guest post, an answer, a profile, or a citation here?</em>{" "}
          Then focus your content on the not-cited queries to close those gaps.
        </p>
      </div>
    </AuditShell>
  );
}
