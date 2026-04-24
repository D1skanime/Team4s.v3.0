"use client";

import type { ReactNode } from "react";
import { Pencil, Trash2, Upload } from "lucide-react";

import type {
  AdminAnimeAssetKind,
  AdminJellyfinIntakeAssetSlots,
  AdminAnimePersistedAssets,
  AdminAnimePersistedAssetState,
  AdminAnimePersistedBackgroundState,
} from "@/types/admin";
import type { JellyfinDraftAssetTarget } from "../../hooks/useManualAnimeDraft";

import { CreateAssetCard, type AssetSource } from "../../create/CreateAssetCard";
import createStyles from "../../create/page.module.css";
import { resolveJellyfinIntakeAssetUrl } from "../../utils/jellyfin-intake-assets";

type SearchableAssetKind = Extract<
  AdminAnimeAssetKind,
  "cover" | "banner" | "logo" | "background"
>;

interface AnimeEditAssetSectionProps {
  persistedAssets: AdminAnimePersistedAssets;
  jellyfinAssetSlots?: AdminJellyfinIntakeAssetSlots | null;
  isBusy?: boolean;
  onOpenFileDialog: (kind: AdminAnimeAssetKind) => void;
  onOpenAssetSearch: (kind: SearchableAssetKind) => void;
  onRemoveJellyfinAsset: (target: JellyfinDraftAssetTarget) => void;
  onRemoveCover: () => void;
  onRemoveBanner: () => void;
  onRemoveLogo: () => void;
  onRemoveBackground: (backgroundID: number) => void;
  onRemoveBackgroundVideo: () => void;
}

interface AssetActionRowProps {
  onUpload?: () => void;
  onSearch?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  uploadLabel?: string;
  searchLabel?: string;
}

function AssetActionRow({
  onUpload,
  onSearch,
  onRemove,
  disabled = false,
  uploadLabel = "Upload",
  searchLabel = "Online suchen",
}: AssetActionRowProps) {
  return (
    <div className={createStyles.assetActionRow}>
      {onUpload ? (
        <button
          type="button"
          className={createStyles.assetActionButton}
          onClick={onUpload}
          disabled={disabled}
        >
          <Upload size={14} />
          <span>{uploadLabel}</span>
        </button>
      ) : null}
      {onSearch ? (
        <button
          type="button"
          className={[
            createStyles.assetActionButton,
            createStyles.assetActionButtonSecondary,
          ].join(" ")}
          onClick={onSearch}
          disabled={disabled}
        >
          <Pencil size={14} />
          <span>{searchLabel}</span>
        </button>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          className={[
            createStyles.assetActionIconButton,
            createStyles.assetActionIconButtonDestructive,
          ].join(" ")}
          title="Asset entfernen"
          onClick={onRemove}
          disabled={disabled}
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

function resolveAssetSource(
  asset?: AdminAnimePersistedAssetState | AdminAnimePersistedBackgroundState,
): AssetSource | null {
  if (!asset) return null;
  return asset.ownership === "provider" ? "Jellyfin" : "Manuell";
}

function buildPersistedStatusNote(
  asset?: AdminAnimePersistedAssetState | AdminAnimePersistedBackgroundState,
): string | undefined {
  if (!asset) return undefined;
  return asset.ownership === "provider"
    ? "Persistiert aus Provider-Quelle"
    : "Persistiert als lokales/manuelles Asset";
}

export function AnimeEditAssetSection({
  persistedAssets,
  jellyfinAssetSlots,
  isBusy = false,
  onOpenFileDialog,
  onOpenAssetSearch,
  onRemoveJellyfinAsset,
  onRemoveCover,
  onRemoveBanner,
  onRemoveLogo,
  onRemoveBackground,
  onRemoveBackgroundVideo,
}: AnimeEditAssetSectionProps) {
  const cover =
    persistedAssets.cover ??
    (jellyfinAssetSlots?.cover.present && jellyfinAssetSlots.cover.url
      ? {
          url: resolveJellyfinIntakeAssetUrl(jellyfinAssetSlots.cover.url),
          ownership: "provider" as const,
        }
      : undefined);
  const banner =
    persistedAssets.banner ??
    (jellyfinAssetSlots?.banner.present && jellyfinAssetSlots.banner.url
      ? {
          url: resolveJellyfinIntakeAssetUrl(jellyfinAssetSlots.banner.url),
          ownership: "provider" as const,
        }
      : undefined);
  const logo =
    persistedAssets.logo ??
    (jellyfinAssetSlots?.logo.present && jellyfinAssetSlots.logo.url
      ? {
          url: resolveJellyfinIntakeAssetUrl(jellyfinAssetSlots.logo.url),
          ownership: "provider" as const,
        }
      : undefined);
  const backgroundVideo = persistedAssets.background_video;
  const jellyfinBackgroundVideo =
    jellyfinAssetSlots?.background_video.present && jellyfinAssetSlots.background_video.url
      ? {
          url: resolveJellyfinIntakeAssetUrl(jellyfinAssetSlots.background_video.url),
          ownership: "provider" as const,
        }
      : undefined;
  const backgrounds = persistedAssets.backgrounds ?? [];
  const persistedBackgroundUrls = new Set(
    backgrounds.map((background) => background.url).filter(Boolean),
  );
  const jellyfinBackgrounds = (jellyfinAssetSlots?.backgrounds ?? [])
    .filter((slot) => slot.present && slot.url)
    .map((slot, index) => ({
      url: resolveJellyfinIntakeAssetUrl(slot.url),
      ownership: "provider" as const,
      index,
    }))
    .filter((background) => background.url && !persistedBackgroundUrls.has(background.url));

  const backgroundCards: ReactNode[] = [
    ...backgrounds.map((background, index) => (
      <CreateAssetCard
        key={background.id}
        label={`Background ${index + 1}`}
        variant="background"
        previewUrl={background.url}
        source={resolveAssetSource(background)}
        statusNote={buildPersistedStatusNote(background)}
        actions={
          <AssetActionRow
            disabled={isBusy}
            onRemove={() => onRemoveBackground(background.id)}
          />
        }
      />
    )),
    ...jellyfinBackgrounds.map((background, index) => (
      <CreateAssetCard
        key={`jellyfin-background-${background.index}`}
        label={`Background ${index + 1}`}
        variant="background"
        previewUrl={background.url}
        source="Jellyfin"
        statusNote="Verfügbar aus Jellyfin-Quelle"
        actions={
          <AssetActionRow
            disabled={isBusy}
            onUpload={() => onOpenFileDialog("background")}
            onSearch={() => onOpenAssetSearch("background")}
            onRemove={() => onRemoveJellyfinAsset({ kind: "background", index: background.index })}
          />
        }
      />
    )),
  ];
  const backgroundVideoCards: ReactNode[] = [
    ...(backgroundVideo
      ? [
          <CreateAssetCard
            key="persisted-background-video"
            label="Background-Video 1"
            variant="backgroundVideo"
            previewUrl={backgroundVideo.url}
            source={resolveAssetSource(backgroundVideo)}
            statusNote={buildPersistedStatusNote(backgroundVideo)}
            actions={
              <AssetActionRow
                disabled={isBusy}
                onRemove={onRemoveBackgroundVideo}
                onUpload={() => onOpenFileDialog("background_video")}
              />
            }
          />,
        ]
      : []),
    ...(jellyfinBackgroundVideo?.url &&
    jellyfinBackgroundVideo.url !== backgroundVideo?.url
      ? [
          <CreateAssetCard
            key="jellyfin-background-video"
            label={`Background-Video ${backgroundVideo ? 2 : 1}`}
            variant="backgroundVideo"
            previewUrl={jellyfinBackgroundVideo.url}
            source="Jellyfin"
            statusNote="Verfuegbar aus Jellyfin-Quelle"
            actions={
              <AssetActionRow
                disabled={isBusy}
                onUpload={() => onOpenFileDialog("background_video")}
                onRemove={() => onRemoveJellyfinAsset({ kind: "background_video" })}
              />
            }
          />,
        ]
      : []),
  ];

  return (
    <div className={createStyles.assetPanel}>
      <div className={createStyles.assetBoard}>
        <div className={createStyles.assetMainColumn}>
          <div className={createStyles.assetPrimaryGrid}>
            <CreateAssetCard
              label="Cover"
              variant="cover"
              isRequired
              previewUrl={cover?.url}
              source={resolveAssetSource(cover)}
              statusNote={buildPersistedStatusNote(cover)}
              isEmpty={!cover?.url}
              onEmptyClick={!cover?.url ? () => onOpenFileDialog("cover") : undefined}
              actions={
                <AssetActionRow
                  disabled={isBusy}
                  onUpload={() => onOpenFileDialog("cover")}
                  onSearch={() => onOpenAssetSearch("cover")}
                  onRemove={
                    persistedAssets.cover
                      ? onRemoveCover
                      : cover?.ownership === "provider"
                        ? () => onRemoveJellyfinAsset({ kind: "cover" })
                        : undefined
                  }
                />
              }
            />

            <CreateAssetCard
              label="Banner"
              variant="banner"
              previewUrl={banner?.url}
              source={resolveAssetSource(banner)}
              statusNote={buildPersistedStatusNote(banner)}
              isEmpty={!banner?.url}
              onEmptyClick={!banner?.url ? () => onOpenFileDialog("banner") : undefined}
              actions={
                <AssetActionRow
                  disabled={isBusy}
                  onUpload={() => onOpenFileDialog("banner")}
                  onSearch={() => onOpenAssetSearch("banner")}
                  onRemove={
                    persistedAssets.banner
                      ? onRemoveBanner
                      : banner?.ownership === "provider"
                        ? () => onRemoveJellyfinAsset({ kind: "banner" })
                        : undefined
                  }
                />
              }
            />

            <CreateAssetCard
              label="Logo"
              variant="logo"
              previewUrl={logo?.url}
              source={resolveAssetSource(logo)}
              statusNote={buildPersistedStatusNote(logo)}
              isEmpty={!logo?.url}
              onEmptyClick={!logo?.url ? () => onOpenFileDialog("logo") : undefined}
              actions={
                <AssetActionRow
                  disabled={isBusy}
                  onUpload={() => onOpenFileDialog("logo")}
                  onSearch={() => onOpenAssetSearch("logo")}
                  onRemove={
                    persistedAssets.logo
                      ? onRemoveLogo
                      : logo?.ownership === "provider"
                        ? () => onRemoveJellyfinAsset({ kind: "logo" })
                        : undefined
                  }
                />
              }
            />
          </div>

          <section className={createStyles.assetVideoSection}>
            <div className={createStyles.assetGroupHeader}>
              <h3 className={createStyles.assetBackgroundTitle}>
                Background-Videos ({backgroundVideoCards.length})
              </h3>
              <AssetActionRow
                disabled={isBusy}
                onUpload={() => onOpenFileDialog("background_video")}
                uploadLabel="+ Hinzufügen"
              />
            </div>
            <div className={createStyles.assetVideoGrid}>
              {backgroundVideoCards.length > 0 ? (
                backgroundVideoCards
              ) : (
                <CreateAssetCard
                  label="Background-Video"
                  variant="backgroundVideo"
                  isEmpty
                  onEmptyClick={() => onOpenFileDialog("background_video")}
                  actions={
                    <AssetActionRow
                      disabled={isBusy}
                      onUpload={() => onOpenFileDialog("background_video")}
                      uploadLabel="Upload"
                    />
                  }
                />
              )}
            </div>
          </section>
        </div>

        <section className={createStyles.assetBackgroundSection}>
          <div className={createStyles.assetGroupHeader}>
            <h3 className={createStyles.assetBackgroundTitle}>
              Hintergründe ({backgroundCards.length})
            </h3>
            <AssetActionRow
              disabled={isBusy}
              onUpload={() => onOpenFileDialog("background")}
              uploadLabel="+ Hinzufügen"
              onSearch={() => onOpenAssetSearch("background")}
            />
          </div>
          <div className={createStyles.assetBackgroundGrid}>
            {backgroundCards.length > 0 ? (
              backgroundCards
            ) : (
              <CreateAssetCard
                label="Background"
                variant="background"
                isEmpty
                onEmptyClick={() => onOpenFileDialog("background")}
                actions={
                  <AssetActionRow
                    disabled={isBusy}
                    onUpload={() => onOpenFileDialog("background")}
                    onSearch={() => onOpenAssetSearch("background")}
                  />
                }
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
