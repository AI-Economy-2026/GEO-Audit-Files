/** Build a CSV string from a 2D array (first row treated as header) and
 *  trigger a browser download. Properly escapes commas, quotes, and newlines. */
export function downloadCsv(
  filename: string,
  rows: (string | number | null | undefined | boolean)[][]
): void {
  if (typeof window === "undefined") return;

  const csv = rows.map((row) => row.map(escapeCell).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Defer revoke so Safari has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Sanitise a brand name (or any string) so it's safe to use in a filename. */
export function safeFilename(s: string): string {
  return (s || "audit").replace(/[^a-z0-9\-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
