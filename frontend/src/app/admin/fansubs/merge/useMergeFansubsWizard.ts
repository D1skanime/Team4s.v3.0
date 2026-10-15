"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getFansubList, mergeFansubs, mergeFansubsPreview } from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import { FansubGroup, MergeFansubsPreviewResult } from "@/types/fansub";
import { filterMergeCandidates, scoreMergeRelevance } from "./fansubMergeScoring";
import { emptyCountSummary, sumGroupCounts } from "./MergeWizardCards";

export type WizardStep = 1 | 2 | 3 | 4;
export type SortMode = "name" | "related";
export type StatusFilter = "all" | "active" | "inactive" | "dissolved";

export const WIZARD_STEPS: Array<{ id: WizardStep; title: string }> = [
  { id: 1, title: "Zielgruppe wählen" },
  { id: 2, title: "Quellgruppen wählen" },
  { id: 3, title: "Vorschau prüfen" },
  { id: 4, title: "Bestätigen & zusammenführen" },
];

export function useMergeFansubsWizard() {
  const router = useRouter();
  const { hasAccessToken } = useAuthSession();

  const [groups, setGroups] = useState<FansubGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fetchLimitReached, setFetchLimitReached] = useState(false);

  const [targetID, setTargetID] = useState<number | null>(null);
  const [sourceIDs, setSourceIDs] = useState<Set<number>>(new Set());

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("name");

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [preview, setPreview] = useState<MergeFansubsPreviewResult | null>(
    null,
  );
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewKey, setPreviewKey] = useState("");
  const [merging, setMerging] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [slugConfirmation, setSlugConfirmation] = useState("");

  useEffect(() => {
    void loadGroups();
  }, []);

  async function loadGroups() {
    try {
      setLoading(true);
      setError(null);
      const response = await getFansubList({ per_page: 500 });
      setFetchLimitReached(response.data.length < response.meta.total);
      setGroups(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fehler beim Laden der Gruppen",
      );
    } finally {
      setLoading(false);
    }
  }

  const filteredGroups = useMemo(() => {
    return filterMergeCandidates(groups, { query: searchQuery, statusFilter })
      .sort((a, b) => {
        if (sortMode === "related") {
          const scoreDiff =
            scoreMergeRelevance(b, searchQuery) - scoreMergeRelevance(a, searchQuery);
          if (scoreDiff !== 0) return scoreDiff;
        }
        return a.name.localeCompare(b.name, "de", { sensitivity: "base" });
      });
  }, [groups, searchQuery, sortMode, statusFilter]);

  const selectionReady = targetID !== null && sourceIDs.size > 0;
  const selectionKey = useMemo(() => {
    const sourcePart = Array.from(sourceIDs)
      .sort((a, b) => a - b)
      .join(",");
    return `${targetID ?? 0}:${sourcePart}`;
  }, [sourceIDs, targetID]);

  const targetGroup = targetID
    ? (groups.find((group) => group.id === targetID) ?? null)
    : null;
  const selectedSourceGroups = useMemo(
    () => groups.filter((group) => sourceIDs.has(group.id)),
    [groups, sourceIDs],
  );
  const sourceCandidates = useMemo(
    () => filteredGroups.filter((group) => group.id !== targetID),
    [filteredGroups, targetID],
  );

  const sourceSummary = useMemo(
    () => sumGroupCounts(selectedSourceGroups),
    [selectedSourceGroups],
  );
  const targetSummary = useMemo(
    () => (targetGroup ? sumGroupCounts([targetGroup]) : emptyCountSummary()),
    [targetGroup],
  );

  const hasPreviewConflicts = Boolean(
    preview &&
    (preview.conflicts.version_conflicts > 0 ||
      preview.conflicts.duplicate_aliases_count > 0 ||
      preview.conflicts.duplicate_members_count > 0 ||
      preview.conflicts.duplicate_relations_count > 0 ||
      preview.conflicts.duplicate_slugs_count > 0 ||
      preview.conflicts.duplicate_names_count > 0),
  );

  useEffect(() => {
    setPreview(null);
    setPreviewKey("");
    setConfirmDelete(false);
    setSlugConfirmation("");
  }, [selectionKey]);

  useEffect(() => {
    if (!selectionReady && currentStep > 2) {
      setCurrentStep(2);
    }
  }, [currentStep, selectionReady]);

  const loadPreview = useCallback(async () => {
    if (!targetID || sourceIDs.size === 0) return;
    if (!hasAccessToken) {
      setError("Anmeldung erforderlich. Bitte zuerst anmelden.");
      return;
    }

    try {
      setPreviewLoading(true);
      setError(null);
      const response = await mergeFansubsPreview({
        target_id: targetID,
        source_ids: Array.from(sourceIDs),
      });
      setPreview(response.data);
      setPreviewKey(selectionKey);
    } catch (err) {
      setPreview(null);
      setPreviewKey("");
      setError(
        err instanceof Error ? err.message : "Fehler bei der Merge-Vorschau",
      );
    } finally {
      setPreviewLoading(false);
    }
  }, [hasAccessToken, selectionKey, sourceIDs, targetID]);

  useEffect(() => {
    if (
      currentStep !== 3 ||
      !selectionReady ||
      previewKey === selectionKey ||
      previewLoading
    ) {
      return;
    }
    void loadPreview();
  }, [
    currentStep,
    loadPreview,
    previewKey,
    previewLoading,
    selectionKey,
    selectionReady,
  ]);

  async function handleMerge() {
    if (
      !targetID ||
      sourceIDs.size === 0 ||
      !targetGroup ||
      !preview?.can_merge ||
      !hasAccessToken
    ) {
      return;
    }
    if (!confirmDelete || slugConfirmation.trim() !== targetGroup.slug) {
      return;
    }

    try {
      setMerging(true);
      setError(null);
      setSuccess(null);

      const response = await mergeFansubs({
        target_id: targetID,
        source_ids: Array.from(sourceIDs),
      });

      setSuccess(
        `Merge abgeschlossen: ${response.data.merged_count} Gruppe(n), ${response.data.versions_migrated} Versionen, ` +
          `${response.data.members_migrated} Mitglieder, ${response.data.relations_migrated} Anime-Zuordnungen.`,
      );

      const nextTargetID = targetID;
      await loadGroups();
      setSourceIDs(new Set());
      setPreview(null);
      setPreviewKey("");
      setCurrentStep(1);
      setConfirmDelete(false);
      setSlugConfirmation("");
      router.push(`/admin/fansubs/${nextTargetID}/edit`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Fehler beim Zusammenführen",
      );
    } finally {
      setMerging(false);
    }
  }

  function chooseTarget(groupID: number) {
    setTargetID(groupID);
    setSourceIDs((prev) => {
      if (!prev.has(groupID)) return prev;
      const next = new Set(prev);
      next.delete(groupID);
      return next;
    });
  }

  function toggleSource(groupID: number) {
    if (groupID === targetID) return;
    setSourceIDs((prev) => {
      const next = new Set(prev);
      if (next.has(groupID)) {
        next.delete(groupID);
      } else {
        next.add(groupID);
      }
      return next;
    });
  }

  function selectAllFilteredSources() {
    setSourceIDs(new Set(sourceCandidates.map((group) => group.id)));
  }

  function clearSourceSelection() {
    setSourceIDs(new Set());
  }

  function isStepEnabled(step: WizardStep): boolean {
    if (step <= 2) return true;
    return selectionReady;
  }

  function goToStep(step: WizardStep) {
    if (!isStepEnabled(step)) return;
    setCurrentStep(step);
  }

  function goBack() {
    if (currentStep === 1) return;
    setCurrentStep((currentStep - 1) as WizardStep);
  }

  function goNext() {
    if (currentStep === 1) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2) {
      if (!selectionReady) return;
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      if (!selectionReady || previewLoading || !preview) return;
      setCurrentStep(4);
    }
  }

  const canGoNext =
    currentStep === 1 ||
    (currentStep === 2
      ? selectionReady
      : currentStep === 3
        ? Boolean(preview) && !previewLoading
        : false);

  const mergeButtonDisabled =
    merging ||
    !targetGroup ||
    !preview ||
    !preview.can_merge ||
    !confirmDelete ||
    slugConfirmation.trim() !== targetGroup?.slug;

  return {
    loading,
    error,
    success,
    fetchLimitReached,
    targetID,
    sourceIDs,
    selectionReady,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortMode,
    setSortMode,
    currentStep,
    preview,
    previewLoading,
    merging,
    confirmDelete,
    setConfirmDelete,
    slugConfirmation,
    setSlugConfirmation,
    filteredGroups,
    targetGroup,
    selectedSourceGroups,
    sourceCandidates,
    sourceSummary,
    targetSummary,
    hasPreviewConflicts,
    loadPreview,
    handleMerge,
    chooseTarget,
    toggleSource,
    selectAllFilteredSources,
    clearSourceSelection,
    isStepEnabled,
    goToStep,
    goBack,
    goNext,
    canGoNext,
    mergeButtonDisabled,
  };
}
