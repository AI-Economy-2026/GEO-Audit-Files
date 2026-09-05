"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/audit/WorkspaceShell";
import DataTable, { DataTableColumn, DataTableFilterGroup } from "@/components/ui/DataTable";
import { tone } from "@/components/audit/useAuditData";
import { useMe } from "@/lib/me-context";
import { usePaginatedTable } from "@/lib/use-paginated-table";
import BuyCreditsModal from "@/components/billing/BuyCreditsModal";

interface Audit {
  id: string;
  brand_name: string;
  brand_url: string;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  engines: string[];
  created_at: string;
  version: number | null;
}

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-neutral",
  running: "chip-info",
  completed: "chip-good",
  failed: "chip-crit",
  cancelled: "chip-neutral",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function AuditsPage() {
  const router = useRouter();
  const { me } = useMe();
  const table = usePaginatedTable<Audit>("/api/geo-audits", ["status"]);
  const outOfCredits = me?.role === "agency" && me.creditsRemaining <= 0;
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);

  const thisMonthCount = Number(table.stats.thisMonthCount ?? 0);
  const creditPool = Number(table.stats.creditPool ?? 0);
  const runningCount = Number(table.stats.runningCount ?? 0);
  const runningPreview = table.stats.runningPreview as { brandName: string; totalQueries: number | null } | null;
  const draftCount = Number(table.stats.draftCount ?? 0);

  const columns: DataTableColumn<Audit>[] = [
    {
      key: "client",
      label: "Client",
      render: (a) => (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 500, color: "var(--text)" }}>
            {a.brand_name}
            {a.version && a.version > 1 && (
              <span className="chip chip-mint" style={{ fontSize: 10, padding: "2px 7px" }}>
                v{a.version}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{a.brand_url}</div>
        </>
      ),
    },
    { key: "run", label: "Run", render: (a) => <span style={{ color: "var(--text-3)" }}>{formatDate(a.created_at)}</span> },
    { key: "prompts", label: "Prompts", align: "center", render: (a) => a.total_queries ?? "-" },
    { key: "engines", label: "Engines", align: "center", render: (a) => a.engines?.length || 0 },
    {
      key: "visibility",
      label: "Visibility",
      align: "center",
      render: (a) =>
        a.visibility_rate != null ? (
          <span className={`num-big num-${tone(a.visibility_rate)}`}>
            {a.visibility_rate}
            <span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>%</span>
          </span>
        ) : (
          <span style={{ color: "var(--text-3)" }}>-</span>
        ),
    },
    {
      key: "status",
      label: "Status",
      render: (a) => <span className={`chip ${STATUS_CHIP[a.status] || "chip-neutral"}`}>{a.status}</span>,
    },
    {
      key: "action",
      label: "Action",
      align: "center",
      render: (a) => (
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-3)" }}>
          {a.status === "completed" ? "View" : "Progress"}
        </span>
      ),
    },
  ];

  const filterGroups: DataTableFilterGroup[] = [
    {
      key: "status",
      active: table.filters.status,
      onChange: (value) => table.setFilter("status", value),
      options: [
        { value: "all", label: "All", count: table.counts.all ?? 0 },
        { value: "completed", label: "Complete", count: table.counts.completed ?? 0 },
        { value: "running", label: "Running", count: table.counts.running ?? 0 },
        { value: "drafts", label: "Drafts", count: table.counts.drafts ?? 0 },
      ],
    },
  ];

  return (
    <WorkspaceShell
      title="Audits"
      actions={
        <button
          className="btn btn-sm btn-primary"
          onClick={() => router.push("/audits/new")}
          disabled={outOfCredits}
          style={outOfCredits ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          New audit
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>AI Audits</h1>
          <p>Every AI Search Visibility audit run from this workspace. Click any row to open the full report.</p>
        </div>
      </div>

      {outOfCredits && (
        <div className="card pad" style={{ marginBottom: 18, borderColor: "var(--crit-line)", background: "var(--crit-weak)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14, marginBottom: 2 }}>Out of audit credits</div>
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>Ask your administrator to top up before starting another audit.</div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => setBuyCreditsOpen(true)}>
            Buy credits
          </button>
        </div>
      )}

      <BuyCreditsModal
        open={buyCreditsOpen}
        onClose={() => setBuyCreditsOpen(false)}
        balance={me?.creditsRemaining ?? null}
      />

      {!table.loading && (table.counts.all ?? 0) > 0 && (
        <div className="kpi-strip">
          <div className="kpi">
            <div className="kpi-label">Audits run</div>
            <div className="kpi-number">
              {thisMonthCount}
              {creditPool > 0 && <span className="unit">/{creditPool}</span>}
            </div>
            <div className="kpi-sub">This calendar month</div>
          </div>
          {me?.role === "agency" && (
            <div className="kpi">
              <div className="kpi-label">Credits used</div>
              <div className="kpi-number">
                {me.creditsUsed}
                {creditPool > 0 && <span className="unit">/{creditPool}</span>}
              </div>
              <div className="kpi-sub">{me.creditsRemaining} remaining</div>
            </div>
          )}
          <div className="kpi">
            <div className="kpi-label">Running now</div>
            <div className={`kpi-number ${runningCount > 0 ? "num-info" : ""}`}>{runningCount}</div>
            <div className="kpi-sub">
              {runningPreview
                ? `${runningPreview.brandName}, ${runningPreview.totalQueries ?? "-"} prompts`
                : runningCount > 1
                  ? `${runningCount} audits in progress`
                  : "None right now"}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Drafts</div>
            <div className="kpi-number">{draftCount}</div>
            <div className="kpi-sub">Not started yet</div>
          </div>
        </div>
      )}

      <DataTable
        title="Audit history"
        subtitle="Latest first."
        columns={columns}
        rows={table.rows}
        rowKey={(a) => a.id}
        onRowClick={(a) => router.push(a.status === "completed" ? `/audits/${a.id}/dashboard` : `/audits/${a.id}`)}
        loading={table.loading}
        emptyLabel="No audits yet. Run your first AI visibility audit."
        filterGroups={filterGroups}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search audits..."
        page={table.page}
        pageSize={20}
        total={table.total}
        onPageChange={table.setPage}
      />
    </WorkspaceShell>
  );
}
