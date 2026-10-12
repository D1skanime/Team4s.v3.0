"use client";

import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { AdminAnimeAssetKind, AdminJellyfinIntakeAssetSlots } from "@/types/admin";
import { resolveJellyfinIntakeAssetUrl } from "../utils/jellyfin-intake-assets";
import type { JellyfinDraftAssetTarget } from "../hooks/useManualAnimeDraft";
import type { CreateAssetUploadDraftValue } from "./createAssetUploadPlan";
import { CreateAssetCard, type AssetSource } from "./CreateAssetCard";
import createStyles from "./page.module.css";

interface CreateAssetSectionProps {
  stagedCover?: CreateAssetUploadDraftValue | null;
  stagedBanner?: CreateAssetUploadDraftValue | null;
  stagedLogo?: CreateAssetUploadDraftValue | null;
  stagedBackgrounds?: CreateAssetUploadDraftValue[];
  stagedBackgroundVideos?: CreateAssetUploadDraftValue[];
  jellyfinDraftAssets?: AdminJellyfinIntakeAssetSlots | null;
  onAssetFilesSelected: (kind: AdminAnimeAssetKind, files: File[]) => void;
  onOpenAssetSearch: (kind: "cover" | "banner" | "logo" | "background") => void;
  onRemoveSingleAsset: (kind: "banner" | "logo") => void;
  onRemoveBackground: (index: number) => void;
  onRemoveBackgroundVideo: (index: number) => void;
  onRemoveJellyfinAsset: (target: JellyfinDraftAssetTarget) => void;
}

interface AssetActionRowProps {
  onSearch?: () => void;
  onRemove?: () => void;
  searchLabel?: string;
}

function AssetActionRow({
  onSearch,
  onRemove,
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
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  );
}

function buildStatusNote(previewUrl?: string | null): string | undefined {
  return previewUrl ? "Wird beim Erstellen übernommen" : undefined;
}

function resolveStagedAssetSource(
  stagedAsset?: CreateAssetUploadDraftValue | null,
): AssetSource {
  const source = stagedAsset?.providerKey?.split(":")[0]?.trim().toLowerCase();
  switch (source) {
    case "tmdb":
      return "TMDB";
    case "zerochan":
      return "Zerochan";
    case "fanart.tv":
    case "fanart":
      return "Fanart.tv";
    case "anilist":
      return "AniList";
    case "konachan":
      return "Konachan";
    case "safebooru":
      return "Safebooru";
    case undefined:
    case "":
      return "Manuell";
    default:
      return "Online";
  }
}

export function CreateAssetSection({
  stagedCover,
  stagedBanner,
  stagedLogo,
  stagedBackgrounds = [],
  stagedBackgroundVideos = [],
  jellyfinDraftAssets,
  onAssetFilesSelected,
  onOpenAssetSearch,
  onRemoveSingleAsset,
  onRemoveBackground,
  onRemoveBackgroundVideo,
  onRemoveJellyfinAsset,
}: CreateAssetSectionProps) {
  const jellyfinCoverUrl = jellyfinDraftAssets?.cover.present
    ? resolveJellyfinIntakeAssetUrl(jellyfinDraftAssets.cover.url)
    : null;
  const jellyfinBannerUrl = jellyfinDraftAssets?.banner.present
    ? resolveJellyfinIntakeAssetUrl(jellyfinDraftAssets.banner.url)
    : null;
  const jellyfinLogoUrl = jellyfinDraftAssets?.logo.present
    ? resolveJellyfinIntakeAssetUrl(jellyfinDraftAssets.logo.url)
    : null;

  const coverPreview = stagedCover?.previewUrl ?? jellyfinCoverUrl;
  const coverSource = stagedCover
    ? resolveStagedAssetSource(stagedCover)
    : jellyfinCoverUrl
      ? ("Jellyfin" as const)
      : null;

  const bannerPreview = stagedBanner?.previewUrl ?? jellyfinBannerUrl;
  const bannerSource = stagedBanner
    ? resolveStagedAssetSource(stagedBanner)
    : jellyfinBannerUrl
      ? ("Jellyfin" as const)
      : null;

  const logoPreview = stagedLogo?.previewUrl ?? jellyfinLogoUrl;
  const logoSource = stagedLogo
    ? resolveStagedAssetSource(stagedLogo)
    : jellyfinLogoUrl
      ? ("Jellyfin" as const)
      : null;

  const backgroundCards: ReactNode[] = [
    ...stagedBackgrounds.map((bg, index) => (
      <CreateAssetCard
        key={bg.draftValue}
        label={`Background ${index + 1}`}
        variant="background"
        previewUrl={bg.previewUrl}
        source={resolveStagedAssetSource(bg)}
        statusNote="Wird beim Erstellen übernommen"
        actions={
          <AssetActionRow onRemove={() => onRemoveBackground(index)} />
        }
      />
    )),
    ...(jellyfinDraftAssets?.backgrounds ?? []).map((slot, index) => {
      const url = resolveJellyfinIntakeAssetUrl(slot.url);
      if (!url) return null;

      return (
        <CreateAssetCard
          key={`jellyfin-bg-${slot.url}`}
          label={`Background ${stagedBackgrounds.length + index + 1}`}
          variant="background"
          previewUrl={url}
          source="Jellyfin"
          statusNote="Wird beim Erstellen übernommen"
          actions={
            <AssetActionRow
              onRemove={() => onRemoveJellyfinAsset({ kind: "background", index })}
            />
          }
        />
      );
    }),
  ].filter(Boolean);

  const backgroundVideoCards: ReactNode[] = [
    ...stagedBackgroundVideos.map((video, index) => (
      <CreateAssetCard
        key={video.draftValue}
        label={`Background-Video ${index + 1}`}
        variant="backgroundVideo"
        previewUrl={video.previewUrl}
        source={resolveStagedAssetSource(video)}
        statusNote="Wird beim Erstellen übernommen"
        actions={
          <AssetActionRow
            onRemove={() => onRemoveBackgroundVideo(index)}
          />
        }
      />
    )),
    ...(jellyfinDraftAssets?.background_video.present &&
    jellyfinDraftAssets.background_video.url &&
    stagedBackgroundVideos.length === 0
      ? [
          <CreateAssetCard
            key="jellyfin-background-video"
            label="Background-Video 1"
            variant="backgroundVideo"
            previewUrl={resolveJellyfinIntakeAssetUrl(
              jellyfinDraftAssets.background_video.url,
            )}
            source="Jellyfin"
            statusNote="Wird beim Erstellen übernommen"
            actions={
              <AssetActionRow
                onRemove={() => onRemoveJellyfinAsset({ kind: "background_video" })}
              />
            }
          />,
        ]
      : []),
  ].filter(Boolean);

  return (
    <div className={createStyles.assetPanel}>
      <div className={createStyles.assetBoard}>
        <div className={createStyles.assetMainColumn}>
          <div className={createStyles.assetPrimaryGrid}>
            <CreateAssetCard
              label="Cover"
              variant="cover"
              isRequired
              previewUrl={coverPreview}
              source={coverSource}
              statusNote={buildStatusNote(coverPreview)}
              isEmpty={!coverPreview}
              onFilesSelected={(files) => onAssetFilesSelected("cover", files)}
              actions={
                <AssetActionRow
                  onSearch={() => onOpenAssetSearch("cover")}
                  onRemove={
                    stagedCover || jellyfinCoverUrl
                      ? () => onRemoveJellyfinAsset({ kind: "cover" })
                      : undefined
                  }
                />
              }
            />

            <CreateAssetCard
              label="Banner"
              variant="banner"
              previewUrl={bannerPreview}
              source={bannerSource}
              statusNote={buildStatusNote(bannerPreview)}
              isEmpty={!bannerPreview}
              onFilesSelected={(files) => onAssetFilesSelected("banner", files)}
              actions={
                <AssetActionRow
                  onSearch={() => onOpenAssetSearch("banner")}
                  onRemove={
                    bannerPreview
                      ? stagedBanner
                        ? () => onRemoveSingleAsset("banner")
                        : () => onRemoveJellyfinAsset({ kind: "banner" })
                      : undefined
                  }
                />
              }
            />

            <CreateAssetCard
              label="Logo"
              variant="logo"
              previewUrl={logoPreview}
              source={logoSource}
              statusNote={buildStatusNote(logoPreview)}
              isEmpty={!logoPreview}
              onFilesSelected={(files) => onAssetFilesSelected("logo", files)}
              actions={
                <AssetActionRow
                  onSearch={() => onOpenAssetSearch("logo")}
                  onRemove={
                    logoPreview
                      ? stagedLogo
                        ? () => onRemoveSingleAsset("logo")
                        : () => onRemoveJellyfinAsset({ kind: "logo" })
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
            <AssetActionRow onSearch={() => onOpenAssetSearch("background")} />
          </div>
          <div className={createStyles.assetBackgroundGrid}>
            {backgroundCards}
            <CreateAssetCard
              label="Background"
              variant="background"
              isEmpty
              uploadMultiple
              onFilesSelected={(files) => onAssetFilesSelected("background", files)}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
