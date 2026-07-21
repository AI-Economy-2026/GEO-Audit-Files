"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/audit/WorkspaceShell";
import { tone } from "@/components/audit/useAuditData";

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

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-neutral",
  running: "chip-info",
  completed: "chip-good",
  failed: "chip-crit",
  cancelled: "chip-neutral",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
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

export default function ReportsPage() {
  const router = useRouter();
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/geo-audits");
        const data = await res.json();
        setAudits(data.audits || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const completed = useMemo(
    () => audits.filter((a) => a.status === "completed"),
    [audits]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return completed;
    return completed.filter(
      (a) =>
        a.brand_name.toLowerCase().includes(q) ||
        (a.brand_url || "").toLowerCase().includes(q)
    );
  }, [completed, query]);

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
          <p>Every completed audit. View the full report, download it, or share the score.</p>
        </div>
        {completed.length > 0 && (
          <div className="actions">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by brand or URL…"
              aria-label="Search reports"
              style={{
                width: 240,
                padding: "10px 14px",
                borderRadius: "var(--r-md)",
                background: "var(--inset)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
              }}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          Loading reports…
        </div>
      ) : completed.length === 0 ? (
        <div className="card pad-lg" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, color: "var(--text-2)", marginBottom: 6 }}>No reports yet</div>
          <p style={{ color: "var(--text-3)", maxWidth: 420, margin: "0 auto 16px" }}>
            Completed audits show up here as shareable reports with their visibility score.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/audits/new")}>
            Run your first audit
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          No reports match “{query}”.
        </div>
      ) : (
        <div className="grid-3">
          {filtered.map((a) => {
            const t = tone(a.visibility_rate ?? 0);
            return (
              <div
                key={a.id}
                className="card pad-lg"
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 17, color: "var(--text)" }}>
                      {a.brand_name}
                      {a.version && a.version > 1 && (
                        <span style={{ fontSize: 11, color: "var(--text-4)", marginLeft: 6, fontWeight: 500 }}>
                          v{a.version}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 3, wordBreak: "break-all" }}>
                      {a.brand_url}
                    </div>
                  </div>
                  <span className={`chip ${STATUS_CHIP[a.status] || "chip-neutral"}`}>{a.status}</span>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span className={`num-xl num-${t}`}>
                    {a.visibility_rate != null ? a.visibility_rate : "-"}
                    {a.visibility_rate != null && (
                      <span style={{ fontSize: 15, color: "var(--text-3)", fontWeight: 500 }}>%</span>
                    )}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                    visibility · {a.engines?.length || 0} engines
                  </span>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-4)" }}>
                  {a.completed_at ? `Completed ${formatDate(a.completed_at)}` : formatDate(a.created_at)}
                </div>

                <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 4 }}>
                  <button
                    className="btn btn-sm btn-primary"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => router.push(`/audits/${a.id}/dashboard`)}
                  >
                    View report
                  </button>
                  {a.dashboard_url ? (
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, justifyContent: "center" }}
                      onClick={() => downloadReport(a)}
                    >
                      Download
                    </button>
                  ) : (
                    <button
                      className="btn btn-sm"
                      style={{ flex: 1, justifyContent: "center", opacity: 0.5, cursor: "not-allowed" }}
                      disabled
                      title="Downloadable report not available for this audit"
                    >
                      Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WorkspaceShell>
  );
}
