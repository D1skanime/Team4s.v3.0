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

  const [searchValue, setSearchValue] = useState(q);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);

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

      if (nextFilter && nextFilter !== DEFAULT_FILTER) nextSearchParams.set("filter", nextFilter);
      else nextSearchParams.delete("filter");

      if (nextQ) nextSearchParams.set("q", nextQ);
      else nextSearchParams.delete("q");

      if (nextCursor) nextSearchParams.set("cursor", nextCursor);
      else nextSearchParams.delete("cursor");

      const query = nextSearchParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [cursor, filter, pathname, q, router, searchParams],
  );

  const handleFilterChange = useCallback(
    (value: string) => {
      setCursorHistory([]);
      writeParams({ filter: value }, true);
    },
    [writeParams],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchValue(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setCursorHistory([]);
        writeParams({ q: value }, true);
      }, DEBOUNCE_MS);
    },
    [writeParams],
  );

  const handleCursorChange = useCallback(
    (nextCursor: string) => {
      setCursorHistory((prev) => [...prev, cursor ?? ""]);
      writeParams({ cursor: nextCursor }, false);
    },
    [cursor, writeParams],
  );

  const handleCursorBack = useCallback(() => {
    if (cursorHistory.length === 0) return;
    const previousCursor = cursorHistory[cursorHistory.length - 1] ?? "";
    setCursorHistory((prev) => prev.slice(0, -1));
    writeParams({ cursor: previousCursor }, false);
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
