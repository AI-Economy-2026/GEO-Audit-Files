"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import AskSarahCard from "@/components/audit/AskSarahCard";
import { useAuditData, tone } from "@/components/audit/useAuditData";
import { useMe } from "@/lib/me-context";

export default function CompetitorsPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);
  const { me } = useMe();

  const validResults = useMemo(
    () => results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]")),
    [results]
  );

  /* Share-of-voice + head-to-head computation. Every rate below is derived from
     the SET of unique prompt ids a brand is named in (not raw mention-instance
     counts), so a brand named by 3 engines on 1 prompt doesn't outweigh a brand
     named by 1 engine on 3 different prompts. */
  const analysis = useMemo(() => {
    if (!audit || !validResults.length) return null;

    const totalPrompts = new Set(validResults.map((r) => r.prompt_id)).size;
    if (!totalPrompts) return null;

    const totalEngines = audit.engines?.length || new Set(validResults.map((r) => r.engine)).size;

    // Every competitor name ever surfaced, from the summary breakdown and the raw rows.
    const compNames = new Set<string>();
    Object.keys(audit.summary_json?.competitor_analysis?.mention_counts || {}).forEach((n) => compNames.add(n));
    validResults.forEach((r) => (r.competitor_mentions || []).forEach((c) => compNames.add(c)));

    type Row = { name: string; isClient: boolean; promptSet: Set<number>; engineSet: Set<string> };

    const clientRowRaw: Row = { name: audit.brand_name, isClient: true, promptSet: new Set(), engineSet: new Set() };
    const compRows = new Map<string, Row>();
    compNames.forEach((n) => compRows.set(n, { name: n, isClient: false, promptSet: new Set(), engineSet: new Set() }));

    validResults.forEach((r) => {
      if (r.brand_mentioned) {
        clientRowRaw.promptSet.add(r.prompt_id);
        clientRowRaw.engineSet.add(r.engine);
      }
      (r.competitor_mentions || []).forEach((c) => {
        const row = compRows.get(c);
        if (row) {
          row.promptSet.add(r.prompt_id);
          row.engineSet.add(r.engine);
        }
      });
    });

    const allRows = [clientRowRaw, ...Array.from(compRows.values())];

    const ranked = allRows
      .map((r) => ({
        name: r.name,
        isClient: r.isClient,
        mentions: r.promptSet.size,
        sov: totalPrompts > 0 ? Math.round((r.promptSet.size / totalPrompts) * 100) : 0,
        engineCount: r.engineSet.size,
        promptSet: r.promptSet,
      }))
      .sort((a, b) => b.sov - a.sov || b.mentions - a.mentions)
      .map((r, i) => ({
        ...r,
        rank: i + 1,
        // Prompts where this brand is named and the client is not - a head-to-head win for them.
        leadsOnCount: r.isClient
          ? 0
          : Array.from(r.promptSet).filter((pid) => !clientRowRaw.promptSet.has(pid)).length,
      }));

    const leader = ranked[0];
    const clientRow = ranked.find((r) => r.isClient)!;
    const ratio = leader.sov > 0 && clientRow.sov > 0 ? leader.sov / clientRow.sov : null;

    // Prompt text/category lookup for the breakdown section below the table.
    const promptMeta = new Map<number, { text: string; category: string }>();
    validResults.forEach((r) => {
      if (!promptMeta.has(r.prompt_id)) promptMeta.set(r.prompt_id, { text: r.prompt_text, category: r.category || "General" });
    });

    let beatSection: {
      title: string;
      sub: string;
      note: string;
      items: { category: string; text: string; detail: string }[];
    } | null = null;

    if (!leader.isClient) {
      // The category leader beats you: prompts they're named on where you are absent.
      const items: { pid: number; category: string; text: string; engines: string[] }[] = [];
      leader.promptSet.forEach((pid) => {
        if (!clientRowRaw.promptSet.has(pid)) {
          const engines = new Set<string>();
          validResults.forEach((r) => {
            if (r.prompt_id === pid && (r.competitor_mentions || []).includes(leader.name)) {
              engines.add(r.engine_display || r.engine);
            }
          });
          const meta = promptMeta.get(pid);
          items.push({ pid, category: meta?.category ?? "General", text: meta?.text ?? "", engines: Array.from(engines) });
        }
      });
      beatSection = {
        title: `Where ${leader.name} beats you`,
        sub: "Prompts where engines reach for them, not you.",
        note: `${leader.name} is cited on ${items.length} prompt${items.length === 1 ? "" : "s"} where ${audit.brand_name} is absent.`,
        items: items.slice(0, 3).map((it) => ({
          category: it.category,
          text: it.text,
          detail: it.engines.length
            ? `Named on ${it.engines.slice(0, 3).join(", ")}${it.engines.length > 3 ? "…" : ""}`
            : "Named by at least one engine",
        })),
      };
    } else {
      // You already lead: show the prompts you win solo, with no competitor named at all.
      const items: { pid: number; category: string; text: string; engines: string[] }[] = [];
      clientRowRaw.promptSet.forEach((pid) => {
        const hasCompetitor = Array.from(compRows.values()).some((row) => row.promptSet.has(pid));
        if (!hasCompetitor) {
          const engines = new Set<string>();
          validResults.forEach((r) => {
            if (r.prompt_id === pid && r.brand_mentioned) engines.add(r.engine_display || r.engine);
          });
          const meta = promptMeta.get(pid);
          items.push({ pid, category: meta?.category ?? "General", text: meta?.text ?? "", engines: Array.from(engines) });
        }
      });
      beatSection = {
        title: "Where you beat the field",
        sub: "Prompts where you are cited solo, with no competitor named.",
        note: `${audit.brand_name} is the only brand named on ${items.length} prompt${items.length === 1 ? "" : "s"}.`,
        items: items.slice(0, 3).map((it) => ({
          category: it.category,
          text: it.text,
          detail: it.engines.length
            ? `Named on ${it.engines.slice(0, 3).join(", ")}${it.engines.length > 3 ? "…" : ""}`
            : "Named by at least one engine",
        })),
      };
    }

    return { totalPrompts, totalEngines, ranked, leader, clientRow, ratio, beatSection };
  }, [audit, validResults]);

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  if (!analysis) {
    return (
      <AuditShell auditId={id} brandName={audit.brand_name}>
        <div className="page-head">
          <div>
            <h1>Competitors</h1>
            <p>Who is winning citations in your category, and where {audit.brand_name} can take ground.</p>
          </div>
        </div>
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          No competitor data yet. Audit results are still loading or none are available.
        </div>
      </AuditShell>
    );
  }

  const { totalPrompts, totalEngines, ranked, leader, clientRow, ratio, beatSection } = analysis;

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Competitors</h1>
          <p>Who is winning citations in your category, and where {audit.brand_name} can take ground.</p>
        </div>
        <div className="actions">
          <span className="chip chip-good chip-lg">Completed</span>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Competitors tracked</div>
          <div className="kpi-number">{ranked.length - 1}</div>
          <div className="kpi-sub">Named alongside you in prompts</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Your share of voice</div>
          <div className={`kpi-number num-${tone(clientRow.sov)}`}>
            {clientRow.sov}
            <span className="unit">%</span>
          </div>
          <div className="kpi-sub">rank #{clientRow.rank} of {ranked.length} in category</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Category leader</div>
          <div className="kpi-number" style={{ fontSize: 24 }}>{leader.name}</div>
          <div className="kpi-sub">Named in {leader.sov}% of the same prompts</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Head-to-head losses</div>
          <div className={`kpi-number ${leader.leadsOnCount > 0 ? "num-crit" : "num-good"}`}>{leader.leadsOnCount}</div>
          <div className="kpi-sub">
            {leader.isClient ? "No competitor leads more prompts than you" : `Prompts where ${leader.name} wins and you do not`}
          </div>
        </div>
      </div>

      {/* SHARE OF VOICE LEADERBOARD */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Share of voice</h2>
            <div className="sub">How often each provider is named across the {totalPrompts} tracked prompts.</div>
          </div>
          <span className="chip chip-neutral">{totalEngines} engines • {totalPrompts} prompts</span>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            {leader.isClient
              ? `${audit.brand_name} leads the category with ${leader.sov}% share of voice.`
              : ratio
                ? `${leader.name} is named ${ratio.toFixed(1)}× more often than ${audit.brand_name} on the same questions.`
                : `${leader.name} is named in more prompts than ${audit.brand_name}.`}
          </p>
        </div>

        <div className="table-wrap">
          <div className="scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Share of voice</th>
                  <th className="center">Prompts named</th>
                  <th className="center">Engines</th>
                  <th>Position</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: r.isClient ? 700 : 500, color: r.isClient ? "var(--mint)" : undefined }}>
                      {r.name}
                      {r.isClient && (
                        <span style={{ fontSize: 11, marginLeft: 6, opacity: 0.8 }}>YOU</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="bar" style={{ flex: 1, maxWidth: 180 }}>
                          <div
                            className={`bar-fill ${r.isClient ? "mint" : tone(r.sov)}`}
                            style={{ width: `${Math.max(r.sov, 2)}%` }}
                          />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14, width: 40, textAlign: "right" }}>{r.sov}%</span>
                      </div>
                    </td>
                    <td className="center">{r.mentions} / {totalPrompts}</td>
                    <td className="center">{r.engineCount} of {totalEngines}</td>
                    <td>
                      {r.isClient ? (
                        <span style={{ color: "var(--mint)", fontWeight: 600 }}>You</span>
                      ) : r.leadsOnCount > 0 ? (
                        <span style={{ color: "var(--text-2)" }}>
                          Leads on {r.leadsOnCount} prompt{r.leadsOnCount === 1 ? "" : "s"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-3)" }}>No lead over you</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* WHERE THE LEADER BEATS YOU / WHERE YOU BEAT THE FIELD */}
      {beatSection && (
        <div className="section">
          <div className="section-head">
            <div>
              <h2 style={{ fontSize: 21 }}>{beatSection.title}</h2>
              <div className="sub">{beatSection.sub}</div>
            </div>
          </div>

          <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
            <span className="chip chip-mint">In plain terms</span>
            <p style={{ margin: 0, color: "var(--text-2)" }}>{beatSection.note}</p>
          </div>

          {beatSection.items.length === 0 ? (
            <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
              No prompts to show yet.
            </div>
          ) : (
            <div className="grid-3">
              {beatSection.items.map((it, i) => (
                <div className="card pad-lg" key={i}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 10 }}>
                    {it.category}
                  </div>
                  <p style={{ margin: "0 0 12px", fontSize: 14.5, fontWeight: 600, lineHeight: 1.5 }}>{it.text}</p>
                  <div style={{ fontSize: 12.5, color: "var(--text-3)" }}>{it.detail}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {me?.role === "admin" && (
        <AskSarahCard
          brandName={audit.brand_name}
          visibilityRate={audit.visibility_rate ?? 0}
          totalQueries={audit.total_queries ?? 0}
          totalMentioned={audit.total_mentioned ?? 0}
          results={results}
        />
      )}
    </AuditShell>
  );
}
