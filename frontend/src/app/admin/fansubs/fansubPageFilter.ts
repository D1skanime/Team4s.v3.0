import { matchesSearch } from "@/lib/textFilter";
import type { FansubGroup, FansubStatus } from "@/types/fansub";

export type FansubPageStatusFilter = "all" | "active" | "inactive" | "archived";

export interface FansubPageFilterParams {
  statusFilter: FansubPageStatusFilter;
  query: string;
}

function statusMatches(
  status: FansubStatus,
  statusFilter: FansubPageStatusFilter,
): boolean {
  if (statusFilter === "all") return true;
  if (statusFilter === "archived") return status === "dissolved";
  return status === statusFilter;
}

// GAP-05: extrahiert aus page.tsx's filteredItems useMemo (vgl. fansubListSort.ts) —
// kombiniert Status-Filter mit der geteilten umlaut-toleranten matchesSearch-Suche
// ueber Name/Slug/Kuerzel/Alias statt dem alten per-Page-Alias-Fetch (D-15/D-18).
export function filterFansubPageItems(
  items: FansubGroup[],
  params: FansubPageFilterParams,
): FansubGroup[] {
  return items.filter((item) => {
    if (!statusMatches(item.status, params.statusFilter)) return false;
    return matchesSearch(
      [item.name, item.slug, item.kuerzel, ...(item.aliases ?? [])],
      params.query,
    );
  });
}
