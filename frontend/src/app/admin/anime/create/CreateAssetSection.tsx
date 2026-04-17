"use client";

import type { RefObject } from "react";
import type { AdminJellyfinIntakeAssetSlots } from "@/types/admin";
import { resolveJellyfinIntakeAssetUrl } from "../utils/jellyfin-intake-assets";
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
  onRemoveJellyfinAsset: (target: { kind: string; index?: number }) => void;
  fileInputRefs: {
    cover: RefObject<HTMLInputElement | null>;
    banner: RefObject<HTMLInputElement | null>;
    logo: RefObject<HTMLInputElement | null>;
    background: RefObject<HTMLInputElement | null>;
    background_video: RefObject<HTMLInputElement | null>;
  };
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
  fileInputRefs,
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
    ? "Manuell" as const
    : jellyfinCoverUrl
      ? "Jellyfin" as const
      : null;

  const bannerPreview = stagedBanner?.previewUrl ?? jellyfinBannerUrl;
  const bannerSource = stagedBanner
    ? "Manuell" as const
    : jellyfinBannerUrl
      ? "Jellyfin" as const
      : null;

  const logoPreview = stagedLogo?.previewUrl ?? jellyfinLogoUrl;
  const logoSource = stagedLogo
    ? "Manuell" as const
    : jellyfinLogoUrl
      ? "Jellyfin" as const
      : null;

  return (
    <div className={createStyles.assetGrid}>
      {/* Cover */}
      <CreateAssetCard
        label="Cover"
        isRequired
        previewUrl={coverPreview}
        source={coverSource}
        statusNote={coverPreview ? "Wird beim Erstellen übernommen" : undefined}
        isEmpty={!coverPreview}
        actions={
          <>
            <button type="button" onClick={() => onOpenFileDialog("cover")}>Hochladen</button>
            <button type="button" onClick={() => onOpenAssetSearch("cover")}>Online suchen</button>
            {stagedCoverPreviewUrl ? (
              <button type="button" onClick={() => onRemoveJellyfinAsset({ kind: "cover" })}>Entfernen</button>
            ) : null}
          </>
        }
      />

      {/* Banner */}
      <CreateAssetCard
        label="Banner"
        previewUrl={bannerPreview}
        source={bannerSource}
        statusNote={bannerPreview ? "Wird beim Erstellen übernommen" : undefined}
        isEmpty={!bannerPreview}
        actions={
          <>
            <button type="button" onClick={() => onOpenFileDialog("banner")}>Hochladen</button>
            <button type="button" onClick={() => onOpenAssetSearch("banner")}>Online suchen</button>
            {stagedBanner ? (
              <button type="button" onClick={() => onRemoveSingleAsset("banner")}>Entfernen</button>
            ) : null}
          </>
        }
      />

      {/* Logo */}
      <CreateAssetCard
        label="Logo"
        previewUrl={logoPreview}
        source={logoSource}
        statusNote={logoPreview ? "Wird beim Erstellen übernommen" : undefined}
        isEmpty={!logoPreview}
        actions={
          <>
            <button type="button" onClick={() => onOpenFileDialog("logo")}>Hochladen</button>
            <button type="button" onClick={() => onOpenAssetSearch("logo")}>Online suchen</button>
            {stagedLogo ? (
              <button type="button" onClick={() => onRemoveSingleAsset("logo")}>Entfernen</button>
            ) : null}
          </>
        }
      />

      {/* Background Video */}
      <CreateAssetCard
        label="Background-Video"
        source={stagedBackgroundVideo ? "Manuell" : null}
        statusNote={stagedBackgroundVideo ? "Wird beim Erstellen übernommen" : undefined}
        isEmpty={!stagedBackgroundVideo}
        actions={
          <>
            <button type="button" onClick={() => onOpenFileDialog("background_video")}>Hochladen</button>
            {stagedBackgroundVideo ? (
              <button type="button" onClick={() => onRemoveSingleAsset("background_video")}>Entfernen</button>
            ) : null}
          </>
        }
      />

      {/* Backgrounds */}
      {stagedBackgrounds.map((bg, index) => (
        <CreateAssetCard
          key={bg.draftValue}
          label={`Background ${index + 1}`}
          previewUrl={bg.previewUrl}
          source="Manuell"
          statusNote="Wird beim Erstellen übernommen"
          actions={
            <button type="button" onClick={() => onRemoveBackground(index)}>Entfernen</button>
          }
        />
      ))}
      {(jellyfinDraftAssets?.backgrounds ?? []).map((slot, index) => {
        const url = resolveJellyfinIntakeAssetUrl(slot.url);
        if (!url) return null;
        return (
          <CreateAssetCard
            key={`jellyfin-bg-${index}`}
            label={`Background ${stagedBackgrounds.length + index + 1}`}
            previewUrl={url}
            source="Jellyfin"
            statusNote="Wird beim Erstellen übernommen"
            actions={
              <button type="button" onClick={() => onRemoveJellyfinAsset({ kind: "background", index })}>Entfernen</button>
            }
          />
        );
      })}

      {/* Add background button */}
      <CreateAssetCard
        label="Hintergrund hinzufügen"
        isEmpty
        actions={
          <>
            <button type="button" onClick={() => onOpenFileDialog("background")}>Hochladen</button>
            <button type="button" onClick={() => onOpenAssetSearch("background")}>Online suchen</button>
          </>
        }
      />
    </div>
  );
}
