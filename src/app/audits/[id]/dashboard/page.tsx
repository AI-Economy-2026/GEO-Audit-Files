"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DashboardPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [dashboardUrl, setDashboardUrl] = useState<string | null>(null);
  const [dashboardHtml, setDashboardHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/geo-audits/${id}`);
      const data = await res.json();
      if (data.audit?.dashboard_url) {
        setDashboardUrl(data.audit.dashboard_url);
        try {
          const htmlRes = await fetch(data.audit.dashboard_url);
          const html = await htmlRes.text();
          setDashboardHtml(html);
        } catch (err) {
          console.error("Failed to fetch dashboard HTML:", err);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F1F5F9" }}
      >
        <p style={{ color: "#64748B" }}>Loading dashboard...</p>
      </div>
    );
  }

  if (!dashboardUrl) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#F1F5F9" }}
      >
        <p style={{ color: "#64748B" }}>Dashboard not available yet.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#F1F5F9" }}>
      <div
        className="px-6 py-3 flex items-center justify-between sticky top-0 z-50"
        style={{
          background: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <button
          onClick={() => router.push(`/audits/${id}`)}
          className="text-sm inline-flex items-center gap-2 transition-colors"
          style={{ color: "#334155" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#004AAD")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to Audit
        </button>
        <a
          href={dashboardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm inline-flex items-center gap-2 font-bold transition-opacity hover:opacity-80"
          style={{ color: "#004AAD" }}
        >
          Open in New Tab
          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
        </a>
      </div>

      {dashboardHtml ? (
        <iframe
          srcDoc={dashboardHtml}
          className="w-full border-0"
          style={{ height: "calc(100vh - 48px)" }}
          title="GEO Audit Dashboard"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <iframe
          src={dashboardUrl}
          className="w-full border-0"
          style={{ height: "calc(100vh - 48px)" }}
          title="GEO Audit Dashboard"
        />
      )}
    </div>
  );
}
