"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import TopNav from "@/components/ui/TopNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

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

type Tone = "primary" | "secondary" | "error" | "neutral" | "success";

const STATUS_TONE: Record<string, Tone> = {
  pending_intake: "secondary",
  intake_completed: "primary",
  auditing: "primary",
  completed: "success",
  failed: "error",
};

const STATUS_LABELS: Record<string, string> = {
  pending_intake: "Awaiting Intake",
  intake_completed: "Intake Done",
  auditing: "Auditing",
  completed: "Completed",
  failed: "Failed",
};

const AUDIT_STATUS_TONE: Record<string, Tone> = {
  completed: "success",
  running: "primary",
  pending: "secondary",
  failed: "error",
  cancelled: "neutral",
};

function visibilityTone(rate: number | null): string {
  if (rate == null) return "text-on-surface-variant";
  if (rate >= 50) return "text-primary";
  if (rate >= 25) return "text-secondary";
  return "text-error";
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, AuditVersion[]>>({});
  const [versionsLoading, setVersionsLoading] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }

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

  return (
    <AppShell
      topNav={
        <TopNav
          brand="GEO Audit Pro"
          tabs={[
            { href: "/audits", label: "Audits", match: (p) => p.startsWith("/audits") },
            { href: "/clients", label: "Clients", match: (p) => p.startsWith("/clients") },
          ]}
          right={
            <Button icon="add" onClick={() => router.push("/clients/new")}>
              New Client
            </Button>
          }
        />
      }
    >
      <div className="flex justify-between items-end mb-10 gap-4 flex-wrap">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
            Clients
          </h2>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Manage your client roster and track each brand&apos;s audit history in one place.
          </p>
        </div>
        <Button icon="add" size="lg" onClick={() => router.push("/clients/new")}>
          New Client
        </Button>
      </div>

      {loading ? (
        <GlassCard padding="xl" className="text-center">
          <p className="text-on-surface-variant">Loading...</p>
        </GlassCard>
      ) : clients.length === 0 ? (
        <GlassCard padding="xl" className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">groups</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-2">No clients yet</h3>
          <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
            Add a client to generate their AI visibility audit intake link.
          </p>
          <Button icon="add" size="lg" onClick={() => router.push("/clients/new")}>
            Add Your First Client
          </Button>
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Client
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Intake
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Report
                  </th>
                  <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Added
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const isExpanded = expandedClient === client.id;
                  const clientVersions = versions[client.id] || [];
                  const hasAudit = !!client.audit_id;

                  return (
                    <Fragment key={client.id}>
                      <tr className="hover:bg-white/5 transition-colors border-t border-white/5">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            {hasAudit ? (
                              <button
                                onClick={() => toggleExpand(client)}
                                className="text-on-surface-variant hover:text-primary transition-all"
                              >
                                <span
                                  className={`material-symbols-outlined transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                >
                                  chevron_right
                                </span>
                              </button>
                            ) : (
                              <span className="w-6" />
                            )}
                            <div>
                              <p className="font-bold text-on-surface">{client.name}</p>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {client.url}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <Badge tone={STATUS_TONE[client.status] || "neutral"}>
                            {STATUS_LABELS[client.status] || client.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-5">
                          <button
                            onClick={() => copyIntakeLink(client.intake_token)}
                            className="text-sm text-primary hover:opacity-80 font-bold inline-flex items-center gap-1 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {copied === client.intake_token ? "check" : "content_copy"}
                            </span>
                            {copied === client.intake_token ? "Copied" : "Copy Link"}
                          </button>
                        </td>
                        <td className="px-6 py-5">
                          {client.status === "completed" ? (
                            <a
                              href={`/report/${client.report_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:opacity-80 font-bold inline-flex items-center gap-1 transition-opacity"
                            >
                              View Report
                              <span className="material-symbols-outlined text-[16px]">
                                open_in_new
                              </span>
                            </a>
                          ) : client.status === "auditing" ? (
                            <span className="text-sm text-secondary inline-flex items-center gap-2">
                              <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                              In progress
                            </span>
                          ) : (
                            <span className="text-sm text-on-surface-variant">—</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right text-sm text-on-surface-variant">
                          {formatDate(client.created_at)}
                        </td>
                      </tr>

                      {/* Expanded audit versions */}
                      {isExpanded && (
                        <tr className="bg-surface-container-lowest/50">
                          <td colSpan={5} className="px-6 py-5">
                            <div className="ml-9">
                              {versionsLoading === client.id ? (
                                <p className="text-sm text-on-surface-variant">
                                  Loading versions...
                                </p>
                              ) : clientVersions.length === 0 ? (
                                <p className="text-sm text-on-surface-variant">
                                  No audit versions found.
                                </p>
                              ) : (
                                <div>
                                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-3">
                                    Audit Versions ({clientVersions.length})
                                  </p>
                                  <div className="space-y-2">
                                    {clientVersions.map((v, idx) => {
                                      const prev = idx > 0 ? clientVersions[idx - 1] : null;
                                      const delta =
                                        prev &&
                                        v.visibility_rate != null &&
                                        prev.visibility_rate != null
                                          ? +(
                                              v.visibility_rate - prev.visibility_rate
                                            ).toFixed(1)
                                          : null;

                                      return (
                                        <div
                                          key={v.id}
                                          className="flex items-center gap-4 bg-white/5 border border-white/5 rounded-xl px-4 py-3 hover:bg-white/10 transition-colors"
                                        >
                                          <span className="text-sm font-black text-primary w-10">
                                            v{v.version}
                                          </span>
                                          <Badge
                                            tone={AUDIT_STATUS_TONE[v.status] || "neutral"}
                                          >
                                            {v.status}
                                          </Badge>
                                          <span
                                            className={`text-base font-black tracking-tighter w-16 text-right ${visibilityTone(v.visibility_rate)}`}
                                          >
                                            {v.visibility_rate != null
                                              ? `${v.visibility_rate}%`
                                              : "—"}
                                          </span>
                                          <span className="w-16 text-right text-sm">
                                            {delta != null ? (
                                              <span
                                                className={`font-bold ${
                                                  delta > 0
                                                    ? "text-primary"
                                                    : delta < 0
                                                      ? "text-error"
                                                      : "text-on-surface-variant"
                                                }`}
                                              >
                                                {delta > 0 ? "+" : ""}
                                                {delta}%
                                              </span>
                                            ) : (
                                              <span className="text-on-surface-variant">—</span>
                                            )}
                                          </span>
                                          <span className="text-xs text-on-surface-variant flex-1">
                                            {v.total_mentioned != null
                                              ? `${v.total_mentioned} / ${v.total_queries} mentions`
                                              : ""}
                                          </span>
                                          <span className="text-xs text-on-surface-variant">
                                            {v.completed_at
                                              ? formatDate(v.completed_at)
                                              : v.status === "running" || v.status === "pending"
                                                ? "Running..."
                                                : ""}
                                          </span>
                                          <button
                                            onClick={() => router.push(`/audits/${v.id}`)}
                                            className="text-xs text-primary hover:opacity-80 font-bold uppercase tracking-wider transition-opacity"
                                          >
                                            View
                                          </button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </AppShell>
  );
}
