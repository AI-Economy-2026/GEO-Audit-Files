"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import WorkspaceShell from "@/components/audit/WorkspaceShell";
import { tone } from "@/components/audit/useAuditData";

interface Client {
  id: string;
  name: string;
  url: string;
  email: string | null;
  status: string;
  intake_token: string;
  report_slug: string;
  audit_id: string | null;
  intake_completed_at: string | null;
  created_at: string;
}

interface AuditVersion {
  id: string;
  version: number;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  created_at: string;
  completed_at: string | null;
}

const STATUS_CHIP: Record<string, string> = {
  pending_intake: "chip-neutral",
  intake_completed: "chip-info",
  auditing: "chip-info",
  completed: "chip-good",
  failed: "chip-crit",
};

const STATUS_LABELS: Record<string, string> = {
  pending_intake: "Awaiting intake",
  intake_completed: "Intake done",
  auditing: "Auditing",
  completed: "Completed",
  failed: "Failed",
};

const AUDIT_STATUS_CHIP: Record<string, string> = {
  completed: "chip-good",
  running: "chip-info",
  pending: "chip-neutral",
  failed: "chip-crit",
  cancelled: "chip-neutral",
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, AuditVersion[]>>({});
  const [versionsLoading, setVersionsLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data.clients || []);
      setLoading(false);
    })();
  }, []);

  const fetchVersions = useCallback(
    async (auditId: string, clientId: string) => {
      if (versions[clientId]) return;
      setVersionsLoading(clientId);
      try {
        const res = await fetch(`/api/geo-audits/${auditId}/history`);
        const data = await res.json();
        if (data.history) {
          setVersions((prev) => ({ ...prev, [clientId]: data.history }));
        }
      } catch {
        // ignore
      } finally {
        setVersionsLoading(null);
      }
    },
    [versions]
  );

  function toggleExpand(client: Client) {
    if (expandedClient === client.id) {
      setExpandedClient(null);
    } else {
      setExpandedClient(client.id);
      if (client.audit_id) {
        fetchVersions(client.audit_id, client.id);
      }
    }
  }

  function copyIntakeLink(token: string) {
    const link = `${window.location.origin}/intake/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  const completedClients = clients.filter((c) => c.status === "completed").length;
  const auditingClients = clients.filter((c) => c.status === "auditing").length;
  const pendingClients = clients.filter((c) => c.status === "pending_intake").length;

  return (
    <WorkspaceShell
      title="Clients"
      actions={
        <button className="btn btn-sm btn-primary" onClick={() => router.push("/clients/new")}>
          New client
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>Your clients</h1>
          <p>
            Manage your client roster and track each brand&rsquo;s audit history. Click a row to
            expand its audit versions.
          </p>
        </div>
      </div>

      {!loading && clients.length > 0 && (
        <div className="kpi-strip">
          <div className="kpi">
            <div className="kpi-label">Active clients</div>
            <div className="kpi-number">{clients.length}</div>
            <div className="kpi-sub">across your workspace</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Completed</div>
            <div className="kpi-number num-good">{completedClients}</div>
            <div className="kpi-sub">audit delivered</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Auditing</div>
            <div className={`kpi-number ${auditingClients > 0 ? "num-info" : ""}`}>
              {auditingClients}
            </div>
            <div className="kpi-sub">in progress</div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Awaiting intake</div>
            <div className={`kpi-number ${pendingClients > 0 ? "num-warn" : ""}`}>
              {pendingClients}
            </div>
            <div className="kpi-sub">pending client form</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          Loading clients...
        </div>
      ) : clients.length === 0 ? (
        <div className="card pad-lg" style={{ textAlign: "center" }}>
          <div
            style={{
              width: 56,
              height: 56,
              margin: "0 auto 14px",
              borderRadius: 14,
              background: "var(--mint-weak)",
              border: "1px solid var(--mint-line)",
              display: "grid",
              placeItems: "center",
              color: "var(--mint)",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              fontWeight: 700,
              color: "var(--text)",
              margin: "0 0 8px",
            }}
          >
            No clients yet
          </h3>
          <p style={{ color: "var(--text-3)", maxWidth: 440, margin: "0 auto 18px" }}>
            Add a client to generate their AI visibility audit intake link.
          </p>
          <button className="btn btn-primary" onClick={() => router.push("/clients/new")}>
            Add your first client
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-head-bar">
            <div>
              <h3>Client roster</h3>
              <div className="sub">Click a client with audits to view its version history.</div>
            </div>
          </div>
          <div className="scroll">
            <table className="data" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Client</th>
                  <th className="center">Status</th>
                  <th>Intake</th>
                  <th>Report</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const isExpanded = expandedClient === client.id;
                  const clientVersions = versions[client.id] || [];
                  const hasAudit = !!client.audit_id;

                  return (
                    <Fragment key={client.id}>
                      <tr
                        className={hasAudit ? "clickable" : undefined}
                        onClick={() => hasAudit && toggleExpand(client)}
                      >
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {hasAudit ? (
                              <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={{
                                  width: 14,
                                  height: 14,
                                  color: "var(--text-3)",
                                  transition: "transform .18s var(--ease)",
                                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                                  flexShrink: 0,
                                }}
                              >
                                <polyline points="9 6 15 12 9 18" />
                              </svg>
                            ) : (
                              <span style={{ width: 14, flexShrink: 0 }} />
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--text)" }}>{client.name}</div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-3)",
                                  fontFamily: "var(--font-mono)",
                                  marginTop: 2,
                                }}
                              >
                                {client.url}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="center">
                          <span className={`chip ${STATUS_CHIP[client.status] || "chip-neutral"}`}>
                            {STATUS_LABELS[client.status] || client.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyIntakeLink(client.intake_token);
                            }}
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              {copied === client.intake_token ? (
                                <polyline points="20 6 9 17 4 12" />
                              ) : (
                                <>
                                  <rect x="9" y="9" width="13" height="13" rx="2" />
                                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                                </>
                              )}
                            </svg>
                            {copied === client.intake_token ? "Copied" : "Copy link"}
                          </button>
                        </td>
                        <td>
                          {client.status === "completed" ? (
                            <a
                              href={`/report/${client.report_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="btn btn-sm"
                              style={{ textDecoration: "none" }}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                <polyline points="15 3 21 3 21 9" />
                                <line x1="10" y1="14" x2="21" y2="3" />
                              </svg>
                              View report
                            </a>
                          ) : client.status === "auditing" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                fontSize: 12,
                                color: "var(--info)",
                              }}
                            >
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: 999,
                                  background: "var(--info)",
                                  boxShadow: "0 0 8px var(--info)",
                                }}
                              />
                              In progress
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-3)" }}>—</span>
                          )}
                        </td>
                        <td style={{ color: "var(--text-3)" }}>{formatDate(client.created_at)}</td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={5} style={{ background: "var(--inset)", padding: "16px 24px" }}>
                            {versionsLoading === client.id ? (
                              <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                                Loading versions...
                              </div>
                            ) : clientVersions.length === 0 ? (
                              <div style={{ color: "var(--text-3)", fontSize: 13 }}>
                                No audit versions found.
                              </div>
                            ) : (
                              <div>
                                <div
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: "var(--text-4)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    marginBottom: 10,
                                  }}
                                >
                                  Audit versions ({clientVersions.length})
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {clientVersions.map((v, idx) => {
                                    const prev = idx > 0 ? clientVersions[idx - 1] : null;
                                    const delta =
                                      prev &&
                                      v.visibility_rate != null &&
                                      prev.visibility_rate != null
                                        ? +(v.visibility_rate - prev.visibility_rate).toFixed(1)
                                        : null;
                                    const t = tone(v.visibility_rate ?? 0);
                                    const dDir = delta == null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

                                    return (
                                      <div
                                        key={v.id}
                                        onClick={() => router.push(`/audits/${v.id}`)}
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns: "60px 90px 1fr 100px 110px 70px",
                                          alignItems: "center",
                                          gap: 14,
                                          padding: "12px 16px",
                                          borderRadius: "var(--r-md)",
                                          background: "var(--surface-2)",
                                          border: "1px solid var(--border-soft)",
                                          cursor: "pointer",
                                          transition: "border-color .18s var(--ease)",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontFamily: "var(--font-mono)",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: "var(--mint)",
                                          }}
                                        >
                                          v{v.version}
                                        </span>
                                        <span
                                          className={`chip ${AUDIT_STATUS_CHIP[v.status] || "chip-neutral"}`}
                                        >
                                          {v.status}
                                        </span>
                                        <span style={{ fontSize: 12, color: "var(--text-3)" }}>
                                          {v.total_mentioned != null
                                            ? `${v.total_mentioned} / ${v.total_queries} mentions`
                                            : ""}
                                        </span>
                                        <span
                                          className={`num-big num-${t}`}
                                          style={{ fontSize: 18, textAlign: "right" }}
                                        >
                                          {v.visibility_rate != null ? (
                                            <>
                                              {v.visibility_rate}
                                              <span
                                                style={{
                                                  fontSize: 11,
                                                  color: "var(--text-3)",
                                                  fontWeight: 500,
                                                }}
                                              >
                                                %
                                              </span>
                                            </>
                                          ) : (
                                            "—"
                                          )}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 700,
                                            fontFamily: "var(--font-display)",
                                            textAlign: "right",
                                            color:
                                              dDir === "up"
                                                ? "var(--good)"
                                                : dDir === "down"
                                                  ? "var(--crit)"
                                                  : "var(--text-4)",
                                          }}
                                        >
                                          {delta == null
                                            ? "—"
                                            : `${delta > 0 ? "▲" : delta < 0 ? "▼" : "±"} ${Math.abs(delta)}%`}
                                        </span>
                                        <span
                                          style={{
                                            fontSize: 11,
                                            color: "var(--text-3)",
                                            textAlign: "right",
                                          }}
                                        >
                                          {v.completed_at
                                            ? formatDate(v.completed_at)
                                            : v.status === "running" || v.status === "pending"
                                              ? "Running…"
                                              : ""}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
}
