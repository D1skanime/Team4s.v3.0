"use client";

import { type MutableRefObject } from "react";
import { ExternalLink, X } from "lucide-react";

import { resolveApiUrl } from "@/lib/api";
import { Button, Modal } from "@/components/ui";
import {
  episodeReleaseTitle,
  themeSegmentEpisodeRange,
  themeSegmentTimeRange,
  timelineLabelFor,
} from "./fansubEditFormatters";
import { isJellyfinLocked } from "./fansubEditReleaseHelpers";
import type { SelectedReleaseSegment } from "./fansubEditTypes";

type ReleaseThemeDrawerSectionProps = {
  styles: Record<string, string>;
  themeDrawerOpen: boolean;
  selectedReleaseSegment: SelectedReleaseSegment | null;
  hasAuthSession: boolean;
  canManageReleaseThemeAssets: boolean;
  drawerError: string | null;
  drawerBusy: boolean;
  drawerUploadProgress: number | null;
  themeUploadName: string;
  themePreviewOpen: boolean;
  setThemePreviewOpen: (open: boolean) => void;
  themeUploadInputRef: MutableRefObject<HTMLInputElement | null>;
  closeThemeDrawer: () => void;
  handleThemeUploadInputChange: () => void;
  handleDrawerUploadClick: () => Promise<void>;
  handleDrawerDelete: () => Promise<void>;
};

export function ReleaseThemeDrawerSection({
  styles,
  themeDrawerOpen,
  selectedReleaseSegment,
  hasAuthSession,
  canManageReleaseThemeAssets,
  drawerError,
  drawerBusy,
  drawerUploadProgress,
  themeUploadName,
  themePreviewOpen,
  setThemePreviewOpen,
  themeUploadInputRef,
  closeThemeDrawer,
  handleThemeUploadInputChange,
  handleDrawerUploadClick,
  handleDrawerDelete,
}: ReleaseThemeDrawerSectionProps) {
  const themeSelectedCard = selectedReleaseSegment?.card ?? null;
  const themeSelectedLocked = themeSelectedCard
    ? themeSelectedCard.status === "global" ||
      isJellyfinLocked(themeSelectedCard) ||
      Boolean(themeSelectedCard.release_asset_upload_locked)
    : false;
  const themePrimarySegment = themeSelectedCard?.segments[0] ?? null;
  const themeAssetPreviewUrl = themeSelectedCard?.public_url
    ? resolveApiUrl(themeSelectedCard.public_url)
    : null;
  const themePreviewDescription =
    selectedReleaseSegment && themeSelectedCard
      ? `${episodeReleaseTitle(selectedReleaseSegment.release)} · ${timelineLabelFor(themeSelectedCard.theme_type_name)}`
      : undefined;
  const drawerUploadStatusLabel =
    drawerUploadProgress === null
      ? null
      : drawerUploadProgress >= 100
        ? "Upload angekommen, wird gespeichert..."
        : `Upload: ${drawerUploadProgress}%`;

  return (
    <>
      {themeDrawerOpen && selectedReleaseSegment && themeSelectedCard ? (
        <div
          className={styles.fansubEditReleaseDrawerOverlay}
          onClick={closeThemeDrawer}
        >
          <aside
            className={`${styles.fansubEditReleaseDrawer} ${styles.fansubEditThemeDrawer}`}
            aria-label="Theme bearbeiten"
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.fansubEditReleaseDrawerHeader}>
              <div>
                <p className={styles.fansubEditHint}>
                  {episodeReleaseTitle(selectedReleaseSegment.release)}
                </p>
                <h2>
                  {timelineLabelFor(themeSelectedCard.theme_type_name)}{" "}
                  bearbeiten
                </h2>
                <p>{themeSelectedCard.theme_title || "Ohne Titel"}</p>
              </div>
              <button
                type="button"
                className={styles.fansubEditReleaseExpandButton}
                onClick={closeThemeDrawer}
                aria-label="Theme Drawer schließen"
              >
                <X size={16} />
              </button>
            </header>
            <div className={styles.fansubEditReleaseDrawerBody}>
              <div
                className={`${styles.fansubEditReleaseDrawerPanel} ${styles.fansubEditThemeDrawerPanel}`}
              >
                {drawerError ? (
                  <div className={styles.errorBox}>{drawerError}</div>
                ) : null}
                <div className={styles.fansubEditReleaseDrawerAssetBox}>
                  <div className={styles.fansubEditSegmentEditorGrid}>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Status
                      </span>
                      <strong>
                        {themeSelectedCard.status === "global"
                          ? "Global gesetzt"
                          : themeSelectedCard.status === "release"
                            ? "Uploadet"
                            : "Fehlt noch"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Theme
                      </span>
                      <strong>
                        {themeSelectedCard.theme_title || "Ohne Titel"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Quelle
                      </span>
                      <strong>
                        {themeSelectedCard.source_label || "Keine Quelle"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Release
                      </span>
                      <strong>
                        #{selectedReleaseSegment.release.release_id}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Episode
                      </span>
                      <strong>
                        {themeSegmentEpisodeRange(themePrimarySegment)}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.fansubEditSegmentEditorLabel}>
                        Zeitbereich
                      </span>
                      <strong>
                        {themeSegmentTimeRange(themePrimarySegment)}
                      </strong>
                    </div>
                  </div>
                  {themeAssetPreviewUrl ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<ExternalLink size={16} />}
                      className={styles.fansubEditReleaseDrawerMediaLink}
                      onClick={() => setThemePreviewOpen(true)}
                    >
                      Aktuelles Asset ansehen
                    </Button>
                  ) : null}
                  {themeSelectedLocked ? (
                    <p className={styles.fansubEditHint}>
                      {themeSelectedCard.release_asset_upload_locked
                        ? "Dieses Theme gilt für einen Episodenbereich. Der Upload wird am Segmentstart verwaltet, nicht an dieser Folge."
                        : "Global/Jellyfin gesetzt - keine Fansub-Überschreibung in diesem Schritt."}
                    </p>
                  ) : !canManageReleaseThemeAssets ? (
                    <p className={styles.fansubEditHint}>
                      Du kannst die Theme-Zuordnung ansehen. Hochladen oder
                      Entfernen ist nur mit Release-Media-Recht möglich.
                    </p>
                  ) : (
                    <div className={styles.fansubEditReleaseDrawerDropzone}>
                      <div className={styles.fansubEditThemeUploadHeader}>
                        <strong>Theme-Video hochladen</strong>
                        {drawerUploadStatusLabel ? (
                          <span className={styles.fansubEditThemeUploadMeta}>
                            {drawerUploadStatusLabel}
                          </span>
                        ) : null}
                      </div>
                      <input
                        ref={themeUploadInputRef}
                        className={styles.fansubEditThemeUploadInput}
                        type="file"
                        accept="video/*"
                        disabled={drawerBusy || !hasAuthSession}
                        onChange={handleThemeUploadInputChange}
                      />
                      <div className={styles.fansubEditThemeUploadPicker}>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => themeUploadInputRef.current?.click()}
                          disabled={drawerBusy || !hasAuthSession}
                        >
                          Datei wählen
                        </Button>
                        <span className={styles.fansubEditThemeUploadFileName}>
                          {themeUploadName || "Keine Datei ausgewählt"}
                        </span>
                      </div>
                      <div className={styles.fansubEditThemeUploadActions}>
                        <Button
                          type="button"
                          variant="primary"
                          onClick={() => void handleDrawerUploadClick()}
                          disabled={drawerBusy || !hasAuthSession}
                          loading={drawerBusy}
                        >
                          Upload starten
                        </Button>
                        {themeSelectedCard.status === "release" &&
                        themeSelectedCard.media_id ? (
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() => void handleDrawerDelete()}
                            disabled={drawerBusy}
                            loading={drawerBusy}
                          >
                            Asset entfernen
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <footer className={styles.fansubEditReleaseDrawerFooter}>
              <Button
                type="button"
                variant="secondary"
                onClick={closeThemeDrawer}
              >
                Schließen
              </Button>
            </footer>
          </aside>
        </div>
      ) : null}
      {themeAssetPreviewUrl ? (
        <Modal
          open={themePreviewOpen}
          onClose={() => setThemePreviewOpen(false)}
          title="Theme-Video ansehen"
          description={themePreviewDescription}
          footer={
            <Button
              type="button"
              variant="secondary"
              onClick={() => setThemePreviewOpen(false)}
            >
              Schließen
            </Button>
          }
        >
          <div className={styles.fansubEditThemePreview}>
            <video
              className={styles.fansubEditThemePreviewVideo}
              src={themeAssetPreviewUrl}
              controls
              preload="metadata"
            />
          </div>
        </Modal>
      ) : null}
    </>
  );
}
