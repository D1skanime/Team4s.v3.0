"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ApiError,
  deleteFansubGroup,
  getFansubList,
  getFansubMembers,
  updateFansubGroup,
} from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import { useConfirmDialog } from "@/components/ui";
import { FansubGroup, FansubStatus } from "@/types/fansub";
import {
  compareFansubListItems,
  type FansubSortDirection,
  type FansubSortKey,
} from "./fansubListSort";
import { filterFansubPageItems } from "./fansubPageFilter";

export type StatusFilter = "all" | "active" | "inactive" | "archived";
export type SortKey = FansubSortKey;
export type SortDirection = FansubSortDirection;

export const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

export function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`;
  return "Anfrage fehlgeschlagen.";
}

export function statusLabel(status: FansubStatus): string {
  if (status === "dissolved") return "archived";
  return status;
}

export function formatPeriod(group: FansubGroup): string {
  const start = group.founded_year ?? "n/a";
  const end = group.dissolved_year ?? "heute";
  return `${start} - ${end}`;
}

export function useAdminFansubsList() {
  const { hasAccessToken } = useAuthSession();
  const { confirm, confirmDialog } = useConfirmDialog();
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLimitReached, setFetchLimitReached] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [items, setItems] = useState<FansubGroup[]>([]);
  const [memberCounts, setMemberCounts] = useState<
    Record<number, number | null>
  >({});
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [selectedIDs, setSelectedIDs] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<FansubStatus>("inactive");
  const [mobileMenuGroupID, setMobileMenuGroupID] = useState<number | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const loadList = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const perPage = 500;
      const response = await getFansubList({ page: 1, per_page: perPage });
      const firstPageTotal = response.meta.total;
      const allItems: FansubGroup[] = response.data;

      setFetchLimitReached(allItems.length < firstPageTotal);
      setItems(allItems);
      setSelectedIDs(new Set<number>());
      setMemberCounts({});
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    const timeoutID = window.setTimeout(() => {
      setQuery(queryInput.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutID);
  }, [queryInput]);

  const filteredItems = useMemo(
    () => filterFansubPageItems(items, { statusFilter, query }),
    [items, statusFilter, query],
  );

  const sortedItems = useMemo(() => {
    const next = [...filteredItems];
    next.sort((left, right) =>
      compareFansubListItems(sortKey, sortDirection, left, right),
    );
    return next;
  }, [filteredItems, sortDirection, sortKey]);

  const totalFiltered = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;
  const pageEnd = pageStart + PAGE_SIZE;
  const pagedItems = sortedItems.slice(pageStart, pageEnd);
  const visibleCount =
    totalFiltered === 0 ? 0 : Math.min(page * PAGE_SIZE, totalFiltered);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, sortDirection, sortKey]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageIDs = pagedItems.map((item) => item.id);
  const selectedOnPage = pageIDs.filter((id) => selectedIDs.has(id));
  const allOnPageSelected =
    pageIDs.length > 0 && selectedOnPage.length === pageIDs.length;
  const hasPartialPageSelection =
    selectedOnPage.length > 0 && !allOnPageSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = hasPartialPageSelection;
  }, [hasPartialPageSelection]);

  useEffect(() => {
    const unresolved = pagedItems.filter(
      (item) => memberCounts[item.id] === undefined,
    );
    if (unresolved.length === 0) return;

    let cancelled = false;
    void Promise.all(
      unresolved.map(async (item) => {
        try {
          const response = await getFansubMembers(item.id);
          return { id: item.id, count: response.data.length as number | null };
        } catch {
          return { id: item.id, count: null as number | null };
        }
      }),
    ).then((entries) => {
      if (cancelled) return;
      setMemberCounts((prev) => {
        const next = { ...prev };
        entries.forEach((entry) => {
          if (next[entry.id] === undefined) next[entry.id] = entry.count;
        });
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [memberCounts, pagedItems]);

  function toggleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextSortKey);
    setSortDirection("asc");
  }

  function toggleSelection(id: number) {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIDs((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIDs.forEach((id) => next.delete(id));
      } else {
        pageIDs.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function onDelete(item: FansubGroup) {
    if (!hasAccessToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      return;
    }

    const ok = await confirm({
      title: `Fansub "${item.name}" wirklich löschen?`,
      description: "Episoden bleiben erhalten; fansub_group_id wird entkoppelt.",
      confirmLabel: "Löschen",
      tone: "danger",
    });
    if (!ok) return;

    setIsMutating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await deleteFansubGroup(item.id);
      setSuccessMessage(`Fansub "${item.name}" gelöscht.`);
      await loadList();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function onBulkDelete() {
    if (!hasAccessToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      return;
    }

    const selected = items.filter((item) => selectedIDs.has(item.id));
    if (selected.length === 0) return;

    const ok = await confirm({
      title: `${selected.length} Fansub-Gruppen wirklich löschen?`,
      description: "Episoden bleiben erhalten; fansub_group_id wird entkoppelt.",
      confirmLabel: "Löschen",
      tone: "danger",
    });
    if (!ok) return;

    setIsMutating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      for (const item of selected) {
        await deleteFansubGroup(item.id);
      }
      setSuccessMessage(`${selected.length} Fansub-Gruppen gelöscht.`);
      await loadList();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function onBulkStatusChange() {
    if (!hasAccessToken) {
      setErrorMessage(
        "Anmeldung erforderlich. Bitte zuerst anmelden.",
      );
      return;
    }
    if (selectedIDs.size === 0) return;

    setIsMutating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const selected = items.filter((item) => selectedIDs.has(item.id));
      for (const item of selected) {
        await updateFansubGroup(item.id, { status: bulkStatus });
      }
      setSuccessMessage(
        `${selected.length} Gruppen auf "${statusLabel(bulkStatus)}" gesetzt.`,
      );
      await loadList();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsMutating(false);
    }
  }

  return {
    confirmDialog,
    isLoading,
    fetchLimitReached,
    isMutating,
    memberCounts,
    queryInput,
    setQueryInput,
    statusFilter,
    setStatusFilter,
    sortKey,
    setSortKey,
    sortDirection,
    setSortDirection,
    page,
    setPage,
    selectedIDs,
    bulkStatus,
    setBulkStatus,
    mobileMenuGroupID,
    setMobileMenuGroupID,
    errorMessage,
    successMessage,
    selectAllRef,
    filteredItems,
    pagedItems,
    totalFiltered,
    totalPages,
    visibleCount,
    allOnPageSelected,
    toggleSort,
    toggleSelection,
    toggleSelectAllOnPage,
    onDelete,
    onBulkDelete,
    onBulkStatusChange,
  };
}
