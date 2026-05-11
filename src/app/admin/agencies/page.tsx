"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";

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

  return (
    <AdminShell
      title="Agencies"
      actions={
        <button className="btn btn-sm btn-primary" onClick={() => router.push("/admin/agencies/new")}>
          New agency
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>Agencies</h1>
          <p>Every agency in this workspace, with their credit balance and audit activity.</p>
        </div>
      </div>

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
              <h3>Agency roster</h3>
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
    </AdminShell>
  );
}
