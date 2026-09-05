"use client";

import { useEffect, useState } from "react";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  counts?: Record<string, number>;
  stats?: Record<string, unknown>;
}

interface UsePaginatedTableResult<T> {
  rows: T[];
  total: number;
  loading: boolean;
  counts: Record<string, number>;
  stats: Record<string, unknown>;
  page: number;
  setPage: (page: number) => void;
  search: string;
  setSearch: (search: string) => void;
  filters: Record<string, string>;
  setFilter: (key: string, value: string) => void;
}

/** Drives any endpoint that returns PaginatedResult<T> (see
 *  lib/table-query.ts): tracks page/search/filter state, refetches
 *  on change, and resets to page 1 whenever search or a filter
 *  changes so the user isn't stranded on an empty page. */
export function usePaginatedTable<T>(
  endpoint: string,
  filterKeys: string[] = [],
  pageSize = 20
): UsePaginatedTableResult<T> {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>(
    Object.fromEntries(filterKeys.map((key) => [key, "all"]))
  );

  const activeFilter = filterKeys.length ? filters[filterKeys[0]] : "all";

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
    if (search) params.set("search", search);
    if (activeFilter) params.set("filter", activeFilter);

    fetch(`${endpoint}?${params.toString()}`)
      .then((res) => res.json())
      .then((data: PaginatedResponse<T>) => {
        setRows(data.data || []);
        setTotal(data.total || 0);
        setCounts(data.counts || {});
        setStats(data.stats || {});
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, page, search, activeFilter, pageSize]);

  function setSearch(value: string) {
    setSearchState(value);
    setPage(1);
  }

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  return { rows, total, loading, counts, stats, page, setPage, search, setSearch, filters, setFilter };
}
