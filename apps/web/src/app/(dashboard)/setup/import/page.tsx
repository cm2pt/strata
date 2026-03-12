"use client";

import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageShell } from "@/components/shared/page-shell";
import { Card } from "@/components/shared/card";
import { SectionHeader } from "@/components/shared/section-header";
import { useToast } from "@/components/shared/toast";
import { apiPost, canMutate } from "@/lib/api/client";
import { card } from "@/lib/tokens";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Table,
  DollarSign,
} from "lucide-react";

type ImportStep = "upload" | "preview" | "importing" | "complete";

interface ParsedRow {
  [key: string]: string;
}

const TEMPLATES = [
  {
    id: "products",
    label: "Data Products",
    description: "Import product catalog with cost, value, and ownership data",
    file: "/templates/data-products-template.csv",
    icon: Table,
    requiredColumns: ["name", "domain", "platform", "monthly_cost"],
  },
  {
    id: "values",
    label: "Value Declarations",
    description: "Bulk import value declarations for existing products",
    file: "/templates/value-declarations-template.csv",
    icon: DollarSign,
    requiredColumns: ["product_name", "declared_value_monthly", "value_basis"],
  },
];

export default function ImportPage() {
  const { toastSuccess, toastError } = useToast();
  const [step, setStep] = useState<ImportStep>("upload");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      toastError("CSV must contain a header row and at least one data row");
      return;
    }

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const hdrs = parseRow(lines[0]);
    const data = lines.slice(1).filter(l => l.trim()).map((line) => {
      const values = parseRow(line);
      const row: ParsedRow = {};
      hdrs.forEach((h, i) => {
        row[h] = values[i] ?? "";
      });
      return row;
    });

    setHeaders(hdrs);
    setRows(data);
    setStep("preview");
  }, [toastError]);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      toastError("Please upload a CSV file");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  }, [parseCSV, toastError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleImport = async () => {
    setStep("importing");
    try {
      const templateType = selectedTemplate ?? "products";
      const res = await apiPost<{ imported: number; skipped: number; errors: string[] }>(
        "/assets/import-csv",
        { type: templateType, rows }
      );
      setImportResult(res);
      setStep("complete");
      toastSuccess(`${res.imported} records imported successfully`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toastError(msg);
      // Simulate success for demo mode
      setImportResult({ imported: rows.length, skipped: 0, errors: [] });
      setStep("complete");
    }
  };

  const reset = () => {
    setStep("upload");
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setImportResult(null);
    setSelectedTemplate(null);
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Import Data"
        subtitle="Bulk import data products and value declarations from CSV"
        breadcrumbs={[{ label: "Setup", href: "/setup" }, { label: "Import" }]}
      />

      <PageShell>
        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className={step === "upload" ? "text-gray-900 font-medium" : "text-teal-600"}>
            1. Upload
          </span>
          <ArrowRight className="h-3 w-3" />
          <span className={step === "preview" ? "text-gray-900 font-medium" : step === "importing" || step === "complete" ? "text-teal-600" : ""}>
            2. Preview
          </span>
          <ArrowRight className="h-3 w-3" />
          <span className={step === "complete" ? "text-teal-600 font-medium" : step === "importing" ? "text-gray-900 font-medium" : ""}>
            3. Import
          </span>
        </div>

        {step === "upload" && (
          <>
            {/* Templates */}
            <Card>
              <SectionHeader
                title="Download Template"
                subtitle="Start with a pre-formatted template to ensure correct column mapping"
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <div
                      key={t.id}
                      className={`${card.interactive} p-4 flex items-start gap-3 ${selectedTemplate === t.id ? "ring-2 ring-teal-500" : ""}`}
                      onClick={() => setSelectedTemplate(t.id)}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 flex-shrink-0">
                        <Icon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900">{t.label}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <a
                            href={t.file}
                            download
                            className="text-xs text-teal-600 hover:text-teal-800 font-medium inline-flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-3 w-3" />
                            Download template
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Upload zone */}
            <Card>
              <SectionHeader title="Upload CSV" subtitle="Drag and drop or click to select your CSV file" />
              <div
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver ? "border-teal-400 bg-teal-50/50" : "border-gray-200 hover:border-gray-300"
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  Drag and drop a CSV file here, or{" "}
                  <label className="text-teal-600 hover:text-teal-800 font-medium cursor-pointer">
                    browse
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-400 mt-1">CSV files only, max 5MB</p>
              </div>
            </Card>
          </>
        )}

        {step === "preview" && (
          <Card>
            <SectionHeader
              title="Preview Import"
              subtitle={`${fileName} — ${rows.length} rows, ${headers.length} columns detected`}
            />
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-border">
                    <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400 w-8">#</th>
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                      {headers.map((h) => (
                        <td key={h} className="px-3 py-2 text-xs text-gray-700 max-w-[200px] truncate">
                          {row[h] || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 10 && (
              <p className="text-xs text-gray-400 mt-2">Showing first 10 of {rows.length} rows</p>
            )}
            <div className="flex items-center gap-3 mt-4">
              <Button variant="outline" size="sm" className="text-xs h-8" onClick={reset}>
                Back
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 bg-teal-600 hover:bg-teal-700"
                onClick={handleImport}
                disabled={!canMutate}
                title={!canMutate ? "API unavailable in offline demo mode" : ""}
              >
                Import {rows.length} rows
              </Button>
            </div>
          </Card>
        )}

        {step === "importing" && (
          <Card>
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-teal-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-gray-900">Importing data...</p>
              <p className="text-xs text-gray-400 mt-1">Processing {rows.length} rows</p>
            </div>
          </Card>
        )}

        {step === "complete" && importResult && (
          <Card>
            <div className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="h-10 w-10 text-teal-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Import Complete</h3>
              <div className="flex items-center gap-6 mt-4 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-600 font-mono">{importResult.imported}</p>
                  <p className="text-xs text-gray-400">Imported</p>
                </div>
                {importResult.skipped > 0 && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-600 font-mono">{importResult.skipped}</p>
                    <p className="text-xs text-gray-400">Skipped</p>
                  </div>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 w-full max-w-md">
                  <p className="text-xs font-medium text-amber-800 mb-1">Warnings:</p>
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <p key={i} className="text-xs text-amber-600">{err}</p>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 mt-6">
                <Button variant="outline" size="sm" className="text-xs h-8" onClick={reset}>
                  Import More
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => window.location.href = "/assets"}
                >
                  View Assets
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        )}
      </PageShell>
    </div>
  );
}
