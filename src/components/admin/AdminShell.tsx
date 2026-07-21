"use client";

import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";

interface Props {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

/** Navy admin shell: same look as WorkspaceShell, but with the admin
 *  sidebar and an "ADMIN" badge in the topbar so it's never confused
 *  with the agency console. */
export default function AdminShell({ title, actions, children }: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <AdminSidebar />
      <main style={{ padding: "28px 36px 60px", minWidth: 0 }}>
        <div
          className="no-print"
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
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--mint)",
                background: "var(--mint-weak)",
                border: "1px solid var(--mint-line)",
                padding: "3px 8px",
                borderRadius: 999,
              }}
            >
              Admin
            </span>
            <strong style={{ color: "var(--text-2)", fontWeight: 600, fontSize: 13 }}>{title}</strong>
          </div>
          {actions && <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{actions}</div>}
        </div>
        {children}
      </main>
    </div>
  );
}
