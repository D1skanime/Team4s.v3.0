"use client";

import type { FansubGroupCapabilities } from "@/types/fansub";
import { Button, Drawer, Tabs } from "@/components/ui";
import type { TabItem } from "@/components/ui";
import { ReleaseVersionMediaSection } from "@/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection";
import { ReleaseThemeDrawerSection } from "./ReleaseThemeDrawerSection";
import { releaseDrawerTitle, releaseFansubDisplayName } from "./fansubEditFormatters";
import { animeFansubReleaseContextKey } from "./fansubEditReleaseHelpers";
import type { ReleaseDrawerTab, ReleaseSegmentCard, SelectedReleaseSegment } from "./fansubEditTypes";
import type { ReleaseMediaDrawer as ReleaseMediaDrawerState } from "./useReleaseMediaDrawer";

type ReleaseMediaDrawerProps = {
  styles: Record<string, string>;
  drawer: ReleaseMediaDrawerState;
  capabilities: FansubGroupCapabilities | null;
  hasAuthSession: boolean;
  canUseAdminReleaseDetails: boolean;
  canUseReleaseMedia: boolean;
  canManageReleaseThemeAssets: boolean;
  // Geteilter Cockpit-State (Wave 3 / Parent):
  selectedReleaseSegment: SelectedReleaseSegment | null;
  releaseSegmentCards: Record<number, ReleaseSegmentCard[]>;
};

export function ReleaseMediaDrawer({
  styles,
  drawer,
  hasAuthSession,
  canUseAdminReleaseDetails,
  canUseReleaseMedia,
  canManageReleaseThemeAssets,
  selectedReleaseSegment,
  releaseSegmentCards,
}: ReleaseMediaDrawerProps) {
  const {
    releaseDrawerOpen,
    drawerRelease,
    drawerTab,
    setDrawerTab,
    drawerReleaseLoading,
    drawerReleaseError,
    themeDrawerOpen,
    drawerBusy,
    drawerUploadProgress,
    themePreviewOpen,
    setThemePreviewOpen,
    drawerError,
    themeUploadName,
    selectedReleaseId,
    selectedAnimeFansubContextKey,
    selectedAnimeId,
    closeReleaseDrawer,
    closeThemeDrawer,
    handleDrawerUploadClick,
    handleThemeUploadInputChange,
    handleDrawerDelete,
  } = drawer;

  const drawerReleaseCards = drawerRelease
    ? (releaseSegmentCards[drawerRelease.release_id] ?? [])
    : [];
  const drawerReleaseReleaseAssetCount = drawerReleaseCards.filter(
    (card) => card.status === "release",
  ).length;
  const drawerReleaseGlobalAssetCount = drawerReleaseCards.filter(
    (card) => card.status === "global",
  ).length;
  const drawerReleaseMissingAssetCount = drawerReleaseCards.filter(
    (card) => card.status === "missing",
  ).length;
  const drawerReleaseThemeSummary =
    drawerReleaseCards.length > 0
      ? `${drawerReleaseReleaseAssetCount} Release / ${drawerReleaseGlobalAssetCount} Global / ${drawerReleaseMissingAssetCount} offen`
      : drawerRelease?.has_theme_assets
        ? "Theme-Assets vorhanden"
        : "Keine Theme-Assets";
  const drawerFansubName = drawerRelease
    ? releaseFansubDisplayName(drawerRelease)
    : "";
  const drawerEpisodeLabel = drawerRelease
    ? (drawerRelease.episode_title || "").trim() ||
      `Episode ${drawerRelease.episode_number || "?"}`
    : "";

  const detailsPanel = drawerRelease ? (
    <div className={styles.fansubEditReleaseDrawerPanel}>
      <div className={styles.fansubEditReleaseDrawerDetailGrid}>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Release-ID</span>
          <strong>{String(selectedReleaseId ?? drawerRelease.release_id)}</strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Anime-ID</span>
          <strong>{String(selectedAnimeId ?? drawerRelease.anime_id)}</strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Fansub-Gruppe</span>
          <strong>{drawerFansubName}</strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Kontext-Key</span>
          <strong>
            {selectedAnimeFansubContextKey ??
              animeFansubReleaseContextKey(
                drawerRelease.fansub_group_id,
                drawerRelease.anime_id,
              )}
          </strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Anime</span>
          <strong>{drawerRelease.anime_title}</strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Episode</span>
          <strong>{drawerRelease.episode_number || "?"}</strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Titel</span>
          <strong>
            {(drawerRelease.episode_title || "").trim() || "Ohne Episodentitel"}
          </strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Versionen</span>
          <strong>{String(drawerRelease.version_count)}</strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Datum</span>
          <strong>
            {new Date(drawerRelease.created_at).toLocaleDateString("de-CH")}
          </strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Theme-Übersicht</span>
          <strong>{drawerReleaseThemeSummary}</strong>
        </div>
        <div className={styles.fansubEditReleaseDrawerDetailItem}>
          <span>Theme-Definitionen</span>
          <strong>
            {drawerReleaseCards.length > 0
              ? `${drawerReleaseCards.length} geladen`
              : "Noch keine geladen"}
          </strong>
        </div>
      </div>
    </div>
  ) : null;

  const mediaPanel = drawerRelease ? (
    <div className={styles.fansubEditReleaseDrawerPanel}>
      {drawerRelease.release_version_id > 0 ? (
        <ReleaseVersionMediaSection
          versionId={drawerRelease.release_version_id}
          contextTitle={drawerEpisodeLabel + " · " + drawerFansubName + " · Release-Version " + drawerRelease.release_version_id}
        />
      ) : (
        <div className={styles.fansubEditReleaseState}>
          Für diesen Release ist keine konkrete Release-Version verfügbar.
        </div>
      )}
    </div>
  ) : null;

  const releaseDrawerTabs: TabItem[] = drawerRelease
    ? [
        ...(canUseAdminReleaseDetails
          ? [{ id: "details", label: "Details", content: detailsPanel }]
          : []),
        ...(canUseReleaseMedia
          ? [{ id: "media", label: "Media", content: mediaPanel }]
          : []),
      ]
    : [];

  return (
    <>
      <Drawer
        open={releaseDrawerOpen && Boolean(drawerRelease)}
        onClose={closeReleaseDrawer}
        title={drawerRelease ? releaseDrawerTitle(drawerRelease) : ""}
        description={
          drawerRelease
            ? `${drawerFansubName} · ${drawerRelease.version_count} Version${drawerRelease.version_count === 1 ? "" : "en"}`
            : undefined
        }
        footer={
          <Button type="button" variant="secondary" onClick={closeReleaseDrawer}>
            Schließen
          </Button>
        }
      >
        {drawerReleaseLoading ? (
          <div className={styles.fansubEditReleaseState}>
            Release-Details werden geladen...
          </div>
        ) : null}
        {drawerReleaseError ? (
          <div className={styles.errorBox}>{drawerReleaseError}</div>
        ) : null}
        {drawerRelease && releaseDrawerTabs.length > 0 ? (
          <Tabs
            items={releaseDrawerTabs}
            activeId={drawerTab}
            onActiveIdChange={(id) => setDrawerTab(id as ReleaseDrawerTab)}
          />
        ) : null}
      </Drawer>
      <ReleaseThemeDrawerSection
        styles={styles}
        themeDrawerOpen={themeDrawerOpen}
        selectedReleaseSegment={selectedReleaseSegment}
        hasAuthSession={hasAuthSession}
        canUseAdminReleaseDetails={canUseAdminReleaseDetails}
        canManageReleaseThemeAssets={canManageReleaseThemeAssets}
        drawerError={drawerError}
        drawerBusy={drawerBusy}
        drawerUploadProgress={drawerUploadProgress}
        themeUploadName={themeUploadName}
        themePreviewOpen={themePreviewOpen}
        setThemePreviewOpen={setThemePreviewOpen}
        closeThemeDrawer={closeThemeDrawer}
        handleThemeUploadInputChange={handleThemeUploadInputChange}
        handleDrawerUploadClick={handleDrawerUploadClick}
        handleDrawerDelete={handleDrawerDelete}
      />
    </>
  );
}
