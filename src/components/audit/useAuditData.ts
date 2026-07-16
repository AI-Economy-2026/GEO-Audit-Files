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

/** Fetches audit + history + results for any audit tab page. */
export function useAuditData(id: string): AuditBundle {
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
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
      if (auditRes.audit) setAudit(auditRes.audit);
      if (histRes.history) setHistory(histRes.history);
      if (resRes.data) setResults(resRes.data as ResultRow[]);
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
