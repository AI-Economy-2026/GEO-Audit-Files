"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

interface AuditShellProps {
  auditId: string;
  brandName: string;
  children: ReactNode;
}

/**
 * Shared layout for all audit tab pages: fixed navy sidebar + topbar + main content area.
 * Matches the reference HTML's sidebar + topbar structure exactly.
 */
export default function AuditShell({ auditId, brandName, children }: AuditShellProps) {
  return (
    <div className="audit-shell" style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <Sidebar auditId={auditId} />
      <main style={{ padding: "28px 36px 60px", minWidth: 0 }}>
        <Topbar auditId={auditId} brandName={brandName} />
        {children}
      </main>
    </div>
  );
}
