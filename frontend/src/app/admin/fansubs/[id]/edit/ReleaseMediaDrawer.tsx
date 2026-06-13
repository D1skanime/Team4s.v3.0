"use client";

import { X } from "lucide-react";

import type { FansubGroupCapabilities } from "@/types/fansub";
import { Button } from "@/components/ui";
import { ReleaseVersionMediaDrawerSummary } from "./ReleaseVersionMediaDrawerSummary";
import { ReleaseVersionMediaReviewSection } from "./ReleaseVersionMediaReviewSection";
import { ReleaseThemeDrawerSection } from "./ReleaseThemeDrawerSection";
import { releaseDrawerTitle } from "./fansubEditFormatters";
import { animeFansubReleaseContextKey } from "./fansubEditReleaseHelpers";
import type { ReleaseSegmentCard, SelectedReleaseSegment } from "./fansubEditTypes";
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
  capabilities,
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
    selectedFansubGroupId,
    themeUploadInputRef,
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
  const releaseDrawerTabs = drawerRelease
    ? [
        ...(canUseAdminReleaseDetails
          ? [{ key: "details" as const, label: "Details", disabled: false }]
          : []),
        ...(canUseReleaseMedia
          ? [{ key: "media" as const, label: "Media", disabled: false }]
          : []),
      ]
    : [];

  return (
    <>
      {releaseDrawerOpen && drawerRelease ? (
        <div
          className={styles.fansubEditReleaseDrawerOverlay}
          onClick={closeReleaseDrawer}
        >
          <aside
            className={styles.fansubEditReleaseDrawer}
            aria-label="Release bearbeiten"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.fansubEditReleaseDrawerHeader}>
              <div>
                <div className={styles.fansubEditReleaseDrawerTitleRow}>
                  <h2>{releaseDrawerTitle(drawerRelease)}</h2>
                </div>
                <p>
                  {drawerRelease.fansub_name} · {drawerRelease.version_count}{" "}
                  Version{drawerRelease.version_count === 1 ? "" : "en"}
                </p>
              </div>
              <button
                type="button"
                className={styles.fansubEditReleaseExpandButton}
                onClick={closeReleaseDrawer}
                aria-label="Drawer schließen"
              >
                <X size={16} />
              </button>
            </header>

            <div
              className={styles.fansubEditReleaseDrawerTabs}
              role="tablist"
              aria-label="Release Drawer Bereiche"
            >
              {releaseDrawerTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={
                    drawerTab === tab.key
                      ? styles.fansubEditReleaseDrawerTabActive
                      : undefined
                  }
                  disabled={tab.disabled}
                  aria-disabled={tab.disabled}
                  onClick={() => {
                    if (!tab.disabled) setDrawerTab(tab.key);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.fansubEditReleaseDrawerBody}>
              {drawerReleaseLoading ? (
                <div className={styles.fansubEditReleaseState}>
                  Release-Details werden geladen...
                </div>
              ) : null}
              {drawerReleaseError ? (
                <div className={styles.errorBox}>{drawerReleaseError}</div>
              ) : null}
              {drawerTab === "details" && canUseAdminReleaseDetails ? (
                <div className={styles.fansubEditReleaseDrawerPanel}>
                  <div className={styles.fansubEditReleaseDrawerDetailGrid}>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Release-ID</span>
                      <strong>
                        {String(selectedReleaseId ?? drawerRelease.release_id)}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Anime-ID</span>
                      <strong>
                        {String(selectedAnimeId ?? drawerRelease.anime_id)}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Fansub-Gruppe</span>
                      <strong>
                        {String(
                          selectedFansubGroupId ??
                            drawerRelease.fansub_group_id,
                        )}
                      </strong>
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
                        {(drawerRelease.episode_title || "").trim() ||
                          "Ohne Episodentitel"}
                      </strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Versionen</span>
                      <strong>{String(drawerRelease.version_count)}</strong>
                    </div>
                    <div className={styles.fansubEditReleaseDrawerDetailItem}>
                      <span>Datum</span>
                      <strong>
                        {new Date(drawerRelease.created_at).toLocaleDateString(
                          "de-CH",
                        )}
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
              ) : null}

              {drawerTab === "media" && canUseReleaseMedia ? (
                <div className={styles.fansubEditReleaseDrawerPanel}>
                  {drawerRelease.release_version_id > 0 ? (
                    <>
                      <ReleaseVersionMediaDrawerSummary
                        versionId={drawerRelease.release_version_id}
                        fansubName={drawerRelease.fansub_name}
                        releaseVersionLabel={`Release-Version ${drawerRelease.release_version_id}`}
                      />
                      {capabilities ? (
                        <ReleaseVersionMediaReviewSection
                          versionId={drawerRelease.release_version_id}
                          capabilities={capabilities}
                        />
                      ) : null}
                    </>
                  ) : (
                    <div className={styles.fansubEditReleaseState}>
                      Für diesen Release ist keine konkrete Release-Version verfügbar.
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <Button
                type="button"
                variant="secondary"
                onClick={closeReleaseDrawer}
              >
                Schließen
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
      <ReleaseThemeDrawerSection
        styles={styles}
        themeDrawerOpen={themeDrawerOpen}
        selectedReleaseSegment={selectedReleaseSegment}
        hasAuthSession={hasAuthSession}
        canManageReleaseThemeAssets={canManageReleaseThemeAssets}
        drawerError={drawerError}
        drawerBusy={drawerBusy}
        drawerUploadProgress={drawerUploadProgress}
        themeUploadName={themeUploadName}
        themePreviewOpen={themePreviewOpen}
        setThemePreviewOpen={setThemePreviewOpen}
        themeUploadInputRef={themeUploadInputRef}
        closeThemeDrawer={closeThemeDrawer}
        handleThemeUploadInputChange={handleThemeUploadInputChange}
        handleDrawerUploadClick={handleDrawerUploadClick}
        handleDrawerDelete={handleDrawerDelete}
      />
    </>
  );
}
