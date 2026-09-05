import { createClient } from "@/lib/supabase/server";
import { TableParams, PaginatedResult, paginate } from "@/lib/table-query";

export interface ClientRow {
  id: string;
  name: string;
  url: string;
  email: string | null;
  status: string;
  intake_token: string;
  report_slug: string;
  audit_id: string | null;
  intake_completed_at: string | null;
  created_at: string;
  industry: string | null;
  visibility_rate: number | null;
  visibility_trend: number | null;
  last_audit_at: string | null;
  needs_attention: boolean;
}

interface RawAudit {
  id: string;
  parent_audit_id: string | null;
  version: number | null;
  status: string;
  visibility_rate: number | null;
  created_at: string;
  completed_at: string | null;
}

function buildAuditChains(audits: RawAudit[]): Map<string, RawAudit[]> {
  const chainsByRoot = new Map<string, RawAudit[]>();
  for (const audit of audits) {
    const root = audit.parent_audit_id || audit.id;
    const chain = chainsByRoot.get(root) || [];
    chain.push(audit);
    chainsByRoot.set(root, chain);
  }
  for (const chain of chainsByRoot.values()) {
    chain.sort((a, b) => (a.version || 1) - (b.version || 1));
  }
  return chainsByRoot;
}

function enrichClient(
  client: Omit<ClientRow, "visibility_rate" | "visibility_trend" | "last_audit_at" | "needs_attention">,
  auditsById: Map<string, RawAudit>,
  chainsByRoot: Map<string, RawAudit[]>
): ClientRow {
  if (!client.audit_id) {
    return { ...client, visibility_rate: null, visibility_trend: null, last_audit_at: null, needs_attention: false };
  }

  const rootAudit = auditsById.get(client.audit_id);
  const root = rootAudit?.parent_audit_id || rootAudit?.id || client.audit_id;
  const chain = (chainsByRoot.get(root) || []).filter((a) => a.status === "completed");

  if (!chain.length) {
    return { ...client, visibility_rate: null, visibility_trend: null, last_audit_at: null, needs_attention: false };
  }

  const latest = chain[chain.length - 1];
  const prev = chain.length >= 2 ? chain[chain.length - 2] : null;
  const trend =
    prev && prev.visibility_rate != null && latest.visibility_rate != null
      ? +(latest.visibility_rate - prev.visibility_rate).toFixed(1)
      : null;

  return {
    ...client,
    visibility_rate: latest.visibility_rate,
    visibility_trend: trend,
    last_audit_at: latest.completed_at,
    needs_attention: trend != null ? trend <= 0 : false,
  };
}

function matchesFilter(client: ClientRow, filter: string): boolean {
  if (filter === "attention") return client.needs_attention;
  if (filter === "improving") return client.visibility_trend != null && client.visibility_trend > 0;
  return true;
}

function matchesSearch(client: ClientRow, search: string): boolean {
  if (!search) return true;
  const q = search.toLowerCase();
  return client.name.toLowerCase().includes(q) || client.url.toLowerCase().includes(q);
}

export async function listClients(userId: string, params: TableParams): Promise<PaginatedResult<ClientRow>> {
  const supabase = await createClient();

  const { data: clients, error: clientsErr } = await supabase
    .from("geo_clients")
    .select("id, name, url, email, status, intake_token, report_slug, audit_id, intake_completed_at, created_at, industry")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (clientsErr) throw new Error(clientsErr.message);

  const { data: audits, error: auditsErr } = await supabase
    .from("geo_audits")
    .select("id, parent_audit_id, version, status, visibility_rate, created_at, completed_at")
    .eq("created_by", userId);
  if (auditsErr) throw new Error(auditsErr.message);

  const auditsById = new Map((audits || []).map((a) => [a.id, a]));
  const chainsByRoot = buildAuditChains(audits || []);

  const enriched = (clients || []).map((c) => enrichClient(c, auditsById, chainsByRoot));

  const now = new Date();
  const auditsThisMonth = (audits || []).filter((a) => {
    const d = new Date(a.created_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const withVisibility = enriched.filter((c) => c.visibility_rate != null);
  const averageVisibility = withVisibility.length
    ? Math.round(withVisibility.reduce((sum, c) => sum + (c.visibility_rate ?? 0), 0) / withVisibility.length)
    : 0;

  const counts = {
    all: enriched.length,
    attention: enriched.filter((c) => matchesFilter(c, "attention")).length,
    improving: enriched.filter((c) => matchesFilter(c, "improving")).length,
  };

  const filtered = enriched.filter((c) => matchesFilter(c, params.filter) && matchesSearch(c, params.search));
  const { data, total } = paginate(filtered, params.page, params.limit);

  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    counts,
    stats: { auditsThisMonth, averageVisibility },
  };
}
