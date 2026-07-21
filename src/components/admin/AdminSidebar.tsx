"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";

interface NavItem {
  href: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
}

const NAV: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    hint: "Workspace KPIs: total agencies, credits issued, audits run",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </svg>
    ),
  },
  {
    href: "/admin/agencies",
    label: "Agencies",
    hint: "Manage agency accounts, credits and access",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
];

/** Admin-flavoured sidebar: same theme as agency Sidebar, different nav. */
export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: 260,
        background: "linear-gradient(180deg,rgba(14,26,45,.92),rgba(10,19,33,.92))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid var(--border)",
        padding: "24px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        overflowY: "auto",
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "4px 6px 16px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gatha-wordmark-mint.svg" alt="Gatha" style={{ height: 24, width: "auto", display: "block" }} />
          <div style={{ fontSize: 10, color: "var(--mint)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>
            Admin Console
          </div>
        </div>
      </div>

      {/* Nav group */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--text-4)",
            padding: "0 12px 6px",
          }}
        >
          Manage
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  color: active ? "var(--mint)" : "var(--text-2)",
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  textDecoration: "none",
                  background: active ? "var(--mint-weak)" : "transparent",
                  border: `1px solid ${active ? "var(--mint-line)" : "transparent"}`,
                  transition: "all 0.18s var(--ease)",
                }}
              >
                <span style={{ width: 16, height: 16, flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            padding: 16,
            borderRadius: "var(--r-md)",
            background: "var(--surface-2)",
            border: "1px solid var(--border-soft)",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            Logged in as admin
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5 }}>
            Agencies log in at the same URL; middleware routes them away from /admin automatically.
          </div>
        </div>

        <LogoutButton />
      </div>
    </aside>
  );
}
