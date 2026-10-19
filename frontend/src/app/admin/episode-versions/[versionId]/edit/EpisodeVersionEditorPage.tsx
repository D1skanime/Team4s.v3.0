"use client";

import { buildFansubReleaseHref } from "@/lib/fansubProjectRoutes";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  getAnimeFansubProjectTimeline,
  getCurrentUser,
  getReleaseVersionCapabilities,
} from "@/lib/api";
import { useAuthSession } from "@/lib/useAuthSession";
import type { CurrentUserData } from "@/types/auth";
import type { ReleaseVersionCapabilities } from "@/types/releaseVersionMedia";
import type { AnimeFansubProjectTimeline } from "@/types/fansubNotes";

import {
  type ActiveTab,
  getSafeReturnPath,
  padEpisodeNumber,
  parseActiveTab,
  resolveVisibleActiveTab,
} from "./episodeVersionEditorUtils";
import { ReleaseVersionMediaSection } from "./ReleaseVersionMediaSection";
import { ReleaseVersionNotesTab } from "./ReleaseVersionNotesTab";
import { useEpisodeNeighborNavigation } from "./useEpisodeNeighborNavigation";
import { useEpisodeVersionEditor } from "./useEpisodeVersionEditor";
import { SegmenteTab } from "./SegmenteTab";
import { JellyfinEnrichmentNotice } from "./JellyfinEnrichmentNotice";
import styles from "./EpisodeVersionEditor.module.css";
import { EpisodeVersionTabNav } from "./EpisodeVersionTabNav";
import { DateienTabSection } from "./DateienTabSection";
import { InformationenTabSection } from "./InformationenTabSection";
import { EpisodeVersionHeader } from "./EpisodeVersionHeader";
import { UebersichtTabSection } from "./UebersichtTabSection";
import { ChangelogTabSection } from "./ChangelogTabSection";
import { EpisodeVersionActionBar } from "./EpisodeVersionActionBar";

export type { ActiveTab };
export { resolveVisibleActiveTab };

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

export function EpisodeVersionEditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { hasAccessToken, hasRefreshToken, isClientInitialized } =
    useAuthSession();
  const hasAuthSession = hasAccessToken || hasRefreshToken;
  const editor = useEpisodeVersionEditor();
  const version = editor.contextData?.version;
  const [currentUser, setCurrentUser] = useState<CurrentUserData | null>(null);
  const [releaseCapabilities, setReleaseCapabilities] =
    useState<ReleaseVersionCapabilities | null>(null);
  const [projectTimeline, setProjectTimeline] =
    useState<AnimeFansubProjectTimeline | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const animeIDFromQuery = parsePositiveInt(searchParams.get("animeId"));
  const episodeIDFromQuery = parsePositiveInt(searchParams.get("episodeId"));

  const tabFromQuery = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<ActiveTab>(() =>
    parseActiveTab(tabFromQuery),
  );

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", tab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!isClientInitialized || !hasAuthSession || !version?.id) {
      return;
    }

    let cancelled = false;
    void Promise.all([
      getCurrentUser(),
      getReleaseVersionCapabilities(version.id),
    ])
      .then(([userResponse, capabilityResponse]) => {
        if (cancelled) return;
        setScopeError(null);
        setCurrentUser(userResponse.data);
        setReleaseCapabilities(capabilityResponse.data);
      })
      .catch(() => {
        if (!cancelled)
          setScopeError(
            "Berechtigungen für diese Release-Version konnten nicht geladen werden.",
          );
      });

    return () => {
      cancelled = true;
    };
  }, [hasAuthSession, isClientInitialized, version?.id]);

  useEffect(() => {
    const fansubId = editor.selectedGroups[0]?.id;
    const animeId = editor.contextData?.version.anime_id;
    if (!fansubId || !animeId) {
      queueMicrotask(() => setProjectTimeline(null));
      return;
    }

    let cancelled = false;
    void getAnimeFansubProjectTimeline(fansubId, animeId)
      .then((timeline) => {
        if (!cancelled) setProjectTimeline(timeline);
      })
      .catch(() => {
        if (!cancelled) setProjectTimeline(null);
      });

    return () => {
      cancelled = true;
    };
  }, [editor.contextData?.version.anime_id, editor.selectedGroups]);

  const segmentAnimeId = editor.contextData?.version.anime_id ?? null;
  const selectedGroups = editor.selectedGroups;
  const primaryGroup = selectedGroups[0] ?? null;
  const segmentGroupId = primaryGroup?.id ?? null;
  const segmentVersion: string | null =
    editor.contextData?.version.release_version?.trim() || "v1";
  const neighborNav = useEpisodeNeighborNavigation({
    animeId: segmentAnimeId,
    currentVersionId: version?.id ?? null,
    groupId: segmentGroupId,
    releaseVersion: segmentVersion ?? "v1",
  });

  const animeTitle = editor.contextData?.anime_title ?? "";
  const episodeNumber = version?.episode_number ?? null;
  const groupName =
    selectedGroups.length > 0
      ? selectedGroups.map((group) => group.name).join(" & ")
      : null;
  const isPlatformAdmin = currentUser?.is_platform_admin === true;
  const canUseContributorMedia = releaseCapabilities?.can_view_media === true;
  const canUseContributorNotes = releaseCapabilities?.can_edit_notes === true;
  const canManageSegments = releaseCapabilities?.can_manage_segments === true;
  const canEditMetadata = releaseCapabilities?.can_edit_metadata === true;
  const isCapabilityScopeReady =
    currentUser != null && releaseCapabilities != null;
  const isCapabilityScopeLoading =
    version != null && scopeError == null && !isCapabilityScopeReady;
  const isContributorScopedEditor =
    isCapabilityScopeReady &&
    !isPlatformAdmin &&
    (canUseContributorMedia || canUseContributorNotes || canManageSegments || canEditMetadata);
  const shouldRenderAdminTabs = isCapabilityScopeReady && isPlatformAdmin;
  const shouldRenderContributorTabs =
    isCapabilityScopeReady && isContributorScopedEditor;
  const hasNoVersionEditorAccess =
    isCapabilityScopeReady && !isPlatformAdmin && !isContributorScopedEditor;
  const allowedTabs = useMemo(() => {
    if (!isCapabilityScopeReady) {
      return new Set<ActiveTab>();
    }
    if (isPlatformAdmin) {
      return new Set<ActiveTab>([
        "uebersicht",
        "dateien",
        "informationen",
        "segmente",
        "media",
        "changelog",
        "notizen",
      ]);
    }
    const tabs: ActiveTab[] = [];
    if (canEditMetadata) tabs.push("informationen");
    if (canManageSegments) tabs.push("segmente");
    if (canUseContributorMedia) tabs.push("media");
    if (canUseContributorNotes) tabs.push("notizen");
    return new Set<ActiveTab>(tabs);
  }, [
    canManageSegments,
    canEditMetadata,
    canUseContributorMedia,
    canUseContributorNotes,
    isCapabilityScopeReady,
    isPlatformAdmin,
  ]);
  const visibleActiveTab: ActiveTab = resolveVisibleActiveTab(
    activeTab,
    allowedTabs,
  );

  const fansubGroupHref =
    primaryGroup != null
      ? `/admin/fansubs/${primaryGroup.id}/edit`
      : null;
  const returnHrefFromQuery = getSafeReturnPath(searchParams.get("return_to"));

  const backHref =
    returnHrefFromQuery ??
    (animeIDFromQuery && episodeIDFromQuery
      ? `/admin/anime/${animeIDFromQuery}/episodes/${episodeIDFromQuery}/versions`
      : fansubGroupHref != null
        ? `${fansubGroupHref}?tab=releases`
        : editor.contextData
          ? `/admin/anime/${editor.contextData.version.anime_id}/edit`
          : "/admin/anime");

  const publicReleaseHref =
    segmentAnimeId != null && segmentGroupId != null && version?.id != null
      ? buildFansubReleaseHref({
          animeID: segmentAnimeId,
          groupID: segmentGroupId,
          releaseVersionID: version.id,
        })
      : null;

  const animeHref = editor.contextData
    ? `/admin/anime/${editor.contextData.version.anime_id}/edit`
    : "/admin/anime";

  const episodesHref = editor.contextData
    ? `/admin/anime/${editor.contextData.version.anime_id}/episodes`
    : "/admin/anime";

  // Build breadcrumb parts
  const breadcrumbEpisodeLabel =
    episodeNumber != null
      ? `Episode ${padEpisodeNumber(episodeNumber)}`
      : "Episode";
  const breadcrumbVersionLabel = groupName
    ? `${groupName} ${segmentVersion}`
    : version
      ? `Version #${version.id}`
      : "Version";

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <EpisodeVersionHeader
          animeTitle={animeTitle}
          animeHref={animeHref}
          episodesHref={episodesHref}
          breadcrumbEpisodeLabel={breadcrumbEpisodeLabel}
          breadcrumbVersionLabel={breadcrumbVersionLabel}
          isCapabilityScopeReady={isCapabilityScopeReady}
          isPlatformAdmin={isPlatformAdmin}
          isContributorScopedEditor={isContributorScopedEditor}
          hasVersion={version != null}
          groupName={groupName}
          fansubGroupHref={fansubGroupHref}
          isSingleSelectedGroup={selectedGroups.length === 1}
          segmentVersion={segmentVersion}
          hasUnsavedChanges={editor.hasUnsavedChanges}
          neighborNav={neighborNav}
          visibleActiveTab={visibleActiveTab}
        />

        {scopeError ? (
          <div className={styles.errorBox}>{scopeError}</div>
        ) : null}
        {editor.errorMessage ? (
          <div className={styles.errorBox}>{editor.errorMessage}</div>
        ) : null}
        {editor.successMessage ? (
          <div className={styles.successBox}>{editor.successMessage}</div>
        ) : null}
        {editor.contextData?.jellyfin_enrichment_degraded ? (
          <JellyfinEnrichmentNotice />
        ) : null}

        {editor.isLoading ? (
          <section className={styles.card}>
            <p className={styles.helperText}>Lade Editor-Daten...</p>
          </section>
        ) : version && editor.contextData ? (
          <form
            className={styles.form}
            onSubmit={(event) => {
              if (!isPlatformAdmin && !canEditMetadata) {
                event.preventDefault();
                return;
              }
              void editor.handleSave(event, !isPlatformAdmin && canEditMetadata);
            }}
          >
            {/* 5-Tab navigation */}
            <EpisodeVersionTabNav
              shouldRenderAdminTabs={shouldRenderAdminTabs}
              shouldRenderContributorTabs={shouldRenderContributorTabs}
              allowedTabs={allowedTabs}
              visibleActiveTab={visibleActiveTab}
              handleTabChange={handleTabChange}
              publicReleaseHref={publicReleaseHref}
            />

            {isCapabilityScopeLoading ? (
              <section className={styles.card}>
                <p className={styles.helperText}>
                  Berechtigungen werden geladen...
                </p>
              </section>
            ) : null}
            {hasNoVersionEditorAccess ? (
              <section className={styles.card}>
                <p className={styles.helperText}>
                  Kein Zugriff auf diese Release-Version.
                </p>
              </section>
            ) : null}

            {/* Übersicht tab stub */}
            {allowedTabs.has("uebersicht") && visibleActiveTab === "uebersicht" ? (
              <UebersichtTabSection
                animeTitle={animeTitle}
                episodeNumber={episodeNumber}
                groupName={groupName}
              />
            ) : null}

            {/* Dateien tab stub */}
            {allowedTabs.has("dateien") && visibleActiveTab === "dateien" ? (
              <DateienTabSection editor={editor} />
            ) : null}

            {/* Informationen tab — main metadata form */}
            {allowedTabs.has("informationen") &&
            visibleActiveTab === "informationen" ? (
              <InformationenTabSection
                context={editor.contextData}
                formState={editor.formState}
                setFormState={editor.setFormState}
                projectTimeline={projectTimeline}
                isPlatformAdmin={isPlatformAdmin}
                folderPath={editor.folderPath}
                groupQuery={editor.groupQuery}
                setGroupQuery={editor.setGroupQuery}
                isSearching={editor.isSearching}
                searchMessage={editor.searchMessage}
                groupResults={editor.groupResults}
                selectedGroups={editor.selectedGroups}
                addGroup={editor.addGroup}
                removeGroup={editor.removeGroup}
              />
            ) : null}

            {/* Segmente tab */}
            {allowedTabs.has("segmente") && visibleActiveTab === "segmente" ? (
              <SegmenteTab
                animeId={segmentAnimeId}
                groupId={segmentGroupId}
                version={segmentVersion}
                episodeNumber={episodeNumber}
                chapterHints={editor.chapterHints}
                durationSeconds={editor.contextData?.version.duration_seconds}
                releaseVariantId={editor.contextData?.version.id ?? null}
              />
            ) : null}

            {/* Media / Assets tab */}
            {allowedTabs.has("media") && visibleActiveTab === "media" ? (
              <section className={styles.card}>
                <ReleaseVersionMediaSection
                  versionId={version.id}
                  contextTitle={
                    `${episodeNumber != null ? `Episode ${padEpisodeNumber(episodeNumber)}` : 'Episode'}${groupName ? ` · ${groupName}` : ''}${segmentVersion ? ` ${segmentVersion}` : ''}`
                  }
                  storyContext={{ animeId: segmentAnimeId, groupId: segmentGroupId, version: segmentVersion }}
                />
              </section>
            ) : null}

            {/* Changelog tab stub */}
            {allowedTabs.has("changelog") && visibleActiveTab === "changelog" ? (
              <ChangelogTabSection />
            ) : null}

            {/* Notizen / Beiträge tab */}
            {allowedTabs.has("notizen") && visibleActiveTab === "notizen" ? (
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Notizen / Beiträge</h2>
                    <p className={styles.helperText}>
                      Rollenbezogene Produktionsnotizen der beteiligten
                      Mitglieder.
                    </p>
                  </div>
                </div>
                <ReleaseVersionNotesTab versionId={version.id} />
              </section>
            ) : null}

            <EpisodeVersionActionBar
              backHref={backHref}
              fansubGroupHref={fansubGroupHref}
              isSingleSelectedGroup={selectedGroups.length === 1}
              isPlatformAdmin={isPlatformAdmin}
              canEditMetadata={canEditMetadata}
              visibleActiveTab={visibleActiveTab}
              isSaving={editor.isSaving}
              isDeleting={editor.isDeleting}
              onDelete={() => void editor.handleDelete()}
            />
          </form>
        ) : null}
      </div>
      {editor.confirmDialog}
    </main>
  );
}
