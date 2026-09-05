"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/audit/WorkspaceShell";
import DataTable, { DataTableColumn, DataTableFilterGroup } from "@/components/ui/DataTable";

interface Audit {
  id: string;
  brand_name: string;
  brand_url: string;
  status: string;
  visibility_rate: number | null;
  engines: string[];
  created_at: string;
  completed_at: string | null;
  version?: number;
  dashboard_url?: string | null;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
}

/** Download the stored report HTML as a file instead of opening it in the tab. */
async function downloadReport(a: Audit) {
  if (!a.dashboard_url) return;
  const filename = `${(a.brand_name || "gatha").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-gatha-report.html`;
  try {
    const res = await fetch(a.dashboard_url);
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    // Fallback (e.g. blocked by CORS): open the report so the user can save it.
    window.open(a.dashboard_url, "_blank", "noopener");
  }
}

function copyClientLink(a: Audit) {
  if (!a.dashboard_url) return;
  navigator.clipboard.writeText(a.dashboard_url);
}

/** Same report URL, plus the query param that renders the condensed stakeholder view. */
function stakeholderLinkFor(url: string) {
  return url.includes("?") ? `${url}&view=stakeholder` : `${url}?view=stakeholder`;
}

function copyStakeholderLink(a: Audit) {
  if (!a.dashboard_url) return;
  navigator.clipboard.writeText(stakeholderLinkFor(a.dashboard_url));
}

export default function ReportsPage() {
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareFilter, setShareFilter] = useState("all");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/geo-audits?limit=100");
        const data = await res.json();
        setAudits(data.data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = useMemo(
    () => audits.filter((a) => a.status === "completed"),
    [audits]
  );

  const sharedCount = useMemo(() => completed.filter((a) => !!a.dashboard_url).length, [completed]);
  const draftCount = completed.length - sharedCount;

  const clientCount = useMemo(
    () => new Set(completed.map((a) => a.brand_name)).size,
    [completed]
  );

  const latest = useMemo(() => {
    return completed.reduce<Audit | null>((acc, a) => {
      const stamp = a.completed_at || a.created_at;
      const accStamp = acc ? acc.completed_at || acc.created_at : null;
      if (!acc || (stamp && (!accStamp || new Date(stamp) > new Date(accStamp)))) return a;
      return acc;
    }, null);
  }, [completed]);

  const rows = useMemo(() => {
    if (shareFilter === "shared") return completed.filter((a) => !!a.dashboard_url);
    if (shareFilter === "draft") return completed.filter((a) => !a.dashboard_url);
    return completed;
  }, [completed, shareFilter]);

  const columns: DataTableColumn<Audit>[] = [
    {
      key: "report",
      label: "Report",
      render: (a) => (
        <>
          <div style={{ fontWeight: 500, color: "var(--text)" }}>
            {a.brand_name} AI visibility audit
            {a.version && a.version > 1 && (
              <span className="chip chip-mint" style={{ fontSize: 10, padding: "2px 7px", marginLeft: 8 }}>
                v{a.version}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{a.brand_url}</div>
        </>
      ),
    },
    { key: "client", label: "Client", render: (a) => a.brand_name },
    { key: "type", label: "Type", render: () => "Full audit" },
    {
      key: "generated",
      label: "Generated",
      align: "center",
      render: (a) => formatDate(a.completed_at || a.created_at),
    },
    {
      key: "status",
      label: "Status",
      render: (a) => (
        <span className={`chip ${a.dashboard_url ? "chip-good" : "chip-neutral"}`}>
          {a.dashboard_url ? "Shared" : "Draft"}
        </span>
      ),
    },
    {
      key: "action",
      label: "Action",
      align: "center",
      render: (a) => (
        <div style={{ display: "flex", gap: 14, justifyContent: "center", fontSize: 13 }}>
          {a.dashboard_url ? (
            <>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  copyClientLink(a);
                }}
                title="Copy the full report link (everything, for the client)"
                style={{ color: "var(--mint)", fontWeight: 600 }}
              >
                Copy client link
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  copyStakeholderLink(a);
                }}
                title="Copy a condensed summary link (headline results, no deep technical detail)"
                style={{ color: "var(--mint)", fontWeight: 600 }}
              >
                Copy stakeholder link
              </a>
            </>
          ) : (
            <>
              <span style={{ color: "var(--text-4)" }}>Copy client link</span>
              <span style={{ color: "var(--text-4)" }}>Copy stakeholder link</span>
            </>
          )}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              router.push(`/audits/${a.id}/dashboard`);
            }}
            style={{ color: "var(--text)", fontWeight: 500 }}
          >
            Open
          </a>
          {a.dashboard_url ? (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                downloadReport(a);
              }}
              style={{ color: "var(--text)", fontWeight: 500 }}
            >
              Download
            </a>
          ) : (
            <span style={{ color: "var(--text-4)" }}>Download</span>
          )}
        </div>
      ),
    },
  ];

  const filterGroups: DataTableFilterGroup[] = [
    {
      key: "shareStatus",
      active: shareFilter,
      onChange: setShareFilter,
      options: [
        { value: "all", label: "All", count: completed.length },
        { value: "shared", label: "Shared", count: sharedCount },
        { value: "draft", label: "Drafts", count: draftCount },
      ],
    },
  ];

  return (
    <WorkspaceShell
      title="Reports"
      actions={
        <button className="btn btn-sm btn-primary" onClick={() => router.push("/audits/new")}>
          New audit
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>Reports</h1>
          <p>Client-ready documents built from your audits. View the full report, download it, or share the link.</p>
        </div>
      </div>

      {!loading && completed.length > 0 && (
        <div className="kpi-strip">
          <div className="kpi">
            <div className="kpi-label">Reports generated</div>
            <div className="kpi-number">{completed.length}</div>
            <div className="kpi-sub">Across {clientCount} client{clientCount === 1 ? "" : "s"}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Shared with clients</div>
            <div className="kpi-number">{sharedCount}</div>
            <div className="kpi-sub">{draftCount > 0 ? `${draftCount} still in draft` : "None in draft"}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Drafts</div>
            <div className={`kpi-number ${draftCount > 0 ? "num-warn" : ""}`}>{draftCount}</div>
            <div className="kpi-sub">{draftCount > 0 ? "Awaiting a shareable link" : "All reports shared"}</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Latest report</div>
            <div className="kpi-number" style={{ fontSize: 24 }}>
              {latest ? formatDate(latest.completed_at || latest.created_at) : "—"}
            </div>
            <div className="kpi-sub">{latest ? latest.brand_name : "No reports yet"}</div>
          </div>
        </div>
      )}

      <DataTable
        title="Report library"
        subtitle="Client-ready documents built from your audits."
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        loading={loading}
        emptyLabel={
          completed.length === 0
            ? "No reports yet. Completed audits show up here as shareable reports."
            : "No reports match this filter."
        }
        filterGroups={filterGroups}
        page={1}
        pageSize={Math.max(rows.length, 1)}
        total={rows.length}
        onPageChange={() => {}}
      />
    </WorkspaceShell>
  );
}
