"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import TopNav from "@/components/ui/TopNav";
import GlassCard from "@/components/ui/GlassCard";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface Audit {
  id: string;
  brand_name: string;
  brand_url: string;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  engines: string[];
  created_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  parent_audit_id?: string | null;
  version?: number;
}

type Tone = "primary" | "secondary" | "error" | "neutral" | "success";

const STATUS_TONE: Record<string, Tone> = {
  pending: "secondary",
  running: "primary",
  completed: "success",
  failed: "error",
  cancelled: "neutral",
};

export default function AuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchAudits();
  }, []);

  async function fetchAudits() {
    const res = await fetch("/api/geo-audits");
    const data = await res.json();
    setAudits(data.audits || []);
    setLoading(false);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDuration(seconds: number | null) {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }

  function visibilityTone(rate: number | null): string {
    if (rate == null) return "text-on-surface-variant";
    if (rate >= 50) return "text-primary";
    if (rate >= 25) return "text-secondary";
    return "text-error";
  }

  const totalAudits = audits.length;
  const completed = audits.filter((a) => a.status === "completed").length;
  const running = audits.filter((a) => a.status === "running" || a.status === "pending").length;
  const avgVisibility = audits
    .filter((a) => a.visibility_rate != null)
    .reduce((sum, a, _, arr) => sum + (a.visibility_rate || 0) / arr.length, 0);

  return (
    <AppShell
      topNav={
        <TopNav
          brand="GEO Audit Pro"
          tabs={[
            { href: "/audits", label: "Audits", match: (p) => p.startsWith("/audits") },
            { href: "/clients", label: "Clients", match: (p) => p.startsWith("/clients") },
          ]}
          right={
            <>
              <div className="bg-surface-container-lowest px-4 py-2 rounded-full border border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Search audits..."
                  className="bg-transparent border-0 focus:ring-0 text-sm text-on-surface placeholder:text-on-surface-variant/50 w-48 outline-none"
                />
              </div>
              <button className="p-2 text-on-surface-variant hover:bg-white/5 rounded-full transition-all">
                <span className="material-symbols-outlined">notifications</span>
              </button>
            </>
          }
        />
      }
    >
      {/* Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tighter text-on-surface mb-2">
            Your Audits
          </h2>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            Track AI visibility across your brand portfolio. Every audit is a fresh lens on how
            generative engines see your business.
          </p>
        </div>
        <div className="hidden md:flex gap-4">
          <Button variant="secondary" icon="download">
            Export
          </Button>
          <Button icon="add" onClick={() => router.push("/audits/new")}>
            New Audit
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      {!loading && totalAudits > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
          <GlassCard padding="md">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
              Total Audits
            </p>
            <p className="text-3xl font-black tracking-tighter text-on-surface">{totalAudits}</p>
          </GlassCard>
          <GlassCard padding="md">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
              Completed
            </p>
            <p className="text-3xl font-black tracking-tighter text-primary">{completed}</p>
          </GlassCard>
          <GlassCard padding="md">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
              Running
            </p>
            <p className="text-3xl font-black tracking-tighter text-secondary">{running}</p>
          </GlassCard>
          <GlassCard padding="md">
            <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
              Avg. Visibility
            </p>
            <p className={`text-3xl font-black tracking-tighter ${visibilityTone(avgVisibility)}`}>
              {completed > 0 ? `${Math.round(avgVisibility)}%` : "—"}
            </p>
          </GlassCard>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <GlassCard className="text-center" padding="xl">
          <p className="text-on-surface-variant">Loading audits...</p>
        </GlassCard>
      ) : audits.length === 0 ? (
        <GlassCard className="text-center" padding="xl">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-3xl">radar</span>
          </div>
          <h3 className="text-2xl font-bold text-on-surface mb-2">No audits yet</h3>
          <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
            Run your first AI visibility audit to see how your brand appears across ChatGPT,
            Claude, Gemini, Perplexity and more.
          </p>
          <Button icon="add" size="lg" onClick={() => router.push("/audits/new")}>
            Create Your First Audit
          </Button>
        </GlassCard>
      ) : (
        <GlassCard padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Brand
                  </th>
                  <th className="text-left px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Status
                  </th>
                  <th className="text-center px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Visibility
                  </th>
                  <th className="text-center px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Engines
                  </th>
                  <th className="text-center px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Duration
                  </th>
                  <th className="text-right px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr
                    key={audit.id}
                    className="hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => router.push(`/audits/${audit.id}`)}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-on-surface">{audit.brand_name}</p>
                        {audit.version && audit.version > 1 && (
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-bold">
                            v{audit.version}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">{audit.brand_url}</p>
                    </td>
                    <td className="px-6 py-5">
                      <Badge tone={STATUS_TONE[audit.status] || "neutral"}>{audit.status}</Badge>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {audit.visibility_rate != null ? (
                        <span className={`text-xl font-black tracking-tighter ${visibilityTone(audit.visibility_rate)}`}>
                          {audit.visibility_rate}%
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">—</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center text-sm text-on-surface-variant">
                      {audit.engines?.length || 0}
                    </td>
                    <td className="px-6 py-5 text-center text-sm text-on-surface-variant">
                      {formatDuration(audit.duration_seconds)}
                    </td>
                    <td className="px-6 py-5 text-right text-sm text-on-surface-variant">
                      {formatDate(audit.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </AppShell>
  );
}
