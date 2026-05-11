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

export default function AgencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [agency, setAgency] = useState<Agency | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [creditDelta, setCreditDelta] = useState<number>(0);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/admin/agencies/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load agency");
        setAgency(data.agency);
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
          <div className="kpi-label">Status</div>
          <div className={`kpi-number num-${agency.status === "active" ? "good" : "crit"}`} style={{ fontSize: 28 }}>
            {agency.status === "active" ? "Active" : "Suspended"}
          </div>
          <div className="kpi-sub">{agency.status === "active" ? "can start new audits" : "blocked from new audits"}</div>
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

      <div className="grid-half section">
        <div className="card pad-lg">
          <h2 style={{ fontSize: 18, margin: "0 0 4px" }}>Adjust credits</h2>
          <p style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 18 }}>
            Top up or revoke credits. Positive = add, negative = revoke. Floors at 0.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
            <input
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
    </AdminShell>
  );
}
