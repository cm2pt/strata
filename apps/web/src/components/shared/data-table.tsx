"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { card as cardTokens } from "@/lib/tokens";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => React.ReactNode;
  /** If provided, enables sorting on this column. Return a comparable value. */
  sortValue?: (item: T) => string | number | null;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  className?: string;
  /** Default sort column key */
  defaultSortKey?: string;
  /** Default sort direction */
  defaultSortDirection?: "asc" | "desc";
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "No data available",
  className,
  defaultSortKey,
  defaultSortDirection = "desc",
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultSortDirection);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return data;
    const getter = col.sortValue;
    return [...data].sort((a, b) => {
      const va = getter(a);
      const vb = getter(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      const cmp = typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, columns]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  if (data.length === 0) {
    return (
      <div className={cn(cardTokens.base, cardTokens.padding, "text-center text-sm text-gray-400 py-8", className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn(cardTokens.base, "overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b sticky top-0 z-10 bg-white/95 backdrop-blur-sm">
              {columns.map((col) => {
                const isSortable = !!col.sortValue;
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-[10px] font-medium uppercase tracking-wider text-gray-400",
                      isSortable && "cursor-pointer select-none hover:text-gray-600",
                      isActive && "bg-gray-50/70 text-gray-500",
                      col.className
                    )}
                    onClick={isSortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.header}
                      {isSortable && (
                        isActive
                          ? sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                          : <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {sortedData.map((item, index) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  "transition-colors group",
                  index % 2 === 1 && "bg-gray-50/30",
                  onRowClick && "cursor-pointer hover:bg-gray-50"
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn("px-4 py-3", col.className)}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
