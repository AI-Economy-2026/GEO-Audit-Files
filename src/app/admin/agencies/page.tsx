"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface Agency {
  id: string;
  email: string;
  agency_name: string | null;
  contact_name: string | null;
  credits_remaining: number;
  credits_used: number;
  status: "active" | "suspended";
  created_at: string;
  audits_run: number;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export default function AgenciesListPage() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/agencies");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load agencies");
        setAgencies(data.agencies || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load agencies");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleDelete(agencyId: string) {
    setBusyId(agencyId);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/agencies/${agencyId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setAgencies((prev) => prev.filter((a) => a.id !== agencyId));
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
      setConfirmDeleteId(null);
    }
  }

  return (
    <AdminShell
      title="Network"
      actions={
        <button className="btn btn-sm btn-primary" onClick={() => router.push("/admin/agencies/new")}>
          New agency
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>Network</h1>
          <p>Every agency in this workspace, with their credit balance and audit activity.</p>
        </div>
      </div>

      {deleteError && (
        <div
          className="card pad"
          style={{ borderColor: "var(--crit-line)", background: "var(--crit-weak)", color: "var(--text-2)", marginBottom: 18 }}
        >
          {deleteError}
        </div>
      )}

      {loading ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          Loading agencies...
        </div>
      ) : error ? (
        <div className="card pad-lg" style={{ borderColor: "var(--crit-line)", background: "var(--crit-weak)", color: "var(--text-2)" }}>
          {error}
        </div>
      ) : agencies.length === 0 ? (
        <div className="card pad-lg" style={{ textAlign: "center" }}>
          <div style={{ color: "var(--text-3)", marginBottom: 16 }}>
            No agencies yet. Invite your first one to get them onto the platform.
          </div>
          <button className="btn btn-primary" onClick={() => router.push("/admin/agencies/new")}>
            Invite an agency
          </button>
        </div>
      ) : (
        <div className="table-wrap">
          <div className="table-head-bar">
            <div>
              <h3>Dashboard</h3>
              <div className="sub">Click a row to manage credits and access.</div>
            </div>
          </div>
          <div className="scroll">
            <table className="data" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  <th>Agency</th>
                  <th className="center">Credits</th>
                  <th className="center">Spent</th>
                  <th className="center">Audits</th>
                  <th className="center">Status</th>
                  <th>Added</th>
                  <th>Actions</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {agencies.map((a) => (
                  <tr
                    key={a.id}
                    className="clickable"
                    onClick={() => router.push(`/admin/agencies/${a.id}`)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--text)" }}>
                        {a.agency_name || "(unnamed)"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                        {a.email}
                      </div>
                    </td>
                    <td className="center">
                      <span className={`num-big num-${a.credits_remaining > 0 ? "good" : "crit"}`}>
                        {a.credits_remaining}
                      </span>
                    </td>
                    <td className="center" style={{ color: "var(--text-2)" }}>
                      {a.credits_used}
                    </td>
                    <td className="center" style={{ color: "var(--text-2)" }}>
                      {a.audits_run}
                    </td>
                    <td className="center">
                      <span className={`chip ${a.status === "active" ? "chip-good" : "chip-crit"}`}>
                        {a.status}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-3)" }}>{formatDate(a.created_at)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <button
                          title="Edit"
                          aria-label="Edit agency"
                          onClick={() => router.push(`/admin/agencies/${a.id}`)}
                          style={{
                            background: "transparent",
                            border: 0,
                            padding: 4,
                            cursor: "pointer",
                            color: "var(--text-3)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          title="Delete"
                          aria-label="Delete agency"
                          onClick={() => setConfirmDeleteId(a.id)}
                          style={{
                            background: "transparent",
                            border: 0,
                            padding: 4,
                            cursor: "pointer",
                            color: "var(--crit)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-3)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        Manage
                        <span className="row-chevron" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                            <polyline points="9 6 15 12 9 18" />
                          </svg>
                        </span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete agency"
        message={
          <>
            Permanently delete{" "}
            <strong>{agencies.find((a) => a.id === confirmDeleteId)?.agency_name || "this agency"}</strong>
            ? All their clients, audits, and login access will be deleted. This cannot be undone.
          </>
        }
        confirmLabel="Yes, delete"
        danger
        busy={busyId === confirmDeleteId}
        onConfirm={() => confirmDeleteId && handleDelete(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </AdminShell>
  );
}
