import type { FansubGroup } from "@/types/fansub";
import { matchesSearch } from "@/lib/textFilter";

// D-18: Filter #1 (Gruppenliste in AdminGroupsClient.tsx) durchsucht Name, Slug,
// Kuerzel und Aliase ueber den gemeinsamen, umlaut-toleranten matchesSearch-Helper
// (D-15), statt nur Name/Slug per rohem .includes() zu vergleichen.
export function filterAdminGroups(groups: FansubGroup[], query: string): FansubGroup[] {
  return groups.filter((group) =>
    matchesSearch([group.name, group.slug, group.kuerzel, ...(group.aliases ?? [])], query),
  );
}
