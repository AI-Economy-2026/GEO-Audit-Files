"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface Group {
  label: string;
  items: NavItem[];
}

interface SidebarProps {
  auditId?: string;
}

/** Fixed navy sidebar matching the reference design. Mint active state.
 *  Audit-specific groups only render when auditId is provided. */
export default function Sidebar({ auditId }: SidebarProps) {
  const pathname = usePathname();

  const workspaceGroup: Group = {
    label: "Workspace",
    items: [
      {
        href: "/clients",
        label: "All clients",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
          </svg>
        ),
      },
      {
        href: "/audits",
        label: "All audits",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-5" />
          </svg>
        ),
      },
    ],
  };

  const auditGroups: Group[] = auditId
    ? [
    {
      label: "Audit",
      items: [
        {
          href: `/audits/${auditId}/dashboard`,
          label: "Overview",
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
          href: `/audits/${auditId}/prompts`,
          label: "Prompt Analysis",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          ),
        },
        {
          href: `/audits/${auditId}/engines`,
          label: "Engine Gaps",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3a15 15 0 010 18M12 3a15 15 0 000 18" />
            </svg>
          ),
        },
        {
          href: `/audits/${auditId}/competitors`,
          label: "Competitors",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Take action",
      items: [
        {
          href: `/audits/${auditId}/opportunity`,
          label: "Opportunity Map",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
            </svg>
          ),
        },
        {
          href: `/audits/${auditId}/activate`,
          label: "Prioritise & Activate",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Measure",
      items: [
        {
          href: `/audits/${auditId}/tracker`,
          label: "Tracker",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          ),
        },
      ],
    },
      ]
    : [];

  const groups: Group[] = [workspaceGroup, ...auditGroups];

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
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "linear-gradient(135deg, var(--mint), var(--mint-2))",
            display: "grid",
            placeItems: "center",
            color: "#052822",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            fontSize: 14,
            boxShadow: "0 6px 18px rgba(94,234,212,.28)",
            flexShrink: 0,
          }}
        >
          AI
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em", lineHeight: 1.15 }}>
            AI Search Visibility
          </div>
          <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>
            Rank
          </div>
        </div>
      </div>

      {/* Nav groups */}
      {groups.map((group) => (
        <div key={group.label}>
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
            {group.label}
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
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
      ))}

      {/* Footer CTA */}
      <div
        style={{
          marginTop: "auto",
          padding: 16,
          borderRadius: "var(--r-md)",
          background: "var(--surface-2)",
          border: "1px solid var(--border-soft)",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
          Want a hand getting started?
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.5, marginBottom: 12 }}>
          We can tackle the quick fixes for you so you&rsquo;re in the right shape to move on the rest.
        </div>
        <button className="btn btn-primary btn-sm" style={{ width: "100%", justifyContent: "center" }}>
          Get the quick fixes done
        </button>
      </div>
    </aside>
  );
}
