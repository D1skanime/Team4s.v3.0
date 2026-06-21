"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { buildMediaPreviewURL } from "@/components/admin/MediaUpload";
import { useAuthSession } from "@/lib/useAuthSession";
import type { FansubGroup, FansubGroupCapabilities } from "@/types/fansub";
import {
  canEditReleaseNotes,
  canUploadReleaseMedia,
  canUseMainTab,
  canViewReleaseContributors,
  canViewReleaseMedia,
} from "./fansubEditAccess";
import type { FansubReleaseGroup } from "./fansubEditTypes";
import { ReleaseMediaDrawer } from "./ReleaseMediaDrawer";
import { FansubEditWorkspaceSection } from "./sections/FansubEditWorkspaceSection";
import { useFansubDetailsForm } from "./useFansubDetailsForm";
import { useFansubEditGroupLoad } from "./hooks/useFansubEditGroupLoad";
import { useFansubEditMainTab } from "./hooks/useFansubEditMainTab";
import { useFansubEditMobileSections } from "./hooks/useFansubEditMobileSections";
import { useFansubReleaseData } from "./useFansubReleaseData";
import { useReleaseContributions } from "./useReleaseContributions";
import { useReleaseMediaDrawer } from "./useReleaseMediaDrawer";
import sharedStyles from "../../../admin.module.css";
import fansubEditStyles from "./FansubEdit.module.css";

const styles = { ...sharedStyles, ...fansubEditStyles };

type FansubEditClientProps = {
  fansubID: number;
  isPlatformAdmin: boolean;
  capabilities: FansubGroupCapabilities | null;
};

export function FansubEditClient({
  fansubID,
  isPlatformAdmin,
  capabilities,
}: FansubEditClientProps) {
  const [group, setGroup] = useState<FansubGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { hasAccessToken, hasRefreshToken, isClientInitialized } =
    useAuthSession();
  const hasAuthSession = hasAccessToken || hasRefreshToken;

  const handleDetailsToast = useCallback((message: string) => {
    setToast(message);
  }, []);
  const handleDetailsError = useCallback((message: string | null) => {
    setError(message);
  }, []);
  const handleDetailsGroupUpdated = useCallback((nextGroup: FansubGroup) => {
    setGroup(nextGroup);
  }, []);

  const details = useFansubDetailsForm({
    fansubID,
    isPlatformAdmin,
    hasAuthSession,
    onGroupUpdated: handleDetailsGroupUpdated,
    onToast: handleDetailsToast,
    onError: handleDetailsError,
  });
  const { form, logoMedia, bannerMedia, applyGroup, setAliasesFromLoad } =
    details;

  const { loading } = useFansubEditGroupLoad({
    fansubID,
    applyGroup,
    setAliasesFromLoad,
    onGroupLoaded: handleDetailsGroupUpdated,
    onError: handleDetailsError,
  });

  const {
    activeMainTab,
    availableMainTabs,
    handleMainTabChange,
  } = useFansubEditMainTab({
    isPlatformAdmin,
    capabilities,
  });
  const { isSectionOpen, onSectionToggle } = useFansubEditMobileSections();

  const canOpenReleaseContributors = canViewReleaseContributors(
    isPlatformAdmin,
    capabilities,
  );
  const canManageReleaseThemeAssets = canUploadReleaseMedia(
    isPlatformAdmin,
    capabilities,
  );
  const canUseReleaseMedia = canViewReleaseMedia(isPlatformAdmin, capabilities);
  const canUseReleaseNotes = canEditReleaseNotes(isPlatformAdmin, capabilities);
  const canUseProjectNotes = canUseMainTab(
    "notes",
    isPlatformAdmin,
    capabilities,
  );
  const canUseAdminReleaseDetails = isPlatformAdmin;
  const canOpenReleaseDrawer = canUseAdminReleaseDetails || canUseReleaseMedia;

  const workspaceLifecycleRef = useRef<{
    reset: () => void;
    invalidate: () => void;
  }>({ reset: () => {}, invalidate: () => {} });
  const resetReleaseWorkspaceState = useCallback(() => {
    workspaceLifecycleRef.current.reset();
  }, []);
  const invalidateReleaseWorkspaceRequests = useCallback(() => {
    workspaceLifecycleRef.current.invalidate();
  }, []);

  const releaseData = useFansubReleaseData({
    fansubID,
    hasAuthSession,
    resetReleaseWorkspaceState,
    invalidateReleaseWorkspaceRequests,
  });
  const {
    setExpandedAnimeKeys,
    setExpandedReleaseIds,
    releaseSegmentCards,
    setReleaseSegmentCards,
    setReleaseSegmentErrors,
    selectedReleaseSegment,
    setSelectedReleaseSegment,
    loadReleaseSegmentCards,
    loadAnimeReleases,
    refreshAnimeCoverage,
    invalidateReleaseDataRequests,
    resetReleaseDataState,
  } = releaseData;

  const contributions = useReleaseContributions({
    fansubID,
    refreshAnimeCoverage,
  });
  const { loadAnimeContributionRows, resetContributionsState } = contributions;

  const drawer = useReleaseMediaDrawer({
    hasAuthSession,
    canOpenReleaseDrawer,
    canUseAdminReleaseDetails,
    canManageReleaseThemeAssets,
    selectedReleaseSegment,
    setSelectedReleaseSegment,
    releaseSegmentCards,
    setReleaseSegmentCards,
    setReleaseSegmentErrors,
    setExpandedReleaseIds,
    loadReleaseSegmentCards,
    onToast: handleDetailsToast,
  });
  const { openReleaseDrawer, openThemeDrawer } = drawer;
  const { resetDrawerState, invalidateDrawerRequests } = drawer;

  useEffect(() => {
    workspaceLifecycleRef.current = {
      invalidate: () => {
        invalidateReleaseDataRequests();
        invalidateDrawerRequests();
      },
      reset: () => {
        invalidateReleaseDataRequests();
        invalidateDrawerRequests();
        resetReleaseDataState();
        resetContributionsState();
        resetDrawerState();
      },
    };
  }, [
    invalidateDrawerRequests,
    invalidateReleaseDataRequests,
    resetContributionsState,
    resetDrawerState,
    resetReleaseDataState,
  ]);

  const toggleAnime = useCallback(
    (releaseGroup: FansubReleaseGroup) => {
      setExpandedAnimeKeys((current) => {
        const next = new Set(current);
        if (next.has(releaseGroup.key)) {
          next.delete(releaseGroup.key);
        } else {
          next.add(releaseGroup.key);
          void loadAnimeReleases(releaseGroup);
          void loadAnimeContributionRows(releaseGroup.anime.id);
        }
        return next;
      });
    },
    [loadAnimeContributionRows, loadAnimeReleases, setExpandedAnimeKeys],
  );

  const openAnimeProjectNote = useCallback(
    (releaseGroup: FansubReleaseGroup) => {
      setExpandedAnimeKeys((current) => {
        if (current.has(releaseGroup.key)) return current;
        const next = new Set(current);
        next.add(releaseGroup.key);
        return next;
      });
      void loadAnimeReleases(releaseGroup);
      void loadAnimeContributionRows(releaseGroup.anime.id);
    },
    [loadAnimeContributionRows, loadAnimeReleases, setExpandedAnimeKeys],
  );

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const bannerPreviewURL = buildMediaPreviewURL(bannerMedia);
  const logoPreviewURL = buildMediaPreviewURL(logoMedia);

  if (loading)
    return (
      <main className={styles.page}>
        <section className={styles.panel}>
          <p>Lade...</p>
        </section>
      </main>
    );

  return (
    <main className={styles.page}>
      <p className={styles.backLinks}>
        {isPlatformAdmin ? (
          <>
            <Link href="/admin">Admin</Link> /{" "}
            <Link href="/admin/fansubs">Fansubs</Link>
          </>
        ) : (
          <>
            <Link href="/manage/groups">Meine Gruppen</Link> /{" "}
            <span>{form.name.trim() || "Gruppe"}</span>
          </>
        )}
      </p>
      {toast ? <div className={styles.fansubEditToast}>{toast}</div> : null}

      <FansubEditWorkspaceSection
        styles={styles}
        fansubID={fansubID}
        group={group}
        capabilities={capabilities}
        isPlatformAdmin={isPlatformAdmin}
        hasAuthSession={hasAuthSession}
        isClientInitialized={isClientInitialized}
        activeMainTab={activeMainTab}
        availableMainTabs={availableMainTabs}
        onMainTabChange={handleMainTabChange}
        details={details}
        bannerPreviewURL={bannerPreviewURL}
        logoPreviewURL={logoPreviewURL}
        error={error}
        releaseData={releaseData}
        contributions={contributions}
        canUseProjectNotes={canUseProjectNotes}
        canOpenReleaseContributors={canOpenReleaseContributors}
        canUseReleaseMedia={canUseReleaseMedia}
        canUseReleaseNotes={canUseReleaseNotes}
        canUseAdminReleaseDetails={canUseAdminReleaseDetails}
        canOpenReleaseDrawer={canOpenReleaseDrawer}
        isSectionOpen={isSectionOpen}
        onSectionToggle={onSectionToggle}
        onToast={handleDetailsToast}
        onToggleAnime={toggleAnime}
        onOpenAnimeProjectNote={openAnimeProjectNote}
        onOpenReleaseDrawer={openReleaseDrawer}
        onOpenThemeDrawer={openThemeDrawer}
      />

      <ReleaseMediaDrawer
        styles={styles}
        drawer={drawer}
        capabilities={capabilities}
        hasAuthSession={hasAuthSession}
        canUseAdminReleaseDetails={canUseAdminReleaseDetails}
        canUseReleaseMedia={canUseReleaseMedia}
        canManageReleaseThemeAssets={canManageReleaseThemeAssets}
        selectedReleaseSegment={selectedReleaseSegment}
        releaseSegmentCards={releaseSegmentCards}
      />
    </main>
  );
}
