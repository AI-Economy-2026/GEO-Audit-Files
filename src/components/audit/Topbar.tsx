"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Tooltip from "./Tooltip";

interface TopbarProps {
  auditId: string;
  brandName: string;
}

export default function Topbar({ auditId, brandName }: TopbarProps) {
  const router = useRouter();

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
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tooltip label="Open the browser print dialog to save the current view as PDF">
          <button className="btn btn-sm" onClick={() => window.print()}>
            Export PDF
          </button>
        </Tooltip>
        <Tooltip label="Re-run this audit with the latest engine data">
          <button
            className="btn btn-sm btn-primary"
            onClick={() => router.push(`/audits/${auditId}`)}
          >
            Re-audit
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
