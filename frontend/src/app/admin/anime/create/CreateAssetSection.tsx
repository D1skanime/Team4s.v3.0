"use client";

import type { RefObject, ReactNode } from "react";
import { Pencil, Trash2, Upload } from "lucide-react";
import type { AdminJellyfinIntakeAssetSlots } from "@/types/admin";
import { resolveJellyfinIntakeAssetUrl } from "../utils/jellyfin-intake-assets";
import type { JellyfinDraftAssetTarget } from "../hooks/useManualAnimeDraft";
import type { CreateAssetUploadDraftValue } from "./createAssetUploadPlan";
import { CreateAssetCard, type AssetSource } from "./CreateAssetCard";
import createStyles from "./page.module.css";

type AssetKind = "cover" | "banner" | "logo" | "background" | "background_video";

interface CreateAssetSectionProps {
  stagedCover?: CreateAssetUploadDraftValue | null;
  stagedBanner?: CreateAssetUploadDraftValue | null;
  stagedLogo?: CreateAssetUploadDraftValue | null;
  stagedBackgrounds?: CreateAssetUploadDraftValue[];
  stagedBackgroundVideos?: CreateAssetUploadDraftValue[];
  jellyfinDraftAssets?: AdminJellyfinIntakeAssetSlots | null;
  onOpenFileDialog: (kind: AssetKind) => void;
  onOpenAssetSearch: (kind: "cover" | "banner" | "logo" | "background") => void;
  onRemoveSingleAsset: (kind: "banner" | "logo") => void;
  onRemoveBackground: (index: number) => void;
  onRemoveBackgroundVideo: (index: number) => void;
  onRemoveJellyfinAsset: (target: JellyfinDraftAssetTarget) => void;
  fileInputRefs: {
    cover: RefObject<HTMLInputElement | null>;
    banner: RefObject<HTMLInputElement | null>;
    logo: RefObject<HTMLInputElement | null>;
    background: RefObject<HTMLInputElement | null>;
    background_video: RefObject<HTMLInputElement | null>;
  };
}

interface AssetActionRowProps {
  onUpload?: () => void;
  onSearch?: () => void;
  onRemove?: () => void;
  uploadLabel?: string;
  searchLabel?: string;
}

function AssetActionRow({
  onUpload,
  onSearch,
  onRemove,
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
  return previewUrl ? "Wird beim Erstellen uebernommen" : undefined;
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
  onOpenFileDialog,
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
        statusNote="Wird beim Erstellen uebernommen"
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
          key={`jellyfin-bg-${index}`}
          label={`Background ${stagedBackgrounds.length + index + 1}`}
          variant="background"
          previewUrl={url}
          source="Jellyfin"
          statusNote="Wird beim Erstellen uebernommen"
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
        statusNote="Wird beim Erstellen uebernommen"
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
            statusNote="Wird beim Erstellen uebernommen"
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
              onEmptyClick={!coverPreview ? () => onOpenFileDialog("cover") : undefined}
              actions={
                <AssetActionRow
                  onUpload={() => onOpenFileDialog("cover")}
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
              onEmptyClick={!bannerPreview ? () => onOpenFileDialog("banner") : undefined}
              actions={
                <AssetActionRow
                  onUpload={() => onOpenFileDialog("banner")}
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
              onEmptyClick={!logoPreview ? () => onOpenFileDialog("logo") : undefined}
              actions={
                <AssetActionRow
                  onUpload={() => onOpenFileDialog("logo")}
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
              <AssetActionRow
                onUpload={() => onOpenFileDialog("background_video")}
                uploadLabel="+ Hinzufuegen"
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
              onUpload={() => onOpenFileDialog("background")}
              uploadLabel="+ Hinzufuegen"
              onSearch={() => onOpenAssetSearch("background")}
            />
          </div>
          <div className={createStyles.assetBackgroundGrid}>
            {backgroundCards}
          </div>
        </section>
      </div>
    </div>
  );
}
