"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import Tooltip from "@/components/audit/Tooltip";

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

interface AuditRow {
  id: string;
  brand_name: string;
  brand_url: string;
  status: string;
  visibility_rate: number | null;
  engines: string[];
  created_at: string;
  completed_at: string | null;
}

interface ClientRow {
  id: string;
  name: string;
  url: string;
  status: string;
  intake_token: string;
  report_slug: string | null;
  audit_id: string | null;
  intake_completed_at: string | null;
  created_at: string;
}

const STATUS_CHIP: Record<string, string> = {
  pending: "chip-neutral",
  running: "chip-info",
  completed: "chip-good",
  failed: "chip-crit",
  cancelled: "chip-neutral",
};

const CLIENT_STATUS_CHIP: Record<string, string> = {
  pending_intake: "chip-neutral",
  intake_complete: "chip-info",
  audit_complete: "chip-good",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function getOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export default function AgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creditDelta, setCreditDelta] = useState<number>(0);
  const [editName, setEditName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/agencies/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load agency");
        setAgency(data.agency);
        setAudits(data.audits || []);
        setClients(data.clients || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load agency");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function patch(body: Record<string, unknown>, op: string) {
    setBusy(op);
    setError(null);
    try {
      const res = await fetch(`/api/admin/agencies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      setAgency((prev) => (prev ? { ...prev, ...data.agency } : data.agency));
      setCreditDelta(0);
      setEditName(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Agencies → …">
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          Loading agency...
        </div>
      </AdminShell>
    );
  }

  if (!agency) {
    return (
      <AdminShell title="Agencies → Not found">
        <div className="card pad-lg" style={{ borderColor: "var(--crit-line)", background: "var(--crit-weak)" }}>
          {error || "Agency not found."}
        </div>
      </AdminShell>
    );
  }

  const origin = getOrigin();

  return (
    <AdminShell
      title={`Agencies → ${agency.agency_name || agency.email}`}
      actions={
        <button className="btn btn-sm" onClick={() => router.push("/admin/agencies")}>
          ← All agencies
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>{agency.agency_name || "(unnamed agency)"}</h1>
          <p style={{ fontFamily: "var(--font-mono)" }}>{agency.email}</p>
        </div>
        <div className="actions">
          <span className={`chip chip-${agency.status === "active" ? "good" : "crit"} chip-lg`}>
            {agency.status}
          </span>
        </div>
      </div>

      <div className="kpi-strip">
        <div className="kpi">
          <div className="kpi-label">Credits remaining</div>
          <div className={`kpi-number num-${agency.credits_remaining > 0 ? "good" : "crit"}`}>
            {agency.credits_remaining}
          </div>
          <div className="kpi-sub">available to spend</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Credits spent</div>
          <div className="kpi-number">{agency.credits_used}</div>
          <div className="kpi-sub">across audits</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Audits run</div>
          <div className="kpi-number">{agency.audits_run}</div>
          <div className="kpi-sub">all-time</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Clients</div>
          <div className="kpi-number">{clients.length}</div>
          <div className="kpi-sub">intake tokens issued</div>
        </div>
      </div>

      {error && (
        <div
          className="card pad"
          style={{ borderColor: "var(--crit-line)", background: "var(--crit-weak)", color: "var(--text-2)", marginBottom: 18 }}
        >
          {error}
        </div>
      )}

      {/* Agency name edit */}
      <div className="section">
        <div className="card pad-lg" style={{ maxWidth: 560 }}>
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Agency name</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 14 }}>
            Update the display name shown across the admin panel.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label htmlFor="agency-name-input" className="sr-only">
              Agency name
            </label>
            <input
              id="agency-name-input"
              type="text"
              value={editName ?? (agency.agency_name || "")}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Balmer Agency"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "var(--r-md)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                fontFamily: "var(--font-body)",
              }}
            />
            <button
              className="btn btn-sm btn-primary"
              disabled={!!busy || !editName || editName.trim() === (agency.agency_name || "")}
              onClick={() => patch({ agency_name: (editName ?? "").trim() }, "name")}
            >
              {busy === "name" ? "..." : "Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Credit + Access management */}
      <div className="grid-half section">
        <div className="card pad-lg">
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Adjust credits</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 18 }}>
            Top up or revoke credits. Positive = add, negative = revoke. Floors at 0.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <label htmlFor="credit-delta-input" className="sr-only">
              Credit adjustment amount
            </label>
            <input
              id="credit-delta-input"
              type="number"
              value={creditDelta}
              onChange={(e) => setCreditDelta(parseInt(e.target.value || "0", 10))}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "var(--r-md)",
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                fontFamily: "var(--font-body)",
              }}
            />
            <Tooltip label="Apply this signed delta to the credit balance">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => patch({ credit_delta: creditDelta }, "credit_delta")}
                disabled={!!busy || creditDelta === 0}
              >
                {busy === "credit_delta" ? "..." : "Apply"}
              </button>
            </Tooltip>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[1, 4, 12, -1].map((n) => (
              <button
                key={n}
                className="btn btn-sm"
                onClick={() => setCreditDelta(creditDelta + n)}
                disabled={!!busy}
              >
                {n > 0 ? `+${n}` : n}
              </button>
            ))}
          </div>
        </div>

        <div className="card pad-lg">
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Access</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 18 }}>
            Suspend to block new audits without deleting any data.
          </p>
          {agency.status === "active" ? (
            <Tooltip label="Block this agency from starting new audits. Their existing data stays intact.">
              <button
                className="btn btn-sm"
                style={{ borderColor: "var(--crit-line)", color: "var(--crit)" }}
                onClick={() => patch({ status: "suspended" }, "suspend")}
                disabled={!!busy}
              >
                {busy === "suspend" ? "..." : "Suspend agency"}
              </button>
            </Tooltip>
          ) : (
            <Tooltip label="Restore the agency's ability to start new audits.">
              <button
                className="btn btn-sm btn-primary"
                onClick={() => patch({ status: "active" }, "restore")}
                disabled={!!busy}
              >
                {busy === "restore" ? "..." : "Restore agency"}
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Audit list */}
      <div className="section">
        <div className="table-wrap">
          <div className="table-head-bar">
            <div>
              <h3>Audit history</h3>
              <div className="sub">All audits run by this agency, latest first.</div>
            </div>
          </div>
          {audits.length === 0 ? (
            <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
              No audits yet.
            </div>
          ) : (
            <div className="scroll">
              <table className="data" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Brand</th>
                    <th className="center">Status</th>
                    <th className="center">Visibility</th>
                    <th className="center">Engines</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{a.brand_name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                          {a.brand_url}
                        </div>
                      </td>
                      <td className="center">
                        <span className={`chip ${STATUS_CHIP[a.status] || "chip-neutral"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="center">
                        {a.visibility_rate != null ? (
                          <span className="num-big">{a.visibility_rate}<span style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>%</span></span>
                        ) : (
                          <span style={{ color: "var(--text-3)" }}>—</span>
                        )}
                      </td>
                      <td className="center" style={{ color: "var(--text-2)" }}>
                        {a.engines?.length || 0}
                      </td>
                      <td style={{ color: "var(--text-3)" }}>{formatDate(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Client / intake token list */}
      <div className="section">
        <div className="table-wrap">
          <div className="table-head-bar">
            <div>
              <h3>Clients & intake tokens</h3>
              <div className="sub">Intake links this agency has issued to their clients.</div>
            </div>
          </div>
          {clients.length === 0 ? (
            <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
              No clients yet.
            </div>
          ) : (
            <div className="scroll">
              <table className="data" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th className="center">Status</th>
                    <th>Intake link</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                          {c.url}
                        </div>
                      </td>
                      <td className="center">
                        <span className={`chip ${CLIENT_STATUS_CHIP[c.status] || "chip-neutral"}`}>
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            color: "var(--text-3)",
                            wordBreak: "break-all",
                          }}
                        >
                          {origin}/intake/{c.intake_token}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-3)" }}>{formatDate(c.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div className="section">
        <div
          className="card pad-lg"
          style={{ borderColor: "var(--crit-line)", maxWidth: 560 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "0 0 4px" }}>
            <h2 style={{ fontSize: 18, margin: 0 }}>Danger zone</h2>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--crit)",
                background: "var(--crit-weak)",
                border: "1px solid var(--crit-line)",
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              Caution
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 18 }}>
            Permanently delete this agency, their clients, audits, and login. This cannot be undone.
          </p>
          {!confirmDelete ? (
            <button
              className="btn btn-sm"
              style={{ borderColor: "var(--crit-line)", color: "var(--crit)" }}
              onClick={() => setConfirmDelete(true)}
              disabled={!!busy}
            >
              Delete agency
            </button>
          ) : (
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--crit)", marginBottom: 14 }}>
                Are you sure? All audits, clients, and login access will be deleted permanently.
              </p>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn btn-sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy === "delete"}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-sm"
                  style={{ background: "var(--crit)", borderColor: "var(--crit)", color: "#fff" }}
                  disabled={busy === "delete"}
                  onClick={async () => {
                    setBusy("delete");
                    setError(null);
                    try {
                      const res = await fetch(`/api/admin/agencies/${id}`, { method: "DELETE" });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Delete failed");
                      router.push("/admin/agencies");
                    } catch (e) {
                      setError(e instanceof Error ? e.message : "Delete failed");
                      setBusy(null);
                      setConfirmDelete(false);
                    }
                  }}
                >
                  {busy === "delete" ? "Deleting..." : "Yes, delete permanently"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
