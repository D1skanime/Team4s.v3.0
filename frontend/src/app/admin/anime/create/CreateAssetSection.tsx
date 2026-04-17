"use client";

import type { RefObject, ReactNode } from "react";
import { Pencil, Trash2, Upload } from "lucide-react";
import type { AdminJellyfinIntakeAssetSlots } from "@/types/admin";
import { resolveJellyfinIntakeAssetUrl } from "../utils/jellyfin-intake-assets";
import type { JellyfinDraftAssetTarget } from "../hooks/useManualAnimeDraft";
import type { CreateAssetUploadDraftValue } from "./createAssetUploadPlan";
import { CreateAssetCard } from "./CreateAssetCard";
import createStyles from "./page.module.css";

type AssetKind = "cover" | "banner" | "logo" | "background" | "background_video";

interface CreateAssetSectionProps {
  stagedCoverPreviewUrl?: string | null;
  stagedBanner?: CreateAssetUploadDraftValue | null;
  stagedLogo?: CreateAssetUploadDraftValue | null;
  stagedBackgrounds?: CreateAssetUploadDraftValue[];
  stagedBackgroundVideo?: CreateAssetUploadDraftValue | null;
  jellyfinDraftAssets?: AdminJellyfinIntakeAssetSlots | null;
  onOpenFileDialog: (kind: AssetKind) => void;
  onOpenAssetSearch: (kind: "cover" | "banner" | "logo" | "background") => void;
  onRemoveSingleAsset: (kind: "banner" | "logo" | "background_video") => void;
  onRemoveBackground: (index: number) => void;
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

export function CreateAssetSection({
  stagedCoverPreviewUrl,
  stagedBanner,
  stagedLogo,
  stagedBackgrounds = [],
  stagedBackgroundVideo,
  jellyfinDraftAssets,
  onOpenFileDialog,
  onOpenAssetSearch,
  onRemoveSingleAsset,
  onRemoveBackground,
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

  const coverPreview = stagedCoverPreviewUrl ?? jellyfinCoverUrl;
  const coverSource = stagedCoverPreviewUrl
    ? ("Manuell" as const)
    : jellyfinCoverUrl
      ? ("Jellyfin" as const)
      : null;

  const bannerPreview = stagedBanner?.previewUrl ?? jellyfinBannerUrl;
  const bannerSource = stagedBanner
    ? ("Manuell" as const)
    : jellyfinBannerUrl
      ? ("Jellyfin" as const)
      : null;

  const logoPreview = stagedLogo?.previewUrl ?? jellyfinLogoUrl;
  const logoSource = stagedLogo
    ? ("Manuell" as const)
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
        source="Manuell"
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

  return (
    <div className={createStyles.assetPanel}>
      <div className={createStyles.assetGrid}>
        {/* Cover */}
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
                stagedCoverPreviewUrl || jellyfinCoverUrl
                  ? () => onRemoveJellyfinAsset({ kind: "cover" })
                  : undefined
              }
            />
          }
        />

        {/* Banner */}
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

        {/* Logo */}
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

        {/* Background-Video */}
        <CreateAssetCard
          label="Background-Video"
          variant="backgroundVideo"
          source={stagedBackgroundVideo ? "Manuell" : null}
          statusNote={
            stagedBackgroundVideo ? "Wird beim Erstellen uebernommen" : undefined
          }
          isEmpty={!stagedBackgroundVideo}
          onEmptyClick={
            !stagedBackgroundVideo ? () => onOpenFileDialog("background_video") : undefined
          }
          actions={
            <AssetActionRow
              onUpload={() => onOpenFileDialog("background_video")}
              uploadLabel="Upload"
              onRemove={
                stagedBackgroundVideo
                  ? () => onRemoveSingleAsset("background_video")
                  : undefined
              }
            />
          }
        />

        {/* Staged + Jellyfin background tiles */}
        {backgroundCards}

        {/* Add background */}
        <CreateAssetCard
          label="Hintergrund hinzufuegen"
          variant="adder"
          isEmpty
          actions={
            <AssetActionRow
              onUpload={() => onOpenFileDialog("background")}
              onSearch={() => onOpenAssetSearch("background")}
            />
          }
        />
      </div>
    </div>
  );
}
