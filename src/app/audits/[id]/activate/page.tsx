"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import InfoTip from "@/components/audit/InfoTip";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData } from "@/components/audit/useAuditData";

interface ActionItem {
  id: string;
  audit_id: string;
  week_number: number;
  category: "technical" | "non_technical";
  title: string;
  description: string | null;
  effort_label: string | null;
  sort_order: number;
  completed_at: string | null;
  owner?: string | null;
  created_at: string;
}

type Filter = "all" | "technical" | "non_technical";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function monthGroup(week: number): { label: string; sub: string } {
  if (week <= 4) return { label: "Month 1", sub: "Foundations & quick fixes" };
  if (week <= 8) return { label: "Month 2", sub: "Priority pages & content" };
  return { label: "Month 3", sub: "Authority & re-audit" };
}

export default function ActivatePage() {
  const { id } = useParams<{ id: string }>();
  const { audit, loading: auditLoading } = useAuditData(id);

  const [items, setItems] = useState<ActionItem[]>([]);
  const [planLoading, setPlanLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // Fetch (and on first call, generate) the action plan
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setPlanLoading(true);
    setError(null);

    fetch(`/api/geo-audits/${id}/action-plan`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load plan.");
        if (cancelled) return;
        setItems(data.items || []);
        if (data.generated) setGenerating(false);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setPlanLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Detect "still generating" state for UX clarity — fires before the API responds
  useEffect(() => {
    if (planLoading && items.length === 0) {
      const t = setTimeout(() => setGenerating(true), 800);
      return () => clearTimeout(t);
    }
    setGenerating(false);
  }, [planLoading, items.length]);

  async function toggleItem(item: ActionItem) {
    const nextCompleted = !item.completed_at;
    setPendingIds((prev) => new Set(prev).add(item.id));

    // Optimistic
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, completed_at: nextCompleted ? new Date().toISOString() : null }
          : it
      )
    );

    try {
      const res = await fetch(`/api/geo-audits/${id}/action-plan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: nextCompleted }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update.");
      setItems((prev) => prev.map((it) => (it.id === item.id ? data.item : it)));
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, completed_at: item.completed_at } : it
        )
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function saveOwner(item: ActionItem, value: string) {
    const trimmed = value.trim();
    const nextOwner = trimmed === "" ? null : trimmed;
    if ((item.owner ?? null) === nextOwner) return;

    // Optimistic
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, owner: nextOwner } : it))
    );

    try {
      const res = await fetch(`/api/geo-audits/${id}/action-plan/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: nextOwner ?? "" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update.");
      setItems((prev) => prev.map((it) => (it.id === item.id ? data.item : it)));
    } catch {
      // Revert on failure
      setItems((prev) =>
        prev.map((it) => (it.id === item.id ? { ...it, owner: item.owner } : it))
      );
    }
  }

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((it) => it.category === filter);
  }, [items, filter]);

  const grouped = useMemo(() => {
    const months: Record<number, ActionItem[]> = { 1: [], 2: [], 3: [] };
    for (const it of filtered) {
      const m = it.week_number <= 4 ? 1 : it.week_number <= 8 ? 2 : 3;
      months[m].push(it);
    }
    return months;
  }, [filtered]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((it) => it.completed_at).length;
    const technical = items.filter((it) => it.category === "technical").length;
    const nonTechnical = items.filter((it) => it.category === "non_technical").length;
    return { total, done, technical, nonTechnical, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [items]);

  if (auditLoading || !audit) {
    return (
      <AuditShell auditId={id} brandName={audit?.brand_name ?? "…"}>
        <div style={{ padding: "80px 0", textAlign: "center", color: "var(--text-3)" }}>
          {auditLoading ? "Loading..." : "Audit not found."}
        </div>
      </AuditShell>
    );
  }

  return (
    <AuditShell auditId={id} brandName={audit.brand_name}>
      <div className="page-head">
        <div>
          <h1>Prioritise &amp; Activate</h1>
          <p>
            Your 90-day action plan, generated from this audit&rsquo;s findings. Tick items off as you
            complete them and we&rsquo;ll track the date stamp.
          </p>
        </div>
        <div className="actions no-print">
          <Tooltip label="Open the browser print dialog — save the 90-day plan as PDF">
            <button className="btn btn-sm" onClick={() => window.print()}>
              Export PDF
            </button>
          </Tooltip>
        </div>
      </div>

      {/* PROGRESS HERO */}
      <div className="hero">
        <div className="hero-left">
          <div className="hero-label">Plan progress</div>
          <div className="hero-headline">
            {stats.done}
            <span className="slash">/ {stats.total}</span>
            {stats.total > 0 && (
              <span className={`big-delta ${stats.pct >= 50 ? "up" : ""}`}>{stats.pct}%</span>
            )}
          </div>
          <div className="hero-summary">
            {stats.total === 0
              ? "Your plan is being prepared. Once ready, it covers 13 weeks of prioritised technical and content work, calibrated to this audit&rsquo;s findings."
              : stats.done === 0
                ? "Pick the easiest item in Week 1 and tick it off; momentum compounds. Filter to technical or non-technical to focus the team."
                : `${stats.done} done, ${stats.total - stats.done} to go. Re-audit at the end of Month 3 to measure movement.`}
          </div>
          <div className="hero-benchmarks">
            <div className="hero-bm-item">
              <div className="hero-bm-label">
                <InfoTip label="Engineering work in this plan — schema, llms.txt, sitemaps, indexability fixes. Filter the list to just these to hand off to a developer.">
                  Technical
                </InfoTip>
              </div>
              <div className="hero-bm-value">
                <span className="num">{stats.technical}</span>
              </div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">
                <InfoTip label="Content and authority work — landing pages, comparison pages, citations, PR. Filter to just these to hand off to a content team.">
                  Non-technical
                </InfoTip>
              </div>
              <div className="hero-bm-value">
                <span className="num">{stats.nonTechnical}</span>
              </div>
            </div>
            <div className="hero-bm-item">
              <div className="hero-bm-label">
                <InfoTip label="Total time the plan covers — 13 weeks across 3 months. Last week always includes a re-audit step to measure movement.">
                  Window
                </InfoTip>
              </div>
              <div className="hero-bm-value">
                <span className="num">90 days</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-insight">
            <div className="hero-insight-icon good">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="hero-insight-text">
              <div className="title">Easiest first</div>
              <div className="body">
                Items are ordered by effort within each week, start at the top.
              </div>
            </div>
          </div>
          <div className="hero-insight">
            <div className="hero-insight-icon good">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div className="hero-insight-text">
              <div className="title">Re-audit at day 90</div>
              <div className="body">Final week includes a re-audit step so you can measure movement.</div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div
        className="card pad"
        style={{ marginBottom: 18, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-3)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginRight: 4,
          }}
        >
          Filter
        </div>
        {(
          [
            { id: "all", label: `All (${stats.total})` },
            { id: "technical", label: `Technical (${stats.technical})` },
            { id: "non_technical", label: `Non-technical (${stats.nonTechnical})` },
          ] as { id: Filter; label: string }[]
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className="btn btn-sm"
            style={
              filter === f.id
                ? { background: "var(--mint-weak)", borderColor: "var(--mint-line)", color: "var(--mint)" }
                : undefined
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* PLAN BODY */}
      {planLoading ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          {generating
            ? "Generating your 90-day plan from this audit's findings — one moment, this can take 15-30 seconds."
            : "Loading plan..."}
        </div>
      ) : error ? (
        <div
          className="card pad-lg"
          style={{
            borderColor: "var(--crit-line)",
            background: "var(--crit-weak)",
            color: "var(--text-2)",
          }}
        >
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          No action items yet. Try refreshing the page.
        </div>
      ) : (
        <>
          {[1, 2, 3].map((m) => {
            const monthItems = grouped[m];
            if (monthItems.length === 0) return null;
            const meta = monthGroup(m * 4);
            return (
              <div key={m} className="section">
                <div className="section-head">
                  <div>
                    <h2>{meta.label}</h2>
                    <div className="sub">{meta.sub}</div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {monthItems.map((it) => {
                    const done = !!it.completed_at;
                    const pending = pendingIds.has(it.id);
                    return (
                      <div
                        key={it.id}
                        className="card pad"
                        style={{
                          display: "grid",
                          gridTemplateColumns: "28px 60px 1fr 100px 160px",
                          gap: 14,
                          alignItems: "flex-start",
                          opacity: pending ? 0.6 : 1,
                          background: done ? "var(--inset)" : undefined,
                          transition: "opacity .15s var(--ease)",
                        }}
                      >
                        {/* Checkbox */}
                        <Tooltip label={done ? "Mark this item incomplete" : "Mark this item complete"}>
                          <button
                            onClick={() => toggleItem(it)}
                            disabled={pending}
                            aria-label={done ? "Mark incomplete" : "Mark complete"}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 6,
                              background: done ? "var(--good)" : "var(--surface-2)",
                              border: `1px solid ${done ? "var(--good-line)" : "var(--border)"}`,
                              cursor: pending ? "wait" : "pointer",
                              display: "grid",
                              placeItems: "center",
                              color: done ? "#052822" : "transparent",
                              padding: 0,
                              marginTop: 2,
                              flexShrink: 0,
                            }}
                          >
                            {done && (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        </Tooltip>

                        {/* Week */}
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-3)",
                            letterSpacing: "0.08em",
                            paddingTop: 4,
                          }}
                        >
                          {it.week_number}
                        </div>

                        {/* Title + description */}
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: 15,
                              fontWeight: 600,
                              color: done ? "var(--text-3)" : "var(--text)",
                              textDecoration: done ? "line-through" : "none",
                              marginBottom: 4,
                              lineHeight: 1.35,
                            }}
                          >
                            {it.title}
                          </div>
                          {it.description && (
                            <div style={{ fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>
                              {it.description}
                            </div>
                          )}
                          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <span
                              className={`tag`}
                              style={{
                                background:
                                  it.category === "technical" ? "var(--info-weak)" : "var(--info-weak)",
                                borderColor:
                                  it.category === "technical" ? "var(--info-line)" : "var(--info-line)",
                                color: it.category === "technical" ? "var(--info)" : "var(--info)",
                              }}
                            >
                              {it.category === "technical" ? "Technical" : "Non-technical"}
                            </span>
                            <input
                              type="text"
                              aria-label="Owner"
                              placeholder="Assign owner…"
                              defaultValue={it.owner ?? ""}
                              onBlur={(e) => saveOwner(it, e.currentTarget.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") e.currentTarget.blur();
                              }}
                              style={{
                                fontFamily: "var(--font-body)",
                                fontSize: 12,
                                color: "var(--text)",
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                padding: "3px 8px",
                                width: 130,
                                cursor: "text",
                              }}
                            />
                          </div>
                        </div>

                        {/* Effort */}
                        <div
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--text-3)",
                            background: "var(--surface-2)",
                            padding: "4px 10px",
                            borderRadius: 6,
                            border: "1px solid var(--border-soft)",
                            whiteSpace: "nowrap",
                            justifySelf: "start",
                            marginTop: 2,
                          }}
                        >
                          {it.effort_label || "—"}
                        </div>

                        {/* Date stamp */}
                        <div
                          style={{
                            fontSize: 11,
                            color: done ? "var(--good)" : "var(--text-4)",
                            textAlign: "right",
                            paddingTop: 4,
                          }}
                        >
                          {done ? `Completed ${formatDate(it.completed_at!)}` : "Not started"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* CTA */}
      <div className="cta-banner no-print">
        <div className="cta-banner-text">
          <h3>Want a hand getting started?</h3>
          <p>
            We can tackle the Month 1 quick fixes for you so you&rsquo;re in the right shape to take the
            bigger pieces on yourself.
          </p>
        </div>
        <a
          className="btn btn-primary"
          style={{ textDecoration: "none" }}
          href={`mailto:hello@gatha.ai?subject=${encodeURIComponent(`Quick fixes for ${audit.brand_name}`)}&body=${encodeURIComponent(`Hi — I'd like Gatha to handle the Month 1 quick fixes for ${audit.brand_name} (${audit.brand_url}).\n\nAudit ID: ${id}`)}`}
        >
          Get the quick fixes done →
        </a>
      </div>
    </AuditShell>
  );
}
