"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import InfoTip from "@/components/audit/InfoTip";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, tone } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";

export default function CompetitorsPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);

  /* Share of voice computation */
  const analysis = useMemo(() => {
    if (!audit || !results.length) return null;
    const valid = results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]"));
    const clientMentions = valid.filter((r) => r.brand_mentioned).length;
    const compCounts: Record<string, number> = {};
    valid.forEach((r) => (r.competitor_mentions || []).forEach((c) => { compCounts[c] = (compCounts[c] || 0) + 1; }));
    const totalMentions = clientMentions + Object.values(compCounts).reduce((s, n) => s + n, 0);
    const clientSov = totalMentions > 0 ? Math.round((clientMentions / totalMentions) * 100) : 0;

    const ranked = [
      { brand: audit.brand_name, url: audit.brand_url, mentions: clientMentions, isClient: true },
      ...Object.entries(compCounts).map(([b, c]) => ({ brand: b, url: "", mentions: c, isClient: false })),
    ]
      .sort((a, b) => b.mentions - a.mentions)
      .map((b, i) => ({
        ...b,
        rank: i + 1,
        sov: totalMentions > 0 ? Math.round((b.mentions / totalMentions) * 100) : 0,
      }));

    const leader = ranked[0];
    const clientRow = ranked.find((r) => r.isClient);
    const gap = leader && clientRow ? leader.sov - clientRow.sov : 0;

    /* Where competitors beat you */
    const beatYou = valid
      .filter((r) => !r.brand_mentioned && (r.competitor_mentions || []).length > 0)
      .reduce<Record<number, { prompt: string; comps: string[] }>>((acc, r) => {
        if (!acc[r.prompt_id]) acc[r.prompt_id] = { prompt: r.prompt_text, comps: [] };
        (r.competitor_mentions || []).forEach((c) => {
          if (!acc[r.prompt_id].comps.includes(c)) acc[r.prompt_id].comps.push(c);
        });
        return acc;
      }, {});

    /* Where you beat competitors */
    const youWin = valid
      .filter((r) => r.brand_mentioned && (r.competitor_mentions || []).length === 0)
      .reduce<Record<number, { prompt: string; engines: string[] }>>((acc, r) => {
        if (!acc[r.prompt_id]) acc[r.prompt_id] = { prompt: r.prompt_text, engines: [] };
        if (!acc[r.prompt_id].engines.includes(r.engine_display || r.engine))
          acc[r.prompt_id].engines.push(r.engine_display || r.engine);
        return acc;
      }, {});

    return {
      ranked,
      clientSov,
      leader,
      clientRow,
      gap,
      beatYou: Object.values(beatYou).slice(0, 5),
      youWin: Object.values(youWin).slice(0, 5),
    };
  }, [audit, results]);

  if (loading || !audit) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-3)" }}>
        {loading ? "Loading..." : "Audit not found."}
      </div>
    );
  }

  if (!analysis) {
    return (
      <AuditShell auditId={id} brandName={audit.brand_name}>
        <div className="page-head">
          <div>
            <h1>Competitors</h1>
            <p>Who is winning citations in your category.</p>
          </div>
        </div>
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          No competitor data yet — audit results still loading or none available.
        </div>
      </AuditShell>
    );
  }

  const { ranked, clientSov, leader, clientRow, gap, beatYou, youWin } = analysis;

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Competitors</h1>
          <p>Who is winning citations in your category. Their share of voice and where you can take ground.</p>
        </div>
        <div className="actions">
          <Tooltip label="Download the share-of-voice leaderboard as a CSV">
            <button
              className="btn btn-sm"
              onClick={() => {
                const rows: (string | number)[][] = [
                  ["Rank", "Brand", "URL", "Mentions", "Share of voice %", "Is you"],
                  ...ranked.map((b) => [
                    b.rank,
                    b.brand,
                    b.url || "",
                    b.mentions,
                    b.sov,
                    b.isClient ? "yes" : "no",
                  ]),
                ];
                downloadCsv(`${safeFilename(audit.brand_name)}-competitors`, rows);
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
            <InfoTip label="Your slice of every brand-mention pie in this category. Higher = AI engines pick you more often when listing brands. Compare to category average (15%).">
              Your share of voice
            </InfoTip>
          </div>
          <div className={`kpi-number num-${tone(clientSov)}`}>
            {clientSov}<span className="unit">%</span>
          </div>
          <div className="kpi-sub">rank #{clientRow?.rank ?? "—"} in category</div>
          <div className="benchmark">
            <span className="benchmark-label">Category avg</span>
            <span className="benchmark-val">15%</span>
            {clientSov !== 15 && (
              <span className={`delta ${clientSov > 15 ? "up" : "down"}`}>
                {clientSov > 15 ? "▲" : "▼"} {Math.abs(clientSov - 15)}
              </span>
            )}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="The most-mentioned brand in your category, with their share of all citations. This is the brand to study and out-rank.">
              Leader&rsquo;s share
            </InfoTip>
          </div>
          <div className={`kpi-number num-${leader?.isClient ? "good" : "warn"}`}>
            {leader?.sov ?? 0}<span className="unit">%</span>
          </div>
          <div className="kpi-sub">{leader?.brand ?? "—"}</div>
          <div className="benchmark">
            <span className="benchmark-label">Industry #1</span>
            <span className="benchmark-val">38%</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Points between your share-of-voice and the category leader. Small gap = realistic catch-up. Big gap = strategic shift needed.">
              Gap to #1
            </InfoTip>
          </div>
          <div className={`kpi-number num-${gap > 15 ? "crit" : "warn"}`}>
            {gap}<span className="unit">pt</span>
          </div>
          <div className="kpi-sub">
            {gap === 0 ? "you&rsquo;re the leader" : "recoverable in 90 days"}
          </div>
          <div className="benchmark">
            <span className="benchmark-label">Typical</span>
            <span className="benchmark-val">14pt</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">
            <InfoTip label="Number of distinct competitor brands AI engines mentioned in your category. More = denser landscape; fewer = clearer top-of-mind opportunity.">
              Competitors tracked
            </InfoTip>
          </div>
          <div className="kpi-number">{ranked.length - 1}</div>
          <div className="kpi-sub">named in results</div>
          <div className="benchmark">
            <span className="benchmark-label">Category</span>
            <span className="benchmark-val">Mid</span>
          </div>
        </div>
      </div>

      {/* LEADERBOARD */}
      <div className="card pad-lg section">
        <div className="section-head" style={{ marginBottom: 18 }}>
          <div>
            <h2>Share of voice leaderboard</h2>
            <div className="sub">How often each player is cited. {audit.brand_name} highlighted in mint.</div>
          </div>
          <span className="chip chip-neutral">
            {audit.engines?.length ?? 0} engines • {results.length} queries
          </span>
        </div>
        <div>
          {ranked.slice(0, 10).map((b) => {
            const t = b.isClient ? "good" : tone(b.sov);
            return (
              <div
                key={b.brand}
                className="comp-row"
                style={
                  b.isClient
                    ? { background: "var(--mint-weak)", borderColor: "var(--mint-line)" }
                    : undefined
                }
              >
                <div className="comp-rank" style={b.isClient ? { color: "var(--mint)" } : undefined}>
                  {String(b.rank).padStart(2, "0")}
                </div>
                <div>
                  <div className="comp-name" style={b.isClient ? { color: "var(--mint)" } : undefined}>
                    {b.brand}
                    {b.isClient && (
                      <span style={{ fontSize: 11, marginLeft: 6, color: "var(--mint)", opacity: 0.8 }}>YOU</span>
                    )}
                  </div>
                  {b.url && <div className="comp-url">{b.url}</div>}
                </div>
                <div className="bar">
                  <div
                    className={`bar-fill ${b.isClient ? "mint" : t}`}
                    style={{ width: `${Math.max(b.sov, 2)}%` }}
                  />
                </div>
                <div
                  className="comp-mentions"
                  style={{ color: b.isClient ? "var(--mint)" : `var(--${t})` }}
                >
                  {b.sov}<span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500, marginLeft: 2 }}>%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* WHERE COMPETITORS BEAT YOU & WHERE YOU BEAT COMPETITORS */}
      <div className="grid-half section">
        <div className="card pad-lg">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 18 }}>Where competitors beat you</h2>
              <div className="sub">Prompts where a competitor is cited and you are not.</div>
            </div>
            <span className="chip chip-crit">{beatYou.length} gaps</span>
          </div>
          {beatYou.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>No competitor-only prompts — strong position.</div>
          ) : (
            <ul className="action-list" style={{ fontSize: 13.5 }}>
              {beatYou.map((b, i) => (
                <li key={i}>
                  <strong style={{ color: "var(--text)" }}>{b.prompt}</strong> — {b.comps.slice(0, 3).join(", ")}{b.comps.length > 3 ? "…" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card pad-lg">
          <div className="section-head" style={{ marginBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 18 }}>Where you beat competitors</h2>
              <div className="sub">Prompts where you are cited and no competitor is.</div>
            </div>
            <span className="chip chip-good">{youWin.length} wins</span>
          </div>
          {youWin.length === 0 ? (
            <div style={{ color: "var(--text-3)", fontSize: 13 }}>No solo wins yet — start with comparison pages to capture some.</div>
          ) : (
            <ul className="action-list" style={{ fontSize: 13.5 }}>
              {youWin.map((w, i) => (
                <li key={i}>
                  <strong style={{ color: "var(--text)" }}>{w.prompt}</strong> — cited on {w.engines.slice(0, 3).join(", ")}{w.engines.length > 3 ? "…" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AuditShell>
  );
}
