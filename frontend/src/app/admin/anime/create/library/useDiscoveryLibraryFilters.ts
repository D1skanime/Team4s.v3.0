"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEBOUNCE_MS = 300;
const DEFAULT_FILTER = "offen";

export interface DiscoveryLibraryFilterParams {
  filter: string;
  q?: string;
  cursor?: string;
}

export interface UseDiscoveryLibraryFiltersResult {
  params: DiscoveryLibraryFilterParams;
  searchValue: string;
  cursorHistory: string[];
  handleFilterChange: (value: string) => void;
  handleSearchChange: (value: string) => void;
  handleCursorChange: (nextCursor: string) => void;
  handleCursorBack: () => void;
}

interface FilterPatch {
  filter?: string;
  q?: string;
  cursor?: string;
  history?: string[];
}

/**
 * Encodes the cursor-history stack (GAP-11) as a single comma-joined `hist`
 * URL param, in the same family as filter/q/cursor. writeParams OMITS the
 * `hist` param entirely for an empty array (see writeParams), so the only
 * two states this needs to round-trip are "param absent" (→ []) and "param
 * present" (→ split by comma, even if the raw value is the empty string —
 * that represents `[""]`, the one-entry history left after paging from page
 * 1, whose stored "return cursor" IS the empty string). Deliberately uses a
 * strict `raw === null` check here, NOT a falsy check: `!raw` would treat
 * `raw === ""` the same as `raw === null` and collapse `[""]` back to `[]`,
 * losing the page-1 history entry (JS quirk: `"".split(",")` already
 * correctly yields `[""]`, so no extra guard is needed once the null case is
 * handled with strict equality).
 */
function encodeHistoryParam(history: string[]): string {
  return history.join(",");
}

function decodeHistoryParam(raw: string | null): string[] {
  if (raw === null) return [];
  return raw.split(",");
}

/**
 * Synchronisiert filter/q/cursor der Discovery-Bibliotheksliste über die URL (D-11),
 * analog zu useUserListFilters.ts. `q` behält den lokalen Debounce-Zwischenwert
 * (300ms) bei; `filter` schreibt sofort. Ein Filter-/Suchwechsel löscht immer den
 * bestehenden `cursor`-Parameter ("stiller Neustart", Design-Entscheidung 4) —
 * `handleCursorChange` schreibt dagegen ausschließlich den Cursor, ohne filter/q
 * anzutasten. Der clientseitig gehaltene `cursorHistory`-Stack erlaubt "Zurück" ohne
 * einen Server-Rückwärtscursor (Design-Entscheidung 4/D-25).
 */
export function useDiscoveryLibraryFilters(): UseDiscoveryLibraryFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filter = searchParams.get("filter") || DEFAULT_FILTER;
  const q = searchParams.get("q") ?? "";
  const cursor = searchParams.get("cursor") ?? undefined;
  const histRaw = searchParams.get("hist");

  const [searchValue, setSearchValue] = useState(q);

  // GAP-11: cursorHistory is DERIVED from the URL's `hist` param instead of
  // isolated useState, so the page-back stack survives a full remount (e.g.
  // after "Zurück zur Bibliothek"), not just client-side navigation within
  // the same component lifetime. Same useMemo anti-infinite-loop rationale
  // as the `params` object below: recompute only when the raw URL value
  // itself changes.
  const cursorHistory = useMemo(() => decodeHistoryParam(histRaw), [histRaw]);

  useEffect(() => {
    // Hält den Debounce-Zwischenwert mit der URL synchron (z. B. bei Browser-Zurück).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchValue((current) => (current === q ? current : q));
  }, [q]);

  const writeParams = useCallback(
    (patch: FilterPatch, resetCursor: boolean) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      const nextFilter = patch.filter !== undefined ? patch.filter : filter;
      const nextQ = patch.q !== undefined ? patch.q : q;
      const nextCursor = resetCursor
        ? undefined
        : patch.cursor !== undefined
          ? patch.cursor
          : cursor;
      const nextHistory = patch.history !== undefined ? patch.history : cursorHistory;

      if (nextFilter && nextFilter !== DEFAULT_FILTER) nextSearchParams.set("filter", nextFilter);
      else nextSearchParams.delete("filter");

      if (nextQ) nextSearchParams.set("q", nextQ);
      else nextSearchParams.delete("q");

      if (nextCursor) nextSearchParams.set("cursor", nextCursor);
      else nextSearchParams.delete("cursor");

      if (nextHistory.length > 0) nextSearchParams.set("hist", encodeHistoryParam(nextHistory));
      else nextSearchParams.delete("hist");

      const query = nextSearchParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [cursor, cursorHistory, filter, pathname, q, router, searchParams],
  );

  const handleFilterChange = useCallback(
    (value: string) => {
      writeParams({ filter: value, history: [] }, true);
    },
    [writeParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        writeParams({ q: value, history: [] }, true);
      }, DEBOUNCE_MS);
    },
    [writeParams],
  );

  const handleCursorChange = useCallback(
    (nextCursor: string) => {
      const nextHistory = [...cursorHistory, cursor ?? ""];
      writeParams({ cursor: nextCursor, history: nextHistory }, false);
    },
    [cursor, cursorHistory, writeParams],
  );

  const handleCursorBack = useCallback(() => {
    if (cursorHistory.length === 0) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? "";
    const nextHistory = cursorHistory.slice(0, -1);
    writeParams({ cursor: previousCursor, history: nextHistory }, false);
  }, [cursorHistory, writeParams]);

  // useMemo hält die Referenz stabil, solange sich die zugrunde liegenden URL-Werte
  // nicht ändern (siehe useUserListFilters.ts: verhindert eine Endlosschleife aus
  // useEffect -> loadPage -> Render -> neues params-Objekt -> useEffect ...).
  const params: DiscoveryLibraryFilterParams = useMemo(
    () => ({
      filter,
      q: q || undefined,
      cursor,
    }),
    [cursor, filter, q],
  );

  return {
    params,
    searchValue,
    cursorHistory,
    handleFilterChange,
    handleSearchChange,
    handleCursorChange,
    handleCursorBack,
  };
}
