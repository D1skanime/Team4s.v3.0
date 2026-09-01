"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  formatBytes,
  formatDateTime,
  padEpisodeNumber,
} from "./episodeVersionEditorUtils";
import { EpisodeNavigationControls } from "./EpisodeNavigationControls";
import { ReleaseVersionMediaSection } from "./ReleaseVersionMediaSection";
import { ReleaseVersionNotesTab } from "./ReleaseVersionNotesTab";
import { useEpisodeNeighborNavigation } from "./useEpisodeNeighborNavigation";
import { useEpisodeVersionEditor } from "./useEpisodeVersionEditor";
import { SegmenteTab } from "./SegmenteTab";
import styles from "./EpisodeVersionEditor.module.css";
import { Button } from "@/components/ui/Button";
import { ReleaseVersionMetadataFields } from "./ReleaseVersionMetadataFields";

type ActiveTab =
  | "uebersicht"
  | "dateien"
  | "informationen"
  | "segmente"
  | "media"
  | "changelog"
  | "notizen";

const ACTIVE_TABS: ActiveTab[] = [
  "uebersicht",
  "dateien",
  "informationen",
  "segmente",
  "media",
  "changelog",
  "notizen",
];

function parsePositiveInt(value: string | null): number | null {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed;
}

function parseActiveTab(value: string | null): ActiveTab {
  return ACTIVE_TABS.includes(value as ActiveTab)
    ? (value as ActiveTab)
    : "informationen";
}

function getSafeReturnPath(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("\\") || trimmed.includes("://")) return null;

  try {
    const parsed = new URL(trimmed, "http://team4s.local");
    if (parsed.origin !== "http://team4s.local") return null;

    const isAdminFansubWorkspace = /^\/admin\/fansubs\/\d+\/edit$/.test(
      parsed.pathname,
    );
    const isMemberProjectWorkspace = /^\/me\/projects\/\d+\/group\/\d+$/.test(
      parsed.pathname,
    );
    if (!isAdminFansubWorkspace && !isMemberProjectWorkspace) return null;

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
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
  const visibleActiveTab: ActiveTab = allowedTabs.has(activeTab)
    ? activeTab
    : allowedTabs.has("segmente")
      ? "segmente"
      : allowedTabs.has("media")
      ? "media"
      : allowedTabs.has("notizen")
        ? "notizen"
        : activeTab;

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
        {/* Breadcrumb */}
        <nav className={styles.topLinks}>
          <Link href="/admin/anime">Anime</Link>
          <span>/</span>
          {animeTitle ? (
            <>
              <Link href={animeHref}>{animeTitle}</Link>
              <span>/</span>
            </>
          ) : null}
          <Link href={episodesHref}>{breadcrumbEpisodeLabel}</Link>
          <span>/</span>
          <span style={{ color: "#1c1c1e" }}>{breadcrumbVersionLabel}</span>
        </nav>

        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>
              {!isCapabilityScopeReady
                ? "Editor"
                : isPlatformAdmin
                  ? "Admin Editor"
                  : isContributorScopedEditor
                    ? "Contributor Editor"
                    : "Editor"}
            </p>
            <h1 className={styles.title}>
              {animeTitle || "Episode-Version bearbeiten"}
              {version ? (
                <span className={styles.titleMeta}>
                  {" \u00B7 "}
                  {breadcrumbEpisodeLabel}
                  {groupName ? (
                    <>
                      {" \u00B7 "}
                      {fansubGroupHref != null &&
                      selectedGroups.length === 1 ? (
                        <Link
                          href={fansubGroupHref}
                          className={styles.subtitleGroupLink}
                        >
                          {groupName}
                        </Link>
                      ) : (
                        groupName
                      )}
                      {" "}
                      {segmentVersion}
                    </>
                  ) : null}
                </span>
              ) : null}
            </h1>
          </div>
          <div className={styles.headerActions}>
            {editor.hasUnsavedChanges ? (
              <span className={styles.unsavedBadge}>
                Ungespeicherte Änderungen
              </span>
            ) : null}
            {version ? (
              <EpisodeNavigationControls
                prevVersionId={neighborNav.prevVersionId}
                prevEpisodeNumber={neighborNav.prevEpisodeNumber}
                nextVersionId={neighborNav.nextVersionId}
                nextEpisodeNumber={neighborNav.nextEpisodeNumber}
                currentIndex={neighborNav.currentIndex}
                totalCount={neighborNav.totalCount}
                isLoading={neighborNav.isLoading}
                activeTab={visibleActiveTab}
              />
            ) : null}
          </div>
        </header>

        {scopeError ? (
          <div className={styles.errorBox}>{scopeError}</div>
        ) : null}
        {editor.errorMessage ? (
          <div className={styles.errorBox}>{editor.errorMessage}</div>
        ) : null}
        {editor.successMessage ? (
          <div className={styles.successBox}>{editor.successMessage}</div>
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
            {shouldRenderAdminTabs || shouldRenderContributorTabs ? (
              <div className={styles.tabNav}>
                {shouldRenderContributorTabs ? (
                <>
                  {allowedTabs.has("informationen") ? (
                    <button
                      type="button"
                      className={
                        visibleActiveTab === "informationen"
                          ? styles.tabActive
                          : styles.tab
                      }
                      onClick={() => handleTabChange("informationen")}
                    >
                      Informationen
                    </button>
                  ) : null}
                  {allowedTabs.has("segmente") ? (
                    <button
                      type="button"
                      className={
                        visibleActiveTab === "segmente" ? styles.tabActive : styles.tab
                      }
                      onClick={() => handleTabChange("segmente")}
                    >
                      Segmente
                    </button>
                  ) : null}
                  {allowedTabs.has("media") ? (
                    <button
                      type="button"
                      className={
                        visibleActiveTab === "media" ? styles.tabActive : styles.tab
                      }
                      onClick={() => handleTabChange("media")}
                    >
                      Media / Assets
                    </button>
                  ) : null}
                  {allowedTabs.has("notizen") ? (
                    <button
                      type="button"
                      className={
                        visibleActiveTab === "notizen" ? styles.tabActive : styles.tab
                      }
                      onClick={() => handleTabChange("notizen")}
                    >
                      Notizen / Beiträge
                    </button>
                  ) : null}
                </>
              ) : shouldRenderAdminTabs ? (
                <>
                  <button
                    type="button"
                    className={
                      visibleActiveTab === "uebersicht" ? styles.tabActive : styles.tab
                    }
                    onClick={() => handleTabChange("uebersicht")}
                  >
                    Übersicht
                  </button>
                  <button
                    type="button"
                    className={
                      visibleActiveTab === "dateien" ? styles.tabActive : styles.tab
                    }
                    onClick={() => handleTabChange("dateien")}
                  >
                    Dateien
                  </button>
                  <button
                    type="button"
                    className={
                      visibleActiveTab === "informationen"
                        ? styles.tabActive
                        : styles.tab
                    }
                    onClick={() => handleTabChange("informationen")}
                  >
                    Informationen
                  </button>
                  <button
                    type="button"
                    className={
                      visibleActiveTab === "segmente" ? styles.tabActive : styles.tab
                    }
                    onClick={() => handleTabChange("segmente")}
                  >
                    Segmente
                  </button>
                  <button
                    type="button"
                    className={
                      visibleActiveTab === "media" ? styles.tabActive : styles.tab
                    }
                    onClick={() => handleTabChange("media")}
                  >
                    Media / Assets
                  </button>
                  <button
                    type="button"
                    className={
                      visibleActiveTab === "changelog" ? styles.tabActive : styles.tab
                    }
                    onClick={() => handleTabChange("changelog")}
                  >
                    Changelog
                  </button>
                  <button
                    type="button"
                    className={
                      visibleActiveTab === "notizen" ? styles.tabActive : styles.tab
                    }
                    onClick={() => handleTabChange("notizen")}
                  >
                    Notizen / Beiträge
                  </button>
                </>
                ) : null}
              </div>
            ) : null}

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
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Übersicht</h2>
                    <p className={styles.helperText}>
                      Zusammenfassung dieser Episode-Version.
                    </p>
                  </div>
                </div>
                <div className={styles.stubInfo}>
                  <p className={styles.helperText}>
                    Anime: {animeTitle || "\u2014"}
                  </p>
                  <p className={styles.helperText}>
                    Episode:{" "}
                    {episodeNumber != null
                      ? padEpisodeNumber(episodeNumber)
                      : "\u2014"}
                  </p>
                  {groupName ? (
                    <p className={styles.helperText}>Gruppe: {groupName}</p>
                  ) : null}
                  <p
                    className={styles.helperText}
                    style={{ marginTop: 8, fontStyle: "italic" }}
                  >
                    Eine detaillierte Übersicht wird in einem späten Plan
                    ergänzt.
                  </p>
                </div>
              </section>
            ) : null}

            {/* Dateien tab stub */}
            {allowedTabs.has("dateien") && visibleActiveTab === "dateien" ? (
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Dateien</h2>
                    <p className={styles.helperText}>
                      Medien-Datei-Verwaltung für diese Version.
                    </p>
                  </div>
                  <button
                    className={styles.secondaryButton}
                    type="button"
                    onClick={() => void editor.handleScanFolder()}
                    disabled={editor.isScanning}
                  >
                    {editor.isScanning
                      ? "Ordner wird gelesen..."
                      : "Ordner synchronisieren"}
                  </button>
                </div>

                <label className={styles.field}>
                  <span>Stream Link</span>
                  <input
                    value={editor.formState.streamURL}
                    onChange={(event) =>
                      editor.setFormState((current) => ({
                        ...current,
                        streamURL: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className={styles.fileCard}>
                  <div className={styles.fileCardHeader}>
                    <h3 className={styles.fileCardTitle}>Ausgewählte Datei</h3>
                    <button
                      className={styles.ghostButton}
                      type="button"
                      onClick={() =>
                        editor.setShowFilePanel((current) => !current)
                      }
                    >
                      {editor.showFilePanel
                        ? "Auswahl schließen"
                        : "Datei wechseln"}
                    </button>
                  </div>
                  {editor.selectedFile ? (
                    <div className={styles.fileStats}>
                      <span>Datei: {editor.selectedFile.file_name}</span>
                      <span>
                        Größe:{" "}
                        {formatBytes(editor.selectedFile.file_size_bytes)}
                      </span>
                      <span>
                        Qualität:{" "}
                        {editor.selectedFile.video_quality ||
                          editor.formState.videoQuality ||
                          "n/a"}
                      </span>
                      <span>Media ID: {editor.selectedFile.media_item_id}</span>
                      <span>
                        Geändert:{" "}
                        {formatDateTime(editor.selectedFile.last_modified)}
                      </span>
                      <span>
                        Erkannte Episode:{" "}
                        {editor.selectedFile.detected_episode_number || "n/a"}
                      </span>
                    </div>
                  ) : (
                    <p className={styles.helperText}>
                      Noch keine Datei ausgewählt.
                    </p>
                  )}
                </div>

                {editor.showFilePanel ? (
                  <div className={styles.filePanel}>
                    {editor.availableFiles.length > 0 ? (
                      editor.availableFiles.map((file) => (
                        <button
                          key={`${file.media_item_id}-${file.path}`}
                          type="button"
                          className={styles.fileOption}
                          onClick={() => editor.applyFile(file)}
                        >
                          <strong>{file.file_name}</strong>
                          <span>{file.video_quality || "n/a"}</span>
                          <span>{formatBytes(file.file_size_bytes)}</span>
                          <span>{formatDateTime(file.last_modified)}</span>
                          <span>
                            Episode: {file.detected_episode_number || "n/a"}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className={styles.helperText}>
                        Nach der Synchronisierung erscheinen hier auswaehlbare
                        Dateien.
                      </p>
                    )}
                  </div>
                ) : null}

                <details
                  className={styles.advancedPanel}
                  open={editor.advancedMode}
                  onToggle={(event) =>
                    editor.setAdvancedMode(event.currentTarget.open)
                  }
                >
                  <summary>Advanced Mode: manuelle Media-Override</summary>
                  <div className={styles.grid}>
                    <label className={styles.field}>
                      <span>Media Provider</span>
                      <input
                        value={editor.formState.mediaProvider}
                        onChange={(event) =>
                          editor.setFormState((current) => ({
                            ...current,
                            mediaProvider: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Jellyfin Media ID</span>
                      <input
                        value={editor.formState.mediaItemID}
                        onChange={(event) =>
                          editor.setFormState((current) => ({
                            ...current,
                            mediaItemID: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </details>
              </section>
            ) : null}

            {/* Informationen tab — main metadata form */}
            {allowedTabs.has("informationen") &&
            visibleActiveTab === "informationen" ? (
              <>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>Basisdaten</h2>
                      <p className={styles.helperText}>
                        Release-Metadaten für diese Version.
                      </p>
                    </div>
                  </div>
                  <ReleaseVersionMetadataFields
                    context={editor.contextData}
                    formState={editor.formState}
                    setFormState={editor.setFormState}
                    projectTimeline={projectTimeline}
                  />
                </section>

{isPlatformAdmin ? (
                  <>
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>Speicherort</h2>
                      <p className={styles.helperText}>
                        Der verknüpfte Anime-Ordner zur Plausibilitätsprüfung.
                      </p>
                    </div>
                  </div>
                  <label className={styles.field}>
                    <span>Anime Folder Path</span>
                    <input
                      value={editor.folderPath || "nicht verfügbar"}
                      readOnly
                    />
                  </label>
                </section>

                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <div>
                      <h2 className={styles.sectionTitle}>Fansub Gruppen</h2>
                      <p className={styles.helperText}>
                        Suche nach Gruppenname oder Alias. Mehrere Gruppen
                        werden als Kollaboration gespeichert.
                      </p>
                    </div>
                  </div>

                  <label className={styles.field}>
                    <span>Gruppe suchen</span>
                    <input
                      value={editor.groupQuery}
                      onChange={(event) =>
                        editor.setGroupQuery(event.target.value)
                      }
                      placeholder="Name oder Alias..."
                    />
                  </label>

                  {editor.isSearching ? (
                    <p className={styles.helperText}>Suche läuft...</p>
                  ) : null}
                  {editor.searchMessage ? (
                    <p className={styles.helperText}>{editor.searchMessage}</p>
                  ) : null}
                  {editor.groupResults.length > 0 ? (
                    <div className={styles.groupSearchList}>
                      {editor.groupResults.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          className={styles.groupSearchItem}
                          onClick={() => editor.addGroup(group)}
                        >
                          <strong>{group.name}</strong>
                          <span>
                            {"Gruppe"}{" "}
                            | {group.slug}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <div className={styles.chipRow}>
                    {editor.selectedGroups.length > 0 ? (
                      editor.selectedGroups.map((group) => (
                        <button
                          key={group.id}
                          type="button"
                          className={styles.chip}
                          title={`Slug: ${group.slug}`}
                          onClick={() => editor.removeGroup(group.id)}
                        >
                          {group.name} x
                        </button>
                      ))
                    ) : (
                      <span className={styles.helperText}>
                        Keine Gruppe ausgewählt.
                      </span>
                    )}
                  </div>
                </section>
                  </>
                ) : null}
              </>
            ) : null}

            {/* Segmente tab */}
            {allowedTabs.has("segmente") && visibleActiveTab === "segmente" ? (
              <SegmenteTab
                animeId={segmentAnimeId}
                groupId={segmentGroupId}
                version={segmentVersion}
                episodeNumber={episodeNumber}
                durationSeconds={editor.contextData?.version.duration_seconds}
                releaseVariantId={editor.contextData?.version.id ?? null}
              />
            ) : null}

            {/* Media / Assets tab */}
            {allowedTabs.has("media") && visibleActiveTab === "media" ? (
              <section className={styles.card}>
                {/* Context card — D-04/D-07: fansub group + release version title */}
                <div className={styles.mediaContextCard}>
                  <span className={styles.mediaContextLabel}>
                    Fansub-Gruppe
                  </span>
                  <span className={styles.mediaContextValue}>
                    {groupName ?? "–"}
                  </span>
                  <span className={styles.mediaContextLabel}>
                    Release-Version
                  </span>
                  <span className={styles.mediaContextValue}>
                    {segmentVersion ?? "–"}
                  </span>
                </div>
                <ReleaseVersionMediaSection
                  versionId={version.id}
                  fansubGroupName={groupName ?? "–"}
                  releaseVersionLabel={segmentVersion ?? "–"}
                />
              </section>
            ) : null}

            {/* Changelog tab stub */}
            {allowedTabs.has("changelog") && visibleActiveTab === "changelog" ? (
              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>Changelog</h2>
                    <p className={styles.helperText}>
                      Änderungshistorie dieser Episode-Version.
                    </p>
                  </div>
                </div>
                <p
                  className={styles.helperText}
                  style={{ fontStyle: "italic" }}
                >
                  Changelog-Einträge werden in einem späten Plan ergänzt.
                </p>
              </section>
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

            <section className={styles.actionBar}>
              <Link href={backHref} className={styles.secondaryButton}>
                Zurück
              </Link>
              {fansubGroupHref != null && selectedGroups.length === 1 ? (
                <Button href={fansubGroupHref} variant="secondary">
                  Zur Fansubgruppe
                </Button>
              ) : null}
              {isPlatformAdmin || (canEditMetadata && visibleActiveTab === "informationen") ? (
                <>
                  <button
                    className={`${styles.primaryButton} ${styles.successButton}`}
                    type="submit"
                    disabled={editor.isSaving}
                  >
                    {editor.isSaving ? (
                      <span className={styles.spinner} aria-hidden="true" />
                    ) : null}
                    {editor.isSaving ? "Speichert..." : "Speichern"}
                  </button>
                  {isPlatformAdmin ? (
                  <button
                    className={styles.dangerButton}
                    type="button"
                    onClick={() => void editor.handleDelete()}
                    disabled={editor.isDeleting}
                  >
                    {editor.isDeleting ? "Löscht..." : "Löschen"}
                  </button>
                  ) : null}
                </>
              ) : null}
            </section>
          </form>
        ) : null}
      </div>
    </main>
  );
}
