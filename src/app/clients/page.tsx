"use client";

import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/audit/WorkspaceShell";
import DataTable, { DataTableColumn, DataTableFilterGroup } from "@/components/ui/DataTable";
import { usePaginatedTable } from "@/lib/use-paginated-table";

interface Client {
  id: string;
  name: string;
  url: string;
  status: string;
  intake_token: string;
  audit_id: string | null;
  industry: string | null;
  visibility_rate: number | null;
  visibility_trend: number | null;
  last_audit_at: string | null;
  needs_attention: boolean;
}

function toneOf(rate: number) {
  if (rate >= 50) return "good";
  if (rate >= 25) return "warn";
  return "crit";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

export default function ClientsPage() {
  const router = useRouter();
  const table = usePaginatedTable<Client>("/api/clients", ["status"]);

  const averageVisibility = Number(table.stats.averageVisibility ?? 0);
  const auditsThisMonth = Number(table.stats.auditsThisMonth ?? 0);
  const activeClients = table.counts.all ?? 0;
  const needsAttention = table.counts.attention ?? 0;

  function copyIntakeLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/intake/${token}`);
  }

  const columns: DataTableColumn<Client>[] = [
    {
      key: "client",
      label: "Client",
      render: (c) => (
        <>
          <div style={{ fontWeight: 500, color: "var(--text)" }}>{c.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>{c.industry || c.url}</div>
        </>
      ),
    },
    {
      key: "visibility",
      label: "AI visibility",
      render: (c) =>
        c.visibility_rate != null ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="bar" style={{ flex: 1, maxWidth: 160 }}>
              <div className={`bar-fill ${toneOf(c.visibility_rate)}`} style={{ width: `${c.visibility_rate}%` }} />
            </div>
            <span className="num-big" style={{ fontSize: 15 }}>{c.visibility_rate}%</span>
          </div>
        ) : (
          <span className={`chip ${c.status === "auditing" ? "chip-info" : "chip-neutral"}`}>
            {c.status === "auditing" ? "Auditing" : "Awaiting intake"}
          </span>
        ),
    },
    {
      key: "trend",
      label: "Since last audit",
      align: "center",
      render: (c) =>
        c.visibility_trend != null ? (
          <span className={`chip ${c.visibility_trend > 0 ? "chip-good" : c.visibility_trend < 0 ? "chip-crit" : "chip-neutral"}`}>
            {c.visibility_trend > 0 ? "+" : ""}
            {c.visibility_trend} pts
          </span>
        ) : c.visibility_rate != null ? (
          <span className="chip chip-neutral">No change</span>
        ) : (
          <span style={{ color: "var(--text-4)" }}>—</span>
        ),
    },
    {
      key: "last_audit",
      label: "Last audit",
      align: "center",
      render: (c) => (c.last_audit_at ? formatDate(c.last_audit_at) : "—"),
    },
    {
      key: "open",
      label: "Open",
      render: (c) =>
        c.visibility_rate != null ? (
          <a href={`/audits/${c.audit_id}/dashboard`} style={{ color: "var(--text)", fontWeight: 500 }}>
            Overview
          </a>
        ) : (
          <button className="btn btn-sm" onClick={() => copyIntakeLink(c.intake_token)}>
            Copy intake link
          </button>
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
        { value: "attention", label: "Needs attention", count: table.counts.attention ?? 0 },
        { value: "improving", label: "Improving", count: table.counts.improving ?? 0 },
      ],
    },
  ];

  return (
    <WorkspaceShell
      title="Clients"
      actions={
        <>
          <a className="btn btn-sm" href="mailto:?subject=Join%20us%20on%20Gatha">
            Invite client
          </a>
          <button className="btn btn-sm btn-primary" onClick={() => router.push("/clients/new")}>
            New client
          </button>
        </>
      }
    >
      <div className="page-head">
        <div>
          <h1>All clients</h1>
          <p>AI visibility across every account you audit.</p>
        </div>
      </div>

      {!table.loading && activeClients > 0 && (
        <div className="kpi-strip">
          <div className="kpi">
            <div className="kpi-label">Active clients</div>
            <div className="kpi-number">{activeClients}</div>
            <div className="kpi-sub">across your workspace</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Average visibility</div>
            <div className={`kpi-number num-${toneOf(averageVisibility)}`}>{averageVisibility}%</div>
            <div className="kpi-sub">{table.counts.improving ?? 0} improving this month</div>
          </div>
          <div className="kpi">
            <div className="kpi-number">{auditsThisMonth}</div>
            <div className="kpi-label">Audits this month</div>
          </div>
          <div className="kpi">
            <div className={`kpi-number ${needsAttention > 0 ? "num-warn" : ""}`}>{needsAttention}</div>
            <div className="kpi-label">Needs attention</div>
            <div className="kpi-sub">Visibility flat or falling</div>
          </div>
        </div>
      )}

      <DataTable
        title="Clients"
        subtitle="AI visibility across every account you audit."
        columns={columns}
        rows={table.rows}
        rowKey={(c) => c.id}
        loading={table.loading}
        emptyLabel="No clients yet. Add a client to generate their audit intake link."
        filterGroups={filterGroups}
        search={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder="Search clients..."
        page={table.page}
        pageSize={20}
        total={table.total}
        onPageChange={table.setPage}
      />
    </WorkspaceShell>
  );
}
