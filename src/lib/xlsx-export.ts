import * as XLSX from "xlsx";
import { safeFilename } from "@/lib/csv";

/** Minimal shape needed to export an action-plan item row. Kept structural
 *  (rather than importing the page's ActionItem type) so this helper has no
 *  dependency on any single page. */
export interface ActionPlanExportItem {
  week_number: number;
  category: "technical" | "non_technical";
  title: string;
  description: string | null;
  effort_label: string | null;
  sort_order: number;
  completed_at: string | null;
  owner?: string | null;
}

interface ActionPlanExportRow {
  Week: number;
  Category: string;
  Title: string;
  Description: string;
  Effort: string;
  Owner: string;
  Status: "Completed" | "Not started";
}

/** Build an .xlsx workbook from the action-plan items and trigger a
 *  client-side download. No server round-trip required — the data is
 *  already loaded on the page. */
export function exportActionPlanToXlsx(
  items: ActionPlanExportItem[],
  brandName: string
): void {
  if (typeof window === "undefined") return;

  const rows: ActionPlanExportRow[] = [...items]
    .sort((a, b) => {
      if (a.week_number !== b.week_number) return a.week_number - b.week_number;
      return a.sort_order - b.sort_order;
    })
    .map((it) => ({
      Week: it.week_number,
      Category: it.category === "technical" ? "Technical" : "Non-technical",
      Title: it.title,
      Description: it.description || "",
      Effort: it.effort_label || "",
      Owner: it.owner || "",
      Status: it.completed_at ? "Completed" : "Not started",
    }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: ["Week", "Category", "Title", "Description", "Effort", "Owner", "Status"],
  });

  // Reasonable column widths so the sheet is readable without manual resizing.
  worksheet["!cols"] = [
    { wch: 8 },
    { wch: 14 },
    { wch: 40 },
    { wch: 60 },
    { wch: 12 },
    { wch: 16 },
    { wch: 14 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Action Plan");

  XLSX.writeFile(workbook, `${safeFilename(brandName)}-90-day-action-plan.xlsx`);
}
