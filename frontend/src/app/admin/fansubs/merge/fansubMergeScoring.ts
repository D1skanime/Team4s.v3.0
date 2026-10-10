import type { FansubGroup, FansubStatus } from "@/types/fansub";
import { matchesSearch, normalizeSearchText } from "@/lib/textFilter";

export interface FilterMergeCandidatesParams {
  query: string;
  statusFilter: "all" | FansubStatus;
}

// GAP 178-05: extrahiert aus merge/page.tsx's filteredGroups useMemo — der boolesche
// Filter-Teil. D-18 (Kuerzel/Alias) wird hier zusaetzlich zu Name/Slug ueber matchesSearch
// durchgereicht, damit eine Gruppe, die nur ueber Kuerzel/Alias matcht, nicht aus der Liste
// faellt (RESEARCH.md Pitfall 3).
export function filterMergeCandidates(
  groups: FansubGroup[],
  params: FilterMergeCandidatesParams,
): FansubGroup[] {
  const { query, statusFilter } = params;
  return groups.filter((group) => {
    if (
      !matchesSearch(
        [group.name, group.slug, group.kuerzel, ...(group.aliases ?? [])],
        query,
      )
    ) {
      return false;
    }
    if (statusFilter !== "all" && group.status !== statusFilter) return false;
    return true;
  });
}

// GAP 178-05: extrahiert aus merge/page.tsx's filteredGroups useMemo — der numerische
// Scoring-Teil (D-04: bleibt bespokes Ranking, nicht an den gemeinsamen Filter delegiert).
// Name/Slug-Tiers sind zahlenwertgleich zur alten Implementierung (120/90/80/55/45/0).
// Kuerzel/Alias-Tiers (D-18) liegen bei jeder Spezifitaetsstufe strikt unter der
// Name/Slug-Stufe derselben Spezifitaet, damit ein Name/Slug-Treffer nie von einem
// gleichwertig spezifischen Kuerzel/Alias-Treffer ueberholt wird.
export function scoreMergeRelevance(group: FansubGroup, query: string): number {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) return 0;

  const name = normalizeSearchText(group.name);
  const slug = normalizeSearchText(group.slug);
  const kuerzel = group.kuerzel ? normalizeSearchText(group.kuerzel) : "";
  const aliases = (group.aliases ?? []).map((alias) => normalizeSearchText(alias));

  if (name === normalizedQuery || slug === normalizedQuery) return 120;
  if (kuerzel === normalizedQuery) return 115;
  if (aliases.some((alias) => alias === normalizedQuery)) return 110;

  if (name.startsWith(normalizedQuery)) return 90;
  if (slug.startsWith(normalizedQuery)) return 80;
  if (kuerzel.startsWith(normalizedQuery)) return 75;
  if (aliases.some((alias) => alias.startsWith(normalizedQuery))) return 70;

  if (name.includes(normalizedQuery)) return 55;
  if (slug.includes(normalizedQuery)) return 45;
  if (kuerzel.includes(normalizedQuery)) return 40;
  if (aliases.some((alias) => alias.includes(normalizedQuery))) return 35;

  return 0;
}
