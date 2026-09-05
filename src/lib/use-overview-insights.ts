"use client";

import { useEffect, useState } from "react";
import type { OverviewInsights } from "@/lib/overview-insights";

/** Fetches and caches the executive summary + next-steps cards, generated
 *  once per audit and persisted server-side (see overview-insights route).
 *  Shared by the Overview and Engine Gaps pages, which both surface the
 *  same audit-level "Next steps" cards. */
export function useOverviewInsights(auditId: string) {
  const [insights, setInsights] = useState<OverviewInsights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/geo-audits/${auditId}/overview-insights`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setInsights(data.insights ?? null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [auditId]);

  return { insights, loading };
}
