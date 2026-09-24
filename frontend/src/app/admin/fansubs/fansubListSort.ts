import type { FansubGroup, FansubStatus } from "@/types/fansub";

export type FansubSortKey = "name" | "status" | "period" | "kuerzel";
export type FansubSortDirection = "asc" | "desc";

function statusRank(status: FansubStatus): number {
  if (status === "active") return 0;
  if (status === "inactive") return 1;
  return 2;
}

function periodValue(group: FansubGroup): number {
  if (typeof group.founded_year === "number") return group.founded_year;
  if (typeof group.dissolved_year === "number") return group.dissolved_year;
  return Number.MAX_SAFE_INTEGER;
}

function kuerzelValue(group: FansubGroup): string {
  return (group.kuerzel ?? "").trim();
}

// GAP-05: extrahiert aus page.tsx's sortedItems useMemo, damit page.tsx durch die neue
// Kuerzel-Spalte netto nicht waechst (450-Zeilen-/Nicht-wachsen-Vorgabe).
export function compareFansubListItems(
  sortKey: FansubSortKey,
  sortDirection: FansubSortDirection,
  left: FansubGroup,
  right: FansubGroup,
): number {
  let cmp = 0;
  if (sortKey === "name") {
    cmp = left.name.localeCompare(right.name, "de", { sensitivity: "base" });
  } else if (sortKey === "status") {
    cmp = statusRank(left.status) - statusRank(right.status);
  } else if (sortKey === "kuerzel") {
    cmp = kuerzelValue(left).localeCompare(kuerzelValue(right), "de", {
      sensitivity: "base",
    });
  } else {
    cmp = periodValue(left) - periodValue(right);
  }

  if (cmp === 0) {
    cmp = left.name.localeCompare(right.name, "de", { sensitivity: "base" });
  }
  return sortDirection === "asc" ? cmp : -cmp;
}
