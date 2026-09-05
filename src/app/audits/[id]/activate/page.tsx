"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import AuditShell from "@/components/audit/AuditShell";
import Tooltip from "@/components/audit/Tooltip";
import { useAuditData } from "@/components/audit/useAuditData";
import { exportActionPlanToXlsx } from "@/lib/xlsx-export";

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

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
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

  // Detect "still generating" state for UX clarity. Fires before the API responds
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
    const base = filter === "all" ? items : items.filter((it) => it.category === filter);
    return [...base].sort((a, b) => {
      if (a.week_number !== b.week_number) return a.week_number - b.week_number;
      return a.sort_order - b.sort_order;
    });
  }, [items, filter]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((it) => it.completed_at).length;
    const technical = items.filter((it) => it.category === "technical").length;
    const nonTechnical = items.filter((it) => it.category === "non_technical").length;
    const inProgress = items.filter((it) => !it.completed_at && it.owner).length;
    const notStarted = total - done - inProgress;
    const maxWeek = total > 0 ? Math.max(...items.map((it) => it.week_number)) : 0;
    return {
      total,
      done,
      technical,
      nonTechnical,
      inProgress,
      notStarted,
      maxWeek,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  }, [items]);

  const monthCounts = useMemo(() => {
    const m: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    items.forEach((it) => {
      const g = it.week_number <= 4 ? 1 : it.week_number <= 8 ? 2 : 3;
      m[g]++;
    });
    return m;
  }, [items]);

  const checkpoints = useMemo(() => {
    if (!audit?.completed_at) return null;
    return {
      week4: addDays(audit.completed_at, 28),
      week8: addDays(audit.completed_at, 56),
      day90: addDays(audit.completed_at, 90),
    };
  }, [audit?.completed_at]);

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
          <h1>Action Plan</h1>
          <p>
            Your 90-day action plan for {audit.brand_name}, generated from this audit&rsquo;s findings. Tick
            items off as you complete them and we&rsquo;ll track the date.
          </p>
        </div>
        <div className="actions no-print">
          <Tooltip label="Open the browser print dialog to save the 90-day plan as PDF">
            <button className="btn btn-sm" onClick={() => window.print()}>
              Export PDF
            </button>
          </Tooltip>
          <Tooltip label="Download the 90-day plan as an Excel spreadsheet">
            <button
              className="btn btn-sm"
              onClick={() => exportActionPlanToXlsx(items, audit.brand_name)}
              disabled={items.length === 0}
            >
              Export Excel
            </button>
          </Tooltip>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Items in plan</div>
          <div className="kpi-number">{stats.total}</div>
          <div className="kpi-sub">
            {stats.maxWeek > 0 ? `Sequenced across ${stats.maxWeek} weeks` : "Plan is being prepared"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Shipped</div>
          <div className={`kpi-number ${stats.done > 0 ? "num-good" : ""}`}>{stats.done}</div>
          <div className="kpi-sub">
            {stats.total === 0
              ? "-"
              : stats.inProgress > 0
                ? `${stats.inProgress} in progress now`
                : stats.done > 0
                  ? `${stats.pct}% complete`
                  : "None started yet"}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Current visibility</div>
          <div className="kpi-number">
            {Math.round(audit.visibility_rate ?? 0)}
            <span className="unit">%</span>
          </div>
          <div className="kpi-sub">This audit&rsquo;s baseline, before the plan ships</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Next re-run</div>
          <div className="kpi-number" style={{ fontSize: 26 }}>
            {checkpoints ? formatDate(checkpoints.day90) : "-"}
          </div>
          <div className="kpi-sub">Uses 1 audit credit</div>
        </div>
      </div>

      {/* PLAN BODY */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>The plan</h2>
            <div className="sub">Ordered so the highest-reach work ships first.</div>
          </div>
          <div className="actions no-print" style={{ display: "flex", gap: 6 }}>
            {(
              [
                { id: "all", label: `All ${stats.total}` },
                { id: "technical", label: `Technical ${stats.technical}` },
                { id: "non_technical", label: `Non-technical ${stats.nonTechnical}` },
              ] as { id: Filter; label: string }[]
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`chip ${filter === f.id ? "chip-mint" : "chip-neutral"}`}
                style={{ cursor: "pointer", border: "none" }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            The agreed work, who owns it, which week it ships and what each item is expected to win.
          </p>
        </div>

        {planLoading ? (
          <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
            {generating
              ? "Generating your 90-day plan from this audit's findings. One moment, this can take 15-30 seconds."
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
        ) : filtered.length === 0 ? (
          <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
            No action items match this filter.
          </div>
        ) : (
          <div className="table-wrap">
            <div className="scroll">
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>#</th>
                    <th>Action</th>
                    <th>Owner</th>
                    <th className="center">Week</th>
                    <th className="center">Effort</th>
                    <th className="center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it, i) => {
                    const done = !!it.completed_at;
                    const pending = pendingIds.has(it.id);
                    const g = it.week_number <= 4 ? 1 : it.week_number <= 8 ? 2 : 3;
                    const isFirstOfMonth = i === 0 || (() => {
                      const prev = filtered[i - 1];
                      const prevG = prev.week_number <= 4 ? 1 : prev.week_number <= 8 ? 2 : 3;
                      return prevG !== g;
                    })();
                    const meta = monthGroup(it.week_number);

                    const statusLabel = done ? "Completed" : it.owner ? "In progress" : "Not started";
                    const statusClass = done ? "chip-good" : it.owner ? "chip-warn" : "chip-neutral";

                    return (
                      <Fragment key={it.id}>
                        {isFirstOfMonth && (
                          <tr key={`${it.id}-group`}>
                            <td
                              colSpan={6}
                              style={{
                                background: "var(--surface-2)",
                                fontSize: 11,
                                fontWeight: 700,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                color: "var(--text-3)",
                              }}
                            >
                              {meta.label} &middot; {meta.sub} ({monthCounts[g]})
                            </td>
                          </tr>
                        )}
                        <tr key={it.id} style={{ opacity: pending ? 0.6 : 1 }}>
                          <td style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-3)" }}>
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td style={{ maxWidth: 340 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                color: done ? "var(--text-3)" : "var(--text)",
                                textDecoration: done ? "line-through" : "none",
                                marginBottom: it.description ? 4 : 0,
                              }}
                            >
                              {it.title}
                            </div>
                            {it.description && (
                              <div style={{ fontSize: 12.5, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 6 }}>
                                {it.description}
                              </div>
                            )}
                            <span className={`chip ${it.category === "technical" ? "chip-info" : "chip-neutral"}`} style={{ padding: "3px 9px", fontSize: 10.5 }}>
                              {it.category === "technical" ? "Technical" : "Non-technical"}
                            </span>
                          </td>
                          <td>
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
                                fontSize: 12.5,
                                color: "var(--text)",
                                background: "var(--surface-2)",
                                border: "1px solid var(--border)",
                                borderRadius: 6,
                                padding: "5px 9px",
                                width: 120,
                                cursor: "text",
                              }}
                            />
                          </td>
                          <td className="center" style={{ fontVariantNumeric: "tabular-nums" }}>
                            Week {it.week_number}
                          </td>
                          <td className="center">
                            <span className="tag">{it.effort_label || "-"}</span>
                          </td>
                          <td className="center">
                            <Tooltip label={done ? "Mark this item incomplete" : "Mark this item complete"}>
                              <button
                                onClick={() => toggleItem(it)}
                                disabled={pending}
                                className={`chip ${statusClass}`}
                                style={{ cursor: pending ? "wait" : "pointer", border: "none" }}
                              >
                                {statusLabel}
                              </button>
                            </Tooltip>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* WHAT HAPPENS AFTER */}
      <div className="section">
        <div className="section-head">
          <div>
            <h2>What happens after</h2>
            <div className="sub">Two checkpoints, then the next audit.</div>
          </div>
        </div>

        <div className="card pad" style={{ marginBottom: 14, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span className="chip chip-mint">In plain terms</span>
          <p style={{ margin: 0, color: "var(--text-2)" }}>
            Engines take roughly ten days to pick up a new page, so movement shows in the next audit, not
            immediately.
          </p>
        </div>

        <div className="grid-3">
          <div className="card pad-lg">
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>
              {checkpoints ? `Week of ${formatDate(checkpoints.week4)}` : "Week 4"}
            </div>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6 }}>
              {monthCounts[1]} Month 1 item{monthCounts[1] === 1 ? "" : "s"} should be live. Engines usually
              pick up new pages within ten days.
            </p>
          </div>
          <div className="card pad-lg">
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>
              {checkpoints ? `Week of ${formatDate(checkpoints.week8)}` : "Week 8"}
            </div>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6 }}>
              {monthCounts[2]} Month 2 item{monthCounts[2] === 1 ? "" : "s"} published. Blind-spot prompts
              from this audit should start returning {audit.brand_name}.
            </p>
          </div>
          <div className="card pad-lg">
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 10 }}>
              {checkpoints ? formatDate(checkpoints.day90) : "Day 90"}
            </div>
            <p style={{ margin: 0, color: "var(--text-2)", lineHeight: 1.6 }}>
              Gatha re-runs the same {audit.total_queries ?? 0} prompts so movement is measured against this
              audit, not a new baseline.
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="cta-banner no-print">
        <div className="cta-banner-text">
          <h3>Need help delivering this?</h3>
          <p>
            We can tackle the Month 1 quick fixes for you so you&rsquo;re in the right shape to take the
            bigger pieces on yourself.
          </p>
        </div>
        <a
          className="btn btn-primary"
          style={{ textDecoration: "none" }}
          href={`mailto:hello@gatha.ai?subject=${encodeURIComponent(`Quick fixes for ${audit.brand_name}`)}&body=${encodeURIComponent(`Hi, I'd like Gatha to handle the Month 1 quick fixes for ${audit.brand_name} (${audit.brand_url}).\n\nAudit ID: ${id}`)}`}
        >
          Request a fix
        </a>
      </div>
    </AuditShell>
  );
}
