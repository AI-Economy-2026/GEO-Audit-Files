"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/me-context";
import LogoutButton from "@/components/LogoutButton";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  hint?: string;
}

interface Group {
  label: string;
  items: NavItem[];
  /** Workspace-root links (e.g. "/audits") shouldn't stay highlighted while
   *  deep inside one specific audit's own nav group — only exact matches count. */
  exactMatchOnly?: boolean;
}

interface SidebarProps {
  auditId?: string;
}

const COLLAPSE_KEY = "gatha-sidebar-collapsed";
const EXPANDED_WIDTH = 260;
const COLLAPSED_WIDTH = 64;

/** Fixed navy sidebar matching the reference design. Mint active state.
 *  Audit-specific groups only render when auditId is provided. Collapses
 *  to an icon-only rail via local state (no shared layout files touched). */
export default function Sidebar({ auditId }: SidebarProps) {
  const pathname = usePathname();
  const { me } = useMe();
  const [collapsed, setCollapsed] = useState(false);
  const [clientName, setClientName] = useState<string | null>(null);

  // Restore the collapsed preference after mount only, so the server-rendered
  // markup (always expanded) matches the first client render and avoids a
  // hydration mismatch.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* localStorage unavailable (privacy mode, SSR) — default to expanded */
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore persistence failures */
      }
      return next;
    });
  }

  // Fetch just enough of the audit record to label the "Audit · {Client}"
  // group — AuditShell doesn't pass the brand name down to Sidebar, so this
  // is a lightweight fetch scoped to this component only.
  useEffect(() => {
    if (!auditId) {
      setClientName(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/geo-audits/${auditId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.audit?.brand_name) {
          setClientName(data.audit.brand_name as string);
        }
      })
      .catch(() => {
        /* label falls back to "Audit" below */
      });
    return () => {
      cancelled = true;
    };
  }, [auditId]);

  const workspaceGroup: Group = {
    label: "Workspace",
    exactMatchOnly: true,
    items: [
      {
        href: "/clients",
        label: "All clients",
        hint: "View every client in your workspace",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
          </svg>
        ),
      },
      {
        href: "/audits",
        label: "All audits",
        hint: "Browse every audit you've run",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3v18h18" />
            <path d="M7 14l4-4 4 4 5-5" />
          </svg>
        ),
      },
      {
        href: "/reports",
        label: "Reports",
        hint: "View, download and share every completed report",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <path d="M14 2v6h6M9 15l2 2 4-4" />
          </svg>
        ),
      },
    ],
  };

  // Single back-to-workspace link shown above the audit-scoped groups,
  // matching the "Home" item in the reference mockups.
  const homeItem: NavItem = {
    href: "/clients",
    label: "Home",
    hint: "Back to all clients",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    ),
  };

  const auditGroups: Group[] = auditId
    ? [
    {
      label: clientName ? `Audit · ${clientName}` : "Audit",
      items: [
        {
          href: `/audits/${auditId}/dashboard`,
          label: "Overview",
          hint: "Top-level visibility rank and KPIs",
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
          hint: "Every prompt tested, with engines citing you",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
            </svg>
          ),
        },
        {
          href: `/audits/${auditId}/engines`,
          label: "Engine Gaps",
          hint: "Per-engine performance and prompt-type matrix",
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
          hint: "Share-of-voice leaderboard and beat/win lists",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            </svg>
          ),
        },
        {
          href: `/audits/${auditId}/sources`,
          label: "Sources",
          hint: "Top domains AI engines cite in your category",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
            </svg>
          ),
        },
        {
          href: `/audits/${auditId}/citations`,
          label: "Citations",
          hint: "Where you're cited, and high-value places to earn citations",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 8h10M7 12h6" />
              <path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Next steps",
      items: [
        {
          href: `/audits/${auditId}/opportunity`,
          label: "Opportunity Map",
          hint: "Priority plays ranked by impact",
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
          hint: "90-day action plan with checkboxes",
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
          hint: "Movement vs baseline and previous audits",
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

  const groups: Group[] = auditId ? auditGroups : [workspaceGroup];

  return (
    <aside
      style={{
        position: "sticky",
        top: 0,
        height: "100vh",
        width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        background: "linear-gradient(180deg,rgba(14,26,45,.92),rgba(10,19,33,.92))",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRight: "1px solid var(--border)",
        padding: collapsed ? "24px 10px" : "24px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 22,
        overflowY: "auto",
        overflowX: "hidden",
        flexShrink: 0,
        transition: "width 0.18s var(--ease)",
      }}
    >
      {/* Brand + collapse toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          gap: 10,
          padding: collapsed ? "4px 0 16px" : "4px 6px 16px",
          borderBottom: "1px solid var(--border-soft)",
        }}
      >
        {!collapsed && (
          <div style={{ minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gatha-wordmark-mint.svg" alt="Gatha" style={{ height: 24, width: "auto", display: "block" }} />
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 6 }}>
              Be Seen in AI Search
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 26,
            flexShrink: 0,
            borderRadius: 8,
            border: "1px solid var(--border-soft)",
            background: "var(--surface-2)",
            color: "var(--text-3)",
            cursor: "pointer",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.18s var(--ease)" }}
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {/* Home (audit-scoped pages only) */}
      {auditId && (
        <Link
          href={homeItem.href}
          title={collapsed ? homeItem.label : undefined}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: collapsed ? "7px" : "7px 8px",
            justifyContent: collapsed ? "center" : "flex-start",
            borderRadius: 6,
            color: "var(--text-2)",
            fontWeight: 500,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <span style={{ width: 14, height: 14, flexShrink: 0, display: "inline-flex", alignItems: "center" }}>
            {homeItem.icon}
          </span>
          {!collapsed && <span>{homeItem.label}</span>}
        </Link>
      )}

      {/* Nav groups */}
      {groups.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--text-4)",
                padding: "0 12px 6px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {group.label}
            </div>
          )}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {group.items.map((item) => {
              const active = group.exactMatchOnly
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: collapsed ? "10px" : "10px 12px",
                    justifyContent: collapsed ? "center" : "flex-start",
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
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      {/* Footer: credit balance for agencies, quick-fix CTA for admins.
       *  Hidden while collapsed to keep the icon rail compact. */}
      {!collapsed && (me?.role === "agency" ? (
        <div
          style={{
            marginTop: "auto",
            padding: 16,
            borderRadius: "var(--r-md)",
            background:
              me.creditsRemaining > 0
                ? "var(--surface-2)"
                : "var(--crit-weak)",
            border: `1px solid ${me.creditsRemaining > 0 ? "var(--border-soft)" : "var(--crit-line)"}`,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--text-4)",
              marginBottom: 6,
            }}
          >
            Audit credits
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              color:
                me.creditsRemaining > 0 ? "var(--mint)" : "var(--crit)",
              marginBottom: 6,
            }}
          >
            {me.creditsRemaining}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12 }}>
            {me.creditsRemaining > 0
              ? `${me.creditsUsed} used so far`
              : "No credits left. Ask your admin to top up"}
          </div>
          <a
            className="btn btn-sm"
            style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
            href={`mailto:hello@gatha.ai?subject=${encodeURIComponent(
              `Credit top-up request: ${me.agencyName || me.email}`
            )}&body=${encodeURIComponent(
              `Hi, can I top up audit credits for ${me.agencyName || me.email}? Currently at ${me.creditsRemaining}.`
            )}`}
          >
            Request top-up
          </a>
        </div>
      ) : (
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
          <a
            className="btn btn-primary btn-sm"
            style={{ width: "100%", justifyContent: "center", textDecoration: "none" }}
            href="mailto:hello@gatha.ai?subject=Quick%20fixes%20-%20get%20us%20a%20hand"
          >
            Get the quick fixes done
          </a>
        </div>
      ))}

      {/* Logout — pinned to the bottom when the footer cards are hidden. */}
      <div style={collapsed ? { marginTop: "auto" } : undefined}>
        <LogoutButton />
      </div>
    </aside>
  );
}
