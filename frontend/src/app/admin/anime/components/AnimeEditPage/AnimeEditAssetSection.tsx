"use client";

import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";

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
  onAssetFilesSelected: (kind: AdminAnimeAssetKind, files: File[]) => void;
  onOpenAssetSearch: (kind: SearchableAssetKind) => void;
  onRemoveJellyfinAsset: (target: JellyfinDraftAssetTarget) => void;
  onRemoveCover: () => void;
  onRemoveBanner: () => void;
  onRemoveLogo: () => void;
  onRemoveBackground: (backgroundID: number) => void;
  onRemoveBackgroundVideo: () => void;
}

interface AssetActionRowProps {
  onSearch?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  searchLabel?: string;
}

function AssetActionRow({
  onSearch,
  onRemove,
  disabled = false,
  searchLabel = "Online suchen",
}: AssetActionRowProps) {
  return (
    <div className={createStyles.assetActionRow}>
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
  if (asset.ownership !== "provider") return "Manuell";

  switch (asset.provider?.toLowerCase()) {
    case "jellyfin":
      return "Jellyfin";
    case "tmdb":
      return "TMDB";
    case "zerochan":
      return "Zerochan";
    case "fanart.tv":
      return "Fanart.tv";
    case "anilist":
      return "AniList";
    case "konachan":
      return "Konachan";
    case "safebooru":
      return "Safebooru";
    default:
      return "Online";
  }
}

function resolvePersistedAssetUrl(
  asset?: AdminAnimePersistedAssetState | AdminAnimePersistedBackgroundState,
): string {
  return normalizeAssetUrl(asset?.url);
}

function buildPersistedStatusNote(
  asset?: AdminAnimePersistedAssetState | AdminAnimePersistedBackgroundState,
): string | undefined {
  if (!asset) return undefined;
  return asset.ownership === "provider"
    ? "Persistiert aus Provider-Quelle"
    : "Persistiert als lokales/manuelles Asset";
}

function normalizeAssetUrl(rawUrl?: string): string {
  return resolveJellyfinIntakeAssetUrl(rawUrl);
}

export function AnimeEditAssetSection({
  persistedAssets,
  jellyfinAssetSlots,
  isBusy = false,
  onAssetFilesSelected,
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
          url: normalizeAssetUrl(jellyfinAssetSlots.cover.url),
          ownership: "provider" as const,
        }
      : undefined);
  const banner =
    persistedAssets.banner ??
    (jellyfinAssetSlots?.banner.present && jellyfinAssetSlots.banner.url
      ? {
          url: normalizeAssetUrl(jellyfinAssetSlots.banner.url),
          ownership: "provider" as const,
        }
      : undefined);
  const logo =
    persistedAssets.logo ??
    (jellyfinAssetSlots?.logo.present && jellyfinAssetSlots.logo.url
      ? {
          url: normalizeAssetUrl(jellyfinAssetSlots.logo.url),
          ownership: "provider" as const,
        }
      : undefined);
  const backgroundVideo = persistedAssets.background_video;
  const jellyfinBackgroundVideo =
    jellyfinAssetSlots?.background_video.present && jellyfinAssetSlots.background_video.url
      ? {
          url: normalizeAssetUrl(jellyfinAssetSlots.background_video.url),
          ownership: "provider" as const,
        }
      : undefined;
  const backgrounds = persistedAssets.backgrounds ?? [];
  const persistedBackgroundUrls = new Set(
    backgrounds.map((background) => normalizeAssetUrl(background.url)).filter(Boolean),
  );
  const jellyfinBackgrounds = (jellyfinAssetSlots?.backgrounds ?? [])
    .filter((slot) => slot.present && slot.url)
    .map((slot, index) => ({
      url: normalizeAssetUrl(slot.url),
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
        previewUrl={resolvePersistedAssetUrl(background)}
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
            previewUrl={resolvePersistedAssetUrl(backgroundVideo)}
            source={resolveAssetSource(backgroundVideo)}
            statusNote={buildPersistedStatusNote(backgroundVideo)}
            actions={
              <AssetActionRow
                disabled={isBusy}
                onRemove={onRemoveBackgroundVideo}
              />
            }
          />,
        ]
      : []),
    ...(jellyfinBackgroundVideo?.url &&
    jellyfinBackgroundVideo.url !== normalizeAssetUrl(backgroundVideo?.url)
      ? [
          <CreateAssetCard
            key="jellyfin-background-video"
            label={`Background-Video ${backgroundVideo ? 2 : 1}`}
            variant="backgroundVideo"
            previewUrl={jellyfinBackgroundVideo.url}
            source="Jellyfin"
            statusNote="Verfügbar aus Jellyfin-Quelle"
            actions={
              <AssetActionRow
                disabled={isBusy}
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
              previewUrl={resolvePersistedAssetUrl(cover)}
              source={resolveAssetSource(cover)}
              statusNote={buildPersistedStatusNote(cover)}
              isEmpty={!resolvePersistedAssetUrl(cover)}
              uploadDisabled={isBusy}
              onFilesSelected={(files) => onAssetFilesSelected("cover", files)}
              actions={
                <AssetActionRow
                  disabled={isBusy}
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
              previewUrl={resolvePersistedAssetUrl(banner)}
              source={resolveAssetSource(banner)}
              statusNote={buildPersistedStatusNote(banner)}
              isEmpty={!resolvePersistedAssetUrl(banner)}
              uploadDisabled={isBusy}
              onFilesSelected={(files) => onAssetFilesSelected("banner", files)}
              actions={
                <AssetActionRow
                  disabled={isBusy}
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
              previewUrl={resolvePersistedAssetUrl(logo)}
              source={resolveAssetSource(logo)}
              statusNote={buildPersistedStatusNote(logo)}
              isEmpty={!resolvePersistedAssetUrl(logo)}
              uploadDisabled={isBusy}
              onFilesSelected={(files) => onAssetFilesSelected("logo", files)}
              actions={
                <AssetActionRow
                  disabled={isBusy}
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
            </div>
            <div className={createStyles.assetVideoGrid}>
              {backgroundVideoCards}
              <CreateAssetCard
                label="Background-Video"
                variant="backgroundVideo"
                isEmpty
                uploadMultiple
                uploadAccept="video/*"
                uploadDisabled={isBusy}
                onFilesSelected={(files) => onAssetFilesSelected("background_video", files)}
              />
            </div>
          </section>
        </div>

        <section className={createStyles.assetBackgroundSection}>
          <div className={createStyles.assetGroupHeader}>
            <h3 className={createStyles.assetBackgroundTitle}>
              Hintergründe ({backgroundCards.length})
            </h3>
            <AssetActionRow disabled={isBusy} onSearch={() => onOpenAssetSearch("background")} />
          </div>
          <div className={createStyles.assetBackgroundGrid}>
            {backgroundCards}
            <CreateAssetCard
              label="Background"
              variant="background"
              isEmpty
              uploadMultiple
              uploadDisabled={isBusy}
              onFilesSelected={(files) => onAssetFilesSelected("background", files)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
