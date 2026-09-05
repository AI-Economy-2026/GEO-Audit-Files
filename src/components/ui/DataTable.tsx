"use client";

import { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
  render: (row: T) => ReactNode;
}

export interface DataTableFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface DataTableFilterGroup {
  key: string;
  active: string;
  options: DataTableFilterOption[];
  onChange: (value: string) => void;
}

interface DataTableProps<T> {
  title: string;
  subtitle?: string;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading: boolean;
  emptyLabel?: string;
  filterGroups?: DataTableFilterGroup[];
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Shared list-page table: any number of independent filter-chip
 *  groups, a search box, the data grid, and page controls. Callers own
 *  the data fetch (server-side pagination/search/filter) and pass down
 *  the current page's rows plus the total row count. */
export default function DataTable<T>({
  title,
  subtitle,
  columns,
  rows,
  rowKey,
  onRowClick,
  loading,
  emptyLabel = "No results.",
  filterGroups,
  search,
  onSearchChange,
  searchPlaceholder = "Search...",
  page,
  pageSize,
  total,
  onPageChange,
}: DataTableProps<T>) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="table-wrap">
      <div className="table-head-bar" style={{ flexWrap: "wrap", gap: 14 }}>
        <div>
          <h3>{title}</h3>
          {subtitle && <div className="sub">{subtitle}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {onSearchChange && (
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--inset)",
                color: "var(--text)",
                fontSize: 13,
                fontFamily: "var(--font-body)",
                minWidth: 180,
              }}
            />
          )}
          {filterGroups?.map((group) => (
            <div key={group.key} style={{ display: "flex", gap: 6, fontSize: 12 }}>
              {group.options.map((opt) => (
                <span
                  key={opt.value}
                  className={`chip ${group.active === opt.value ? "chip-mint" : "chip-neutral"}`}
                  style={{ cursor: "pointer" }}
                  onClick={() => group.onChange(opt.value)}
                >
                  {opt.label} {opt.count}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>Loading...</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>{emptyLabel}</div>
      ) : (
        <>
          <div className="scroll">
            <table className="data" style={{ minWidth: 880 }}>
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.key} className={col.align === "center" ? "center" : undefined}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={rowKey(row)}
                    className={onRowClick ? "clickable" : undefined}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={col.align === "center" ? "center" : undefined}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 22px",
                borderTop: "1px solid var(--border-soft)",
                fontSize: 13,
                color: "var(--text-3)",
              }}
            >
              <span>
                Page {page} of {pageCount} &middot; {total} total
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
                  Previous
                </button>
                <button className="btn btn-sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
