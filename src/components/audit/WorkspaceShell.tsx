"use client";

import { ReactNode } from "react";
import Sidebar from "./Sidebar";

interface WorkspaceShellProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Navy shell for workspace-level pages (audits list, clients list).
 *  Same Sidebar as audit pages, simpler topbar with no breadcrumb. */
export default function WorkspaceShell({ title, actions, children }: WorkspaceShellProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ padding: "28px 36px 60px", minWidth: 0 }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-3)" }}>
            <strong style={{ color: "var(--text-2)", fontWeight: 600 }}>{title}</strong>
          </div>
          {actions && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
