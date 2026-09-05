import { NextRequest } from "next/server";

export interface TableParams {
  page: number;
  limit: number;
  search: string;
  filter: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  counts?: Record<string, number>;
  stats?: Record<string, unknown>;
}

const DEFAULT_LIMIT = 20;

/** Parses page/limit/search/filter query params shared by every
 *  paginated list endpoint (clients, audits, reports, ...). Every such
 *  endpoint returns the same PaginatedResult<T> shape so the frontend
 *  can drive them all through one DataTable component. */
export function parseTableParams(req: NextRequest): TableParams {
  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit")) || DEFAULT_LIMIT));
  const search = (params.get("search") || "").trim();
  const filter = params.get("filter") || "all";
  return { page, limit, search, filter };
}

/** Slices an already-computed row array into one page. Used where a
 *  filter depends on a value computed in memory (e.g. a visibility
 *  trend that isn't a raw column), so a single SQL WHERE can't express
 *  it and the service fetches the full set before paging in memory. */
export function paginate<T>(rows: T[], page: number, limit: number): { data: T[]; total: number } {
  const total = rows.length;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), total };
}
