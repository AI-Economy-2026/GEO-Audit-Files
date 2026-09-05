import { createClient } from "@/lib/supabase/server";
import { TableParams, PaginatedResult, paginate } from "@/lib/table-query";

export interface AuditRow {
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
  parent_audit_id: string | null;
  version: number | null;
  dashboard_url: string | null;
}

const RUNNING_STATUSES = ["running", "pending"];

function matchesFilter(audit: AuditRow, filter: string): boolean {
  if (filter === "completed") return audit.status === "completed";
  if (filter === "running") return RUNNING_STATUSES.includes(audit.status);
  if (filter === "drafts") return false; // draft persistence isn't built yet
  return true;
}

function matchesSearch(audit: AuditRow, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return audit.brand_name.toLowerCase().includes(q) || audit.brand_url.toLowerCase().includes(q);
}

export async function listAudits(
  userId: string,
  params: TableParams,
  creditPool: number
): Promise<PaginatedResult<AuditRow>> {
  const supabase = await createClient();

  const { data: audits, error } = await supabase
    .from("geo_audits")
    .select(
      "id, brand_name, brand_url, status, visibility_rate, total_queries, total_mentioned, engines, created_at, completed_at, duration_seconds, parent_audit_id, version, dashboard_url"
    )
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = audits || [];

  const now = new Date();
  const thisMonthCount = rows.filter((a) => {
    const d = new Date(a.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const running = rows.filter((a) => RUNNING_STATUSES.includes(a.status));

  const counts = {
    all: rows.length,
    completed: rows.filter((a) => matchesFilter(a, "completed")).length,
    running: running.length,
    drafts: 0,
  };

  const filtered = rows.filter((a) => matchesFilter(a, params.filter) && matchesSearch(a, params.search));
  const { data, total } = paginate(filtered, params.page, params.limit);

  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    counts,
    stats: {
      thisMonthCount,
      creditPool,
      runningCount: running.length,
      runningPreview: running.length === 1 ? { brandName: running[0].brand_name, totalQueries: running[0].total_queries } : null,
      draftCount: 0,
    },
  };
}
