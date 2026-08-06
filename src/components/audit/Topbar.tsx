"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Tooltip from "./Tooltip";

interface TopbarProps {
  auditId: string;
  brandName: string;
}

export default function Topbar({ auditId, brandName }: TopbarProps) {
  const router = useRouter();
  const [reAuditLoading, setReAuditLoading] = useState(false);
  const [reAuditError, setReAuditError] = useState<string | null>(null);

  /* Trigger a real re-audit: clones this audit, starts the worker, opens the new run. */
  async function handleReAudit() {
    setReAuditLoading(true);
    setReAuditError(null);
    try {
      const res = await fetch(`/api/geo-audits/${auditId}/re-audit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start re-audit.");
      router.push(`/audits/${data.audit_id}`);
    } catch (err) {
      setReAuditError(err instanceof Error ? err.message : "Failed to start re-audit.");
      setReAuditLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 16,
        marginBottom: 28,
        paddingBottom: 18,
        borderBottom: "1px solid var(--border-soft)",
      }}
    >
      {/* Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-3)" }}>
        <Link href="/clients" style={{ color: "var(--text-3)", textDecoration: "none" }}>
          Clients
        </Link>
        <span style={{ color: "var(--text-4)" }}>/</span>
        <strong style={{ color: "var(--text-2)", fontWeight: 600 }}>{brandName}</strong>
        <span style={{ color: "var(--text-4)" }}>/</span>
        <span>
          Visibility audit{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-4)" }}>
            #V-{auditId.slice(0, 4).toUpperCase()}
          </span>
        </span>
      </div>

      {/* Actions */}
      <div className="no-print" style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
        <Tooltip label="Open the browser print dialog to save the current view as PDF">
          <button className="btn btn-sm" onClick={() => window.print()}>
            Export PDF
          </button>
        </Tooltip>
        <Tooltip label="Re-run this audit with the latest engine data">
          <button
            className="btn btn-sm btn-primary"
            onClick={handleReAudit}
            disabled={reAuditLoading}
          >
            {reAuditLoading ? "Starting..." : "Re-audit"}
          </button>
        </Tooltip>
        {reAuditError && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: "var(--r-md)",
              background: "var(--crit-weak)",
              border: "1px solid var(--crit-line)",
              color: "var(--text-2)",
              fontSize: 12,
              whiteSpace: "nowrap",
              zIndex: 10,
            }}
          >
            {reAuditError}
          </div>
        )}
      </div>
    </div>
  );
}
