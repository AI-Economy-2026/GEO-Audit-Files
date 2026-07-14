"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import InfoTip from "@/components/audit/InfoTip";

interface Stats {
  totalAgencies: number;
  activeAgencies: number;
  suspendedAgencies: number;
  totalCreditsRemaining: number;
  totalCreditsUsed: number;
  totalAudits: number;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/stats");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load stats");
        setStats(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stats");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Makes a KPI card drill into the relevant admin view (keyboard + click).
  const drill = (path: string) => ({
    className: "kpi clickable",
    role: "button" as const,
    tabIndex: 0,
    onClick: () => router.push(path),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        router.push(path);
      }
    },
  });

  return (
    <AdminShell
      title="Overview"
      actions={
        <button
          className="btn btn-sm btn-primary"
          onClick={() => router.push("/admin/agencies/new")}
        >
          New agency
        </button>
      }
    >
      <div className="page-head">
        <div>
          <h1>Workspace overview</h1>
          <p>Top-level numbers across every agency in this Gatha deployment.</p>
        </div>
      </div>

      {loading ? (
        <div className="card pad-lg" style={{ textAlign: "center", color: "var(--text-3)" }}>
          Loading stats...
        </div>
      ) : error ? (
        <div
          className="card pad-lg"
          style={{ borderColor: "var(--crit-line)", background: "var(--crit-weak)", color: "var(--text-2)" }}
        >
          {error}
        </div>
      ) : stats ? (
        <>
          <div className="kpi-strip">
            <div {...drill("/admin/agencies")}>
              <div className="kpi-label">
                <InfoTip label="Number of agencies in this workspace. Each agency can run audits using their credit pool.">
                  Agencies
                </InfoTip>
              </div>
              <div className="kpi-number">{stats.totalAgencies}</div>
              <div className="kpi-sub">
                {stats.activeAgencies} active
                {stats.suspendedAgencies > 0 ? `, ${stats.suspendedAgencies} suspended` : ""}
              </div>
            </div>
            <div {...drill("/admin/agencies")}>
              <div className="kpi-label">
                <InfoTip label="Credits available across every agency right now. Each audit costs 1 credit.">
                  Credits available
                </InfoTip>
              </div>
              <div className="kpi-number num-good">{stats.totalCreditsRemaining}</div>
              <div className="kpi-sub">issued, unspent</div>
            </div>
            <div {...drill("/admin/agencies")}>
              <div className="kpi-label">
                <InfoTip label="Credits spent on completed and in-progress audits across every agency.">
                  Credits spent
                </InfoTip>
              </div>
              <div className="kpi-number">{stats.totalCreditsUsed}</div>
              <div className="kpi-sub">total spend</div>
            </div>
            <div {...drill("/admin/agencies")}>
              <div className="kpi-label">
                <InfoTip label="Audits ever run on this deployment (across all agencies, all versions).">
                  Audits run
                </InfoTip>
              </div>
              <div className="kpi-number">{stats.totalAudits}</div>
              <div className="kpi-sub">all-time</div>
            </div>
          </div>

          <div className="section">
            <div className="section-head">
              <div>
                <h2>Next steps</h2>
                <div className="sub">Common admin actions.</div>
              </div>
            </div>
            <div className="grid-3">
              <div className="card pad-lg">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>
                  Invite an agency
                </h3>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>
                  Email + brand + initial credit allowance. They get a magic-link to set their password.
                </p>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => router.push("/admin/agencies/new")}
                >
                  Invite agency
                </button>
              </div>
              <div className="card pad-lg">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>
                  Manage credits
                </h3>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>
                  Add or revoke credits per agency. Useful when topping up a paid plan.
                </p>
                <button
                  className="btn btn-sm"
                  onClick={() => router.push("/admin/agencies")}
                >
                  Open agency list
                </button>
              </div>
              <div className="card pad-lg">
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, margin: "0 0 8px" }}>
                  Suspend / restore
                </h3>
                <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--text-3)", lineHeight: 1.5 }}>
                  Block an agency from starting new audits without deleting their data.
                </p>
                <button
                  className="btn btn-sm"
                  onClick={() => router.push("/admin/agencies")}
                >
                  Open agency list
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </AdminShell>
  );
}
