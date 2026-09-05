"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import AskSarahCard from "@/components/audit/AskSarahCard";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData, type ResultRow } from "@/components/audit/useAuditData";
import { downloadCsv, safeFilename } from "@/lib/csv";
import { useMe } from "@/lib/me-context";

const PREVIEW_COUNT = 8;

interface PromptRow {
  prompt_id: number;
  prompt_text: string;
  category: string;
  named: boolean;
  brandsCount: number;
  sourcesCount: number;
  engineResults: ResultRow[];
}

interface ExpandedState {
  promptId: number;
  engine: string | null;
}

export default function PromptAnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { audit, results, loading } = useAuditData(id);
  const { me } = useMe();
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedState | null>(null);

  const validResults = useMemo(
    () => results.filter((r) => r.response_text && !r.response_text.startsWith("[ERROR]")),
    [results]
  );

  const prompts = useMemo(() => {
    const map = new Map<number, PromptRow>();
    validResults.forEach((r) => {
      if (!map.has(r.prompt_id)) {
        map.set(r.prompt_id, {
          prompt_id: r.prompt_id,
          prompt_text: r.prompt_text,
          category: r.category || "General",
          named: false,
          brandsCount: 0,
          sourcesCount: 0,
          engineResults: [],
        });
      }
      const p = map.get(r.prompt_id)!;
      p.engineResults.push(r);
      if (r.brand_mentioned) p.named = true;
    });

    map.forEach((p) => {
      const brands = new Set<string>();
      let sources = 0;
      p.engineResults.forEach((r) => {
        (r.competitor_mentions || []).forEach((c) => brands.add(c));
        sources += r.citations?.length ?? 0;
      });
      if (p.named) brands.add(audit?.brand_name ?? "");
      p.brandsCount = brands.size;
      p.sourcesCount = sources;
    });

    return Array.from(map.values()).sort((a, b) => a.prompt_id - b.prompt_id);
  }, [validResults, audit]);

  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    prompts.forEach((p) => seen.set(p.category, (seen.get(p.category) ?? 0) + 1));
    return Array.from(seen.entries());
  }, [prompts]);

  const namedCount = useMemo(() => prompts.filter((p) => p.named).length, [prompts]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return prompts;
    if (activeFilter === "named") return prompts.filter((p) => p.named);
    return prompts.filter((p) => p.category === activeFilter);
  }, [prompts, activeFilter]);

  const visible = showAll ? filtered : filtered.slice(0, PREVIEW_COUNT);

  const avgBrands = prompts.length ? Math.round(prompts.reduce((s, p) => s + p.brandsCount, 0) / prompts.length) : 0;
  const avgSources = prompts.length ? Math.round(prompts.reduce((s, p) => s + p.sourcesCount, 0) / prompts.length) : 0;

  if (loading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {loading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  function toggleExpand(promptId: number) {
    setExpanded((prev) => (prev?.promptId === promptId ? null : { promptId, engine: null }));
  }

  function selectEngine(promptId: number, engine: string) {
    setExpanded((prev) => (prev?.promptId === promptId ? { promptId, engine } : prev));
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Prompt Analysis</h1>
          <p>Every buyer question we ran against {audit.brand_name}&apos;s category, and how each AI engine answered it.</p>
        </div>
        {prompts.length > 0 && (
          <div className="actions">
            <Tooltip label="Download every prompt with its category, mention status, and per-engine results">
              <button
                className="btn btn-sm"
                onClick={() => {
                  const engines = Array.from(
                    new Set(prompts.flatMap((p) => p.engineResults.map((r) => r.engine_display)))
                  );
                  const rows: (string | number | boolean)[][] = [
                    ["Prompt", "Category", "Named", "Brands mentioned", "Sources", ...engines],
                    ...prompts.map((p) => {
                      const byEngine = new Map(p.engineResults.map((r) => [r.engine_display, r.brand_mentioned]));
                      return [
                        p.prompt_text,
                        p.category,
                        p.named ? "Yes" : "No",
                        p.brandsCount,
                        p.sourcesCount,
                        ...engines.map((e) => (byEngine.has(e) ? (byEngine.get(e) ? "Mentioned" : "Not mentioned") : "N/A")),
                      ];
                    }),
                  ];
                  downloadCsv(`${safeFilename(audit.brand_name)}-prompt-analysis`, rows);
                }}
              >
                Export CSV
              </button>
            </Tooltip>
          </div>
        )}
      </div>

      {/* KPI GRID */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Prompts tracked</div>
          <div className="kpi-number">{prompts.length}</div>
          <div className="kpi-sub">Across {categories.length} buyer topics</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Prompts naming you</div>
          <div className="kpi-number">{namedCount}</div>
          <div className="kpi-sub">At least one engine names {audit.brand_name}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Brands named per prompt</div>
          <div className="kpi-number">{avgBrands}</div>
          <div className="kpi-sub">Average across the {prompts.length} prompts</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Sources read per prompt</div>
          <div className="kpi-number">{avgSources}</div>
          <div className="kpi-sub">Average across the {prompts.length} prompts</div>
        </div>
      </div>

      {/* DETAILED PROMPT ANALYSIS */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>Detailed prompt analysis</h2>
            <div className="sub">
              Open a prompt to see which engines named {audit.brand_name}. Select an engine to read the mention it returned.
            </div>
          </div>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            These are the actual questions buyers type. Open one to see which engines named {audit.brand_name} and read the exact words they used.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <button
            className="btn btn-sm"
            onClick={() => {
              setActiveFilter("all");
              setShowAll(false);
            }}
            style={
              activeFilter === "all"
                ? { background: "var(--info-weak)", borderColor: "var(--info-line)", color: "var(--text)" }
                : undefined
            }
          >
            All prompts {prompts.length}
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              className="btn btn-sm"
              onClick={() => {
                setActiveFilter(cat);
                setShowAll(false);
              }}
              style={
                activeFilter === cat
                  ? { background: "var(--info-weak)", borderColor: "var(--info-line)", color: "var(--text)" }
                  : undefined
              }
            >
              {cat} {count}
            </button>
          ))}
          <button
            className="btn btn-sm"
            onClick={() => {
              setActiveFilter("named");
              setShowAll(false);
            }}
            style={
              activeFilter === "named"
                ? { background: "var(--info-weak)", borderColor: "var(--info-line)", color: "var(--text)" }
                : undefined
            }
          >
            Names {audit.brand_name} {namedCount}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visible.map((p, i) => {
            const isOpen = expanded?.promptId === p.prompt_id;
            const selectedResult = isOpen
              ? p.engineResults.find((r) => r.engine === expanded?.engine) ?? null
              : null;
            return (
              <div key={p.prompt_id} className="card" style={{ overflow: "hidden" }}>
                <button
                  type="button"
                  onClick={() => toggleExpand(p.prompt_id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    padding: "14px 20px",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                  }}
                >
                  <span style={{ flex: "0 0 34px", fontVariantNumeric: "tabular-nums", fontSize: 13, fontWeight: 600, color: "var(--text-3)" }}>
                    #{i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{p.prompt_text}</span>
                  <span style={{ flex: "0 0 104px", textAlign: "center" }}>
                    <span className={`chip chip-${p.named ? "good" : "crit"}`}>{p.named ? "Named" : "Absent"}</span>
                  </span>
                  <span style={{ flex: "0 0 108px", textAlign: "right", fontSize: 13, color: "var(--text-3)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.brandsCount}</span> brands
                  </span>
                  <span style={{ flex: "0 0 116px", textAlign: "right", fontSize: 13, color: "var(--text-3)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text)" }}>{p.sourcesCount}</span> sources
                  </span>
                  <span style={{ flex: "0 0 20px", textAlign: "center", fontSize: 11, color: "var(--text-3)" }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border-soft)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {p.engineResults.map((r) => (
                        <button
                          key={r.engine}
                          className="chip"
                          onClick={() => selectEngine(p.prompt_id, r.engine)}
                          style={{
                            cursor: "pointer",
                            background: expanded?.engine === r.engine ? "var(--mint-weak)" : "var(--surface-3)",
                            borderColor: r.brand_mentioned ? "var(--good-line)" : "var(--border)",
                            color: expanded?.engine === r.engine ? "var(--mint)" : "var(--text-2)",
                          }}
                        >
                          <span className={`dot ${r.brand_mentioned ? "good" : "crit"}`} style={{ marginRight: 6 }} />
                          {r.engine_display}
                        </button>
                      ))}
                    </div>
                    {selectedResult && (
                      <div className="card pad" style={{ background: "var(--surface-2)" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-3)", marginBottom: 8 }}>
                          {selectedResult.engine_display}&apos;s answer
                        </div>
                        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--text-2)", whiteSpace: "pre-wrap" }}>
                          {selectedResult.response_text}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!showAll && filtered.length > PREVIEW_COUNT && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, paddingTop: 14 }}>
            <span style={{ fontSize: 12.5, color: "var(--text-3)" }}>
              Showing <span style={{ color: "var(--text)", fontWeight: 600 }}>{visible.length}</span> of{" "}
              <span style={{ color: "var(--text)", fontWeight: 600 }}>{filtered.length}</span> buyer searches
            </span>
            <button className="btn btn-sm" onClick={() => setShowAll(true)}>
              View all {filtered.length} prompts <span style={{ fontSize: 11 }}>▾</span>
            </button>
          </div>
        )}
      </div>

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
