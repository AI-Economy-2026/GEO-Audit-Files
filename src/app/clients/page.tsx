"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

const STATUS_COLORS: Record<string, string> = {
  pending_intake: "bg-yellow-100 text-yellow-800",
  intake_completed: "bg-blue-100 text-blue-800",
  auditing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  pending_intake: "Awaiting Intake",
  intake_completed: "Intake Done",
  auditing: "Auditing",
  completed: "Completed",
  failed: "Failed",
};

const AUDIT_STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-600",
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
    fetchClients();
  }, []);

  async function fetchClients() {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data.clients || []);
    setLoading(false);
  }

  const fetchVersions = useCallback(async (auditId: string, clientId: string) => {
    if (versions[clientId]) return; // already loaded
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
  }, [versions]);

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

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">GEO Audit</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/audits")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Audits
            </button>
            <button
              onClick={() => router.push("/clients/new")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              + Add Client
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Clients</h2>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No clients yet
            </h3>
            <p className="text-gray-500 mb-6">
              Add a client to generate their AI visibility audit intake link.
            </p>
            <button
              onClick={() => router.push("/clients/new")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Add Your First Client
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Client
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Intake Link
                  </th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">
                    Report
                  </th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clients.map((client) => {
                  const isExpanded = expandedClient === client.id;
                  const clientVersions = versions[client.id] || [];
                  const hasAudit = !!client.audit_id;

                  return (
                    <Fragment key={client.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {hasAudit && (
                              <button
                                onClick={() => toggleExpand(client)}
                                className="text-gray-400 hover:text-gray-600 transition-transform"
                                title="Show audit versions"
                              >
                                <svg
                                  className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                            <div>
                              <div className="font-medium text-gray-900">
                                {client.name}
                              </div>
                              <div className="text-sm text-gray-500">{client.url}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[client.status] || "bg-gray-100 text-gray-600"}`}
                          >
                            {STATUS_LABELS[client.status] || client.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => copyIntakeLink(client.intake_token)}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            {copied === client.intake_token
                              ? "Copied!"
                              : "Copy Link"}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {client.status === "completed" ? (
                            <a
                              href={`/report/${client.report_slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-green-600 hover:text-green-800 font-medium"
                            >
                              View Report
                            </a>
                          ) : client.status === "auditing" ? (
                            <span className="text-sm text-purple-500">
                              In progress...
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                          {formatDate(client.created_at)}
                        </td>
                      </tr>

                      {/* Expanded audit versions */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={5} className="px-0 py-0">
                            <div className="bg-gray-50 border-t border-b border-gray-200 px-6 py-4 ml-10">
                              {versionsLoading === client.id ? (
                                <p className="text-sm text-gray-400">Loading versions...</p>
                              ) : clientVersions.length === 0 ? (
                                <p className="text-sm text-gray-400">No audit versions found.</p>
                              ) : (
                                <div>
                                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                    Audit Versions ({clientVersions.length})
                                  </p>
                                  <div className="space-y-2">
                                    {clientVersions.map((v, idx) => {
                                      const prev = idx > 0 ? clientVersions[idx - 1] : null;
                                      const delta =
                                        prev && v.visibility_rate != null && prev.visibility_rate != null
                                          ? +(v.visibility_rate - prev.visibility_rate).toFixed(1)
                                          : null;

                                      return (
                                        <div
                                          key={v.id}
                                          className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg px-4 py-3"
                                        >
                                          {/* Version badge */}
                                          <span className="text-sm font-bold text-blue-600 w-8">
                                            v{v.version}
                                          </span>

                                          {/* Status */}
                                          <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${AUDIT_STATUS_COLORS[v.status] || "bg-gray-100 text-gray-600"}`}
                                          >
                                            {v.status}
                                          </span>

                                          {/* Visibility */}
                                          <span className="text-sm text-gray-700 w-16 text-right">
                                            {v.visibility_rate != null ? (
                                              <span className={
                                                v.visibility_rate >= 50
                                                  ? "text-green-600 font-bold"
                                                  : v.visibility_rate >= 25
                                                    ? "text-orange-500 font-bold"
                                                    : "text-red-500 font-bold"
                                              }>
                                                {v.visibility_rate}%
                                              </span>
                                            ) : (
                                              <span className="text-gray-400">&mdash;</span>
                                            )}
                                          </span>

                                          {/* Delta */}
                                          <span className="text-sm w-16 text-right">
                                            {delta != null ? (
                                              <span
                                                className={`font-semibold ${
                                                  delta > 0
                                                    ? "text-green-600"
                                                    : delta < 0
                                                      ? "text-red-600"
                                                      : "text-gray-400"
                                                }`}
                                              >
                                                {delta > 0 ? "+" : ""}
                                                {delta}%
                                              </span>
                                            ) : (
                                              <span className="text-gray-300">&mdash;</span>
                                            )}
                                          </span>

                                          {/* Mentions */}
                                          <span className="text-xs text-gray-500 flex-1">
                                            {v.total_mentioned != null
                                              ? `${v.total_mentioned} / ${v.total_queries} mentions`
                                              : ""}
                                          </span>

                                          {/* Date */}
                                          <span className="text-xs text-gray-400">
                                            {v.completed_at
                                              ? formatDate(v.completed_at)
                                              : v.status === "running" || v.status === "pending"
                                                ? "Running..."
                                                : ""}
                                          </span>

                                          {/* Link to audit detail */}
                                          <button
                                            onClick={() => router.push(`/audits/${v.id}`)}
                                            className="text-xs text-blue-500 hover:text-blue-700 font-medium"
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
        )}
      </main>
    </div>
  );
}
