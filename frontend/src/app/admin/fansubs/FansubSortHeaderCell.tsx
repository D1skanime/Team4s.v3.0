"use client";

import { TableHeaderCell } from "@/components/ui";

type FansubSortHeaderCellProps<K extends string> = {
  label: string;
  sortKeyValue: K;
  activeSortKey: K;
  sortDirection: "asc" | "desc";
  onSort: (key: K) => void;
  styles: Record<string, string>;
};

// GAP-05: extrahiert aus page.tsx's vier wiederholten Sort-Header-Blocks, damit die neue
// Kuerzel-Spalte page.tsx netto nicht wachsen laesst.
export function FansubSortHeaderCell<K extends string>({
  label,
  sortKeyValue,
  activeSortKey,
  sortDirection,
  onSort,
  styles,
}: FansubSortHeaderCellProps<K>) {
  return (
    <TableHeaderCell>
      <button
        type="button"
        className={styles.fansubSortButton}
        onClick={() => onSort(sortKeyValue)}
      >
        {label}{" "}
        {activeSortKey === sortKeyValue ? (sortDirection === "asc" ? "^" : "v") : ""}
      </button>
    </TableHeaderCell>
  );
}
