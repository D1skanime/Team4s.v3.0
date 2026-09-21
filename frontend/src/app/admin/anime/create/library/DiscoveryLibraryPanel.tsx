"use client";

// DiscoveryLibraryPanel (D-24, Update-Durchlauf 2): Toolbar (Status-Filter/Suche/
// Refresh) + vertikale DiscoveryLibraryCard-Liste (kein Table/TableRow mehr) + Pager,
// analog zu AdminUsersClient.tsx's Zustands-/Ladeform (nicht dessen Table-Rendering).

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button, EmptyState, ErrorState, FormField, Input, LoadingState, Select } from "@/components/ui";
import {
  ApiError,
  ignoreAdminJellyfinDiscoveryItem,
  listAdminJellyfinDiscovery,
  unignoreAdminJellyfinDiscoveryItem,
} from "@/lib/api";
import type { AdminJellyfinDiscoveryItem } from "@/types/admin";

import { DiscoveryReturnLink } from "../DiscoveryReturnLink";
import { DiscoveryLibraryCard } from "./DiscoveryLibraryCard";
import { buildDiscoveryCreateURL } from "./discoveryPageHelpers";
import { useDiscoveryLibraryFilters } from "./useDiscoveryLibraryFilters";

const FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "offen", label: "Offen" },
  { value: "bereits_vorhanden", label: "Bereits vorhanden" },
  { value: "ignoriert", label: "Ignoriert" },
  { value: "alle", label: "Alle" },
];

function readErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Unbekannter Fehler.";
}

export function DiscoveryLibraryPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    params,
    searchValue,
    cursorHistory,
    handleFilterChange,
    handleSearchChange,
    handleCursorChange,
    handleCursorBack,
  } = useDiscoveryLibraryFilters();

  const [items, setItems] = useState<AdminJellyfinDiscoveryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalSnapshotCount, setTotalSnapshotCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);

  const returnURL = searchParams.get("return") ?? undefined;
  const currentQuery = searchParams.toString();
  const currentDiscoveryURL = currentQuery ? `${pathname}?${currentQuery}` : pathname;
  const currentPage = cursorHistory.length + 1;

  const loadPage = useCallback(
    async (refresh = false) => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await listAdminJellyfinDiscovery({
          filter: params.filter,
          q: params.q,
          cursor: params.cursor,
          refresh,
        });
        setItems(response.data.items);
        setHasMore(response.data.has_more);
        setNextCursor(response.data.next_cursor);
        setTotalSnapshotCount(response.data.total_snapshot_count);
      } catch (err) {
        setError(readErrorMessage(err));
      } finally {
        setIsLoading(false);
        setIsInitialLoad(false);
      }
    },
    [params.cursor, params.filter, params.q],
  );

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  async function handleIgnore(jellyfinItemID: string) {
    try {
      await ignoreAdminJellyfinDiscoveryItem(jellyfinItemID);
      // D-19: nur die Status-Batch-Query der aktuellen Seite erneut ausfuehren,
      // kein kompletter Snapshot-Reload noetig.
      await loadPage();
    } catch (err) {
      setError(readErrorMessage(err));
    }
  }

  async function handleUnignore(jellyfinItemID: string) {
    try {
      await unignoreAdminJellyfinDiscoveryItem(jellyfinItemID);
      await loadPage();
    } catch (err) {
      setError(readErrorMessage(err));
    }
  }

  function handleCreate(jellyfinItemID: string) {
    router.push(buildDiscoveryCreateURL({ jellyfinItemID, currentDiscoveryURL }));
  }

  function handleOpenExisting(existingAnimeID: number) {
    router.push(`/admin/anime/${existingAnimeID}/edit`);
  }

  const showEmptySearch = items.length === 0 && !isLoading && !error && Boolean(params.q);
  const showEmptyFilter = items.length === 0 && !isLoading && !error && !params.q;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <DiscoveryReturnLink returnURL={returnURL} />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          gap: "var(--space-2)",
          padding: "var(--space-4)",
          background: "var(--surface-card, #ffffff)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <FormField label="Status" htmlFor="discovery-filter">
          <Select
            id="discovery-filter"
            value={params.filter}
            onChange={(e) => handleFilterChange(e.currentTarget.value)}
          >
            {FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Suche" htmlFor="discovery-search">
          <Input
            id="discovery-search"
            type="search"
            placeholder="Titel oder Pfad durchsuchen"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.currentTarget.value)}
          />
        </FormField>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span style={{ fontSize: "14px" }}>{totalSnapshotCount} Einträge in der Bibliothek insgesamt</span>
          <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={16} />} onClick={() => void loadPage(true)}>
            Bibliothek neu laden
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {isInitialLoad && isLoading ? (
          <LoadingState
            title="Bibliothek wird geladen"
            description="Jellyfin-Einträge und Team4s-Status werden abgeglichen."
          />
        ) : error ? (
          <ErrorState
            title="Bibliothek konnte nicht geladen werden"
            description="Die Jellyfin-Verbindung ist derzeit nicht erreichbar oder fehlerhaft konfiguriert. Bitte später erneut versuchen oder einen Administrator informieren."
            action={
              <Button variant="secondary" onClick={() => void loadPage()}>
                Erneut versuchen
              </Button>
            }
          />
        ) : isLoading ? (
          <LoadingState compact title="Weitere Einträge werden geladen" description="" />
        ) : showEmptySearch ? (
          <EmptyState
            title={`Keine Treffer für „${params.q}"`}
            description={`Suchbegriff prüfen oder Filter auf „Alle" stellen.`}
          />
        ) : showEmptyFilter ? (
          <EmptyState
            title="Keine offenen Einträge"
            description="Alle Bibliothekseinträge sind bereits verarbeitet oder mit Team4s verknüpft."
            action={
              <Button variant="secondary" onClick={() => handleFilterChange("alle")}>
                Alle Einträge anzeigen
              </Button>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {items.map((item) => (
              <DiscoveryLibraryCard
                key={item.jellyfin_item_id}
                item={item}
                onCreate={handleCreate}
                onOpenExisting={handleOpenExisting}
                onIgnore={handleIgnore}
                onUnignore={handleUnignore}
              />
            ))}
          </div>
        )}
      </div>

      {items.length > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <Button variant="secondary" size="sm" disabled={cursorHistory.length === 0} onClick={handleCursorBack}>
            Zurück
          </Button>
          <span style={{ fontSize: "14px" }}>Seite {currentPage}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasMore}
            onClick={() => {
              if (nextCursor) handleCursorChange(nextCursor);
            }}
          >
            Weiter
          </Button>
        </div>
      ) : null}
    </div>
  );
}
