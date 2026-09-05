"use client";

import { useMemo, useState } from "react";
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

/** Extracts the hostname (no www.) from a raw citation URL, or null if unparseable. */
function hostnameOf(raw: string): string | null {
  try {
    return new URL(raw).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

type SourceFilter = "all" | "absent" | "third-party";

export default function SourcesPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);
  const [filter, setFilter] = useState<SourceFilter>("all");

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

  const totalEngines = audit?.engines?.length || 0;

  /* Real, derived signal: for each domain, did any response that cited it
     also name the brand? This is the closest honest proxy we have to
     "does this source also mention you", computed straight from the raw
     per-response citations + brand_mentioned flags (no fabricated data). */
  const coOccurrence = useMemo(() => {
    const map = new Map<string, boolean>();
    results.forEach((r) => {
      (r.citations || []).forEach((raw) => {
        const d = hostnameOf(raw);
        if (!d) return;
        if (!map.has(d)) map.set(d, false);
        if (r.brand_mentioned) map.set(d, true);
      });
    });
    return map;
  }, [results]);

  const filteredDomains = useMemo(() => {
    if (filter === "third-party") return domains.filter((d) => !d.is_brand);
    if (filter === "absent") return domains.filter((d) => !d.is_brand && !coOccurrence.get(d.domain));
    return domains;
  }, [domains, filter, coOccurrence]);

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  if (domains.length === 0) {
    return (
      <AuditShell auditId={id} brandName={audit.brand_name}>
        <div className="page-head">
          <div>
            <h1>Sources</h1>
            <p>The pages AI engines read when they answer questions in your category.</p>
          </div>
        </div>
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          {audit.status !== "completed"
            ? `Citation data will be available once the audit finishes (current status: ${audit.status}).`
            : "No citations were parsed from any AI engine response. This usually means engines returned answers without inline URL citations. Re-run the audit if you want fresh data."}
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
            The pages AI engines read when they answer questions in your category, and whether you
            appear on them. Aim for content on the top-ranked sources below to lift your citation rate.
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
              Export
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
            <InfoTip label="Number of distinct domains those citations point to. Smaller pool = AI keeps reaching for the same handful of sites, and those are the ones to target.">
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
            <InfoTip label="Where your own domain sits in the ranked list of cited sources. #1 means you're the most-cited site in your category; '-' means no engine cited you at all.">
              Your domain rank
            </InfoTip>
          </div>
          <div className={`kpi-number num-${brandRank ? "good" : "crit"}`}>
            {brandRank ? `#${brandRank}` : "-"}
          </div>
          <div className="kpi-sub">
            {brandRank ? "in the top sources" : "not cited by any engine"}
          </div>
        </div>
      </div>

      {/* WHAT THE ENGINES READ */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>What the engines read</h2>
            <div className="sub">The pages cited when engines answer your buyers, ranked by citation share.</div>
          </div>
          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
            <span
              className={`chip ${filter === "all" ? "chip-neutral" : ""}`}
              style={{ cursor: "pointer", ...(filter !== "all" ? { border: "1px solid transparent", background: "transparent", color: "var(--text-3)" } : {}) }}
              onClick={() => setFilter("all")}
            >
              All sources
            </span>
            <span
              className={`chip ${filter === "absent" ? "chip-neutral" : ""}`}
              style={{ cursor: "pointer", ...(filter !== "absent" ? { border: "1px solid transparent", background: "transparent", color: "var(--text-3)" } : {}) }}
              onClick={() => setFilter("absent")}
            >
              You are absent
            </span>
            <span
              className={`chip ${filter === "third-party" ? "chip-neutral" : ""}`}
              style={{ cursor: "pointer", ...(filter !== "third-party" ? { border: "1px solid transparent", background: "transparent", color: "var(--text-3)" } : {}) }}
              onClick={() => setFilter("third-party")}
            >
              Third party
            </span>
          </div>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            Engines answer from other people&apos;s pages, not yours directly. These are the pages they
            read about your category, how often each one gets cited, and whether the same answers name{" "}
            {audit.brand_name}.
          </p>
        </div>

        {filteredDomains.length === 0 ? (
          <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
            No sources match this filter.
          </div>
        ) : (
          <div className="table-wrap">
            <div className="scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Type</th>
                    <th className="center">Times cited</th>
                    <th className="center">Engines</th>
                    <th>Also named you</th>
                    <th className="center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDomains.map((d) => {
                    const widthPct = Math.max((d.count / maxCount) * 100, 4);
                    const barTone = d.is_brand ? "mint" : d.share_percent >= 5 ? "good" : d.share_percent >= 2 ? "warn" : "info";
                    const named = coOccurrence.get(d.domain);
                    return (
                      <tr key={d.domain}>
                        <td>
                          <span style={{ fontWeight: 600 }}>{d.domain}</span>
                          {d.is_brand && (
                            <span
                              style={{
                                fontSize: 10,
                                marginLeft: 8,
                                color: "var(--mint)",
                                fontWeight: 700,
                                letterSpacing: "0.05em",
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-3)" }}>{d.is_brand ? "Your site" : "Third-party"}</td>
                        <td className="center">
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{d.count}</span>
                            <div className="bar" style={{ width: 70, height: 5 }}>
                              <div className={`bar-fill ${barTone}`} style={{ width: `${widthPct}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="center">
                          {d.engines.length} of {totalEngines || d.engines.length}
                        </td>
                        <td>
                          {d.is_brand ? (
                            <span className="chip chip-neutral">&mdash;</span>
                          ) : named ? (
                            <span className="chip chip-good">Yes</span>
                          ) : (
                            <span className="chip chip-crit">No</span>
                          )}
                        </td>
                        <td className="center">
                          <a
                            href={`https://${d.domain}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontWeight: 600 }}
                          >
                            Visit
                          </a>
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

      {/* PLAY HINT */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>How to use this</h2>
          </div>
        </div>
        <div
          className="card pad-lg"
          style={{
            borderColor: "var(--mint-line)",
            background: "linear-gradient(135deg, rgba(94,234,212,.04) 0%, rgba(125,211,252,.04) 100%)",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-2)", lineHeight: 1.6 }}>
            AI engines pick sources from a small set of high-trust domains. To get cited yourself, get
            content placed on the top-ranked domains above. For each top source, ask: <em>can we
            contribute a guest post, an answer, a profile, or a citation here?</em>{" "}
            {brandRank
              ? `You currently rank #${brandRank} in your own category. Work the list above to climb.`
              : "Your domain isn't cited by any engine yet, so that's your starting point."}
          </p>
        </div>
      </div>
    </AuditShell>
  );
}
