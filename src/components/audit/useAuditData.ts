"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface EngineStats {
  display_name: string;
  visibility_rate: number;
  brand_mentioned: number;
  total_queries: number;
}

export interface KeywordGap {
  prompt_id: number;
  prompt_text: string;
  category: string;
  engines_missed: string[];
  engines_hit: string[];
  engines_tested: number;
  gap_severity: string;
  competitors_present: { name: string; count: number }[];
}

export interface CitedDomain {
  domain: string;
  count: number;
  share_percent: number;
  engines: string[];
  is_brand: boolean;
}

export interface DirectoryCitation {
  directory: string;
  listed: boolean;
  link: string | null;
  error: string | null;
}

export interface SummaryJson {
  audit_metadata?: {
    brand: string;
    generated_at: string;
    total_prompts: number;
    total_queries: number;
    errors: number;
  };
  overall_visibility?: { brand_mentioned_count: number; visibility_rate_percent: number };
  engine_breakdown?: Record<string, EngineStats>;
  category_performance?: Record<string, { total_queries: number; brand_mentioned: number; visibility_rate: number }>;
  competitor_analysis?: { mention_counts: Record<string, number>; most_mentioned: string | null };
  sentiment_breakdown?: { positive: number; neutral: number; negative: number };
  keyword_gap_analysis?: { keyword_gaps: KeywordGap[] };
  top_cited_domains?: CitedDomain[];
  citation_totals?: { total_citations: number; unique_domains: number };
  directory_citations?: DirectoryCitation[];
}

export interface AuditData {
  id: string;
  brand_name: string;
  brand_url: string;
  country?: string | null;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  engines: string[];
  competitors: string[];
  keywords: string[];
  completed_at: string | null;
  duration_seconds: number | null;
  summary_json: SummaryJson | null;
  parent_audit_id: string | null;
  version: number;
}

export interface HistoryEntry {
  id: string;
  version: number;
  status: string;
  visibility_rate: number | null;
  total_queries: number | null;
  total_mentioned: number | null;
  completed_at: string | null;
  engines: Record<string, number>;
}

export interface ResultRow {
  prompt_id: number;
  category: string;
  prompt_text: string;
  engine: string;
  engine_display: string;
  brand_mentioned: boolean;
  competitor_mentions: string[];
  response_text: string | null;
  prompt_type: string | null;
  position_rank: number | null;
  url_cited: boolean;
  citations: string[] | null;
}

export interface AuditBundle {
  audit: AuditData | null;
  history: HistoryEntry[];
  results: ResultRow[];
  loading: boolean;
}

/** In-memory cache keyed by audit id. Lets tab switches within the same
 *  audit render instantly (no loading flash) while we revalidate in the
 *  background. Lives for the session; cleared on full page reload. */
type CacheEntry = { audit: AuditData | null; history: HistoryEntry[]; results: ResultRow[] };
const auditCache = new Map<string, CacheEntry>();

/** Fetches audit + history + results for any audit tab page. */
export function useAuditData(id: string): AuditBundle {
  const cached = () => auditCache.get(id);
  const [audit, setAudit] = useState<AuditData | null>(() => cached()?.audit ?? null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => cached()?.history ?? []);
  const [results, setResults] = useState<ResultRow[]>(() => cached()?.results ?? []);
  // Only show the spinner on a genuine cache miss; cached tabs render instantly.
  const [loading, setLoading] = useState(() => !auditCache.has(id));

  useEffect(() => {
    let cancelled = false;

    // Serve any cached snapshot immediately, then refresh in the background.
    const hit = auditCache.get(id);
    if (hit) {
      setAudit(hit.audit);
      setHistory(hit.history);
      setResults(hit.results);
      setLoading(false);
    } else {
      setLoading(true);
    }

    async function load() {
      const sb = createClient();
      const [auditRes, histRes, resRes] = await Promise.all([
        fetch(`/api/geo-audits/${id}`).then((r) => r.json()),
        fetch(`/api/geo-audits/${id}/history`).then((r) => r.json()),
        sb
          .from("geo_audit_results")
          .select(
            "prompt_id, category, prompt_text, engine, engine_display, brand_mentioned, competitor_mentions, response_text, prompt_type, position_rank, url_cited, citations"
          )
          .eq("audit_id", id)
          .order("prompt_id"),
      ]);
      if (cancelled) return;

      const nextAudit: AuditData | null = auditRes.audit ?? null;
      const nextHistory: HistoryEntry[] = histRes.history ?? [];
      const nextResults: ResultRow[] = (resRes.data as ResultRow[]) ?? [];

      // Cache only a valid fetch so a transient error never poisons the cache.
      if (nextAudit) {
        auditCache.set(id, { audit: nextAudit, history: nextHistory, results: nextResults });
        setAudit(nextAudit);
      }
      setHistory(nextHistory);
      setResults(nextResults);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return { audit, history, results, loading };
}

export function tone(rate: number): "good" | "warn" | "crit" {
  if (rate >= 60) return "good";
  if (rate >= 30) return "warn";
  return "crit";
}

/** Per-engine status against the Absent / Under-cited / Holding scale used
 *  on the Overview and Engine Gaps pages. */
export function statusForEngine(rate: number): { label: string; className: "good" | "warn" | "crit" } {
  if (rate === 0) return { label: "Absent", className: "crit" };
  if (rate < 40) return { label: "Under-cited", className: "warn" };
  return { label: "Holding", className: "good" };
}
