/**
 * Client-side CSV export utility.
 * Generates and downloads a CSV file from structured data.
 * All financial values are formatted with currency symbol and 2 decimals.
 */

export interface CSVColumn<T> {
  /** Header label in the CSV */
  header: string;
  /** Function to extract the cell value from a row */
  accessor: (row: T) => string | number | null | undefined;
}

/**
 * Escapes a CSV cell value (wraps in quotes if it contains commas, quotes, or newlines).
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates a CSV string from rows and column definitions.
 */
export function generateCSV<T>(rows: T[], columns: CSVColumn<T>[]): string {
  const headerLine = columns.map((c) => escapeCSV(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = col.accessor(row);
        if (raw === null || raw === undefined) return "";
        return escapeCSV(String(raw));
      })
      .join(","),
  );
  return [headerLine, ...dataLines].join("\n");
}

/**
 * Triggers a browser download of a CSV file.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * One-call helper: generate CSV from data and download it.
 */
export function exportToCSV<T>(
  rows: T[],
  columns: CSVColumn<T>[],
  filename: string,
): void {
  const csv = generateCSV(rows, columns);
  downloadCSV(csv, filename);
}

// ── Pre-built formatters for financial data ──────────────────────────────────

export function formatCurrencyCSV(value: number): string {
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercentCSV(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatROICSV(value: number): string {
  return `${value.toFixed(2)}x`;
}
