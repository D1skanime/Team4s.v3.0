"use client";

import type { RefObject } from "react";
import { Pencil, Trash2 } from "lucide-react";
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
    <div className={createStyles.assetPanel}>
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
            <div className={createStyles.assetIconActions}>
              <button
                type="button"
                className={createStyles.assetIconBtn}
                title="Asset bearbeiten"
                onClick={() => onOpenAssetSearch("cover")}
              >
                <Pencil size={15} />
              </button>
              {(stagedCoverPreviewUrl || jellyfinCoverUrl) ? (
                <button
                  type="button"
                  className={[createStyles.assetIconBtn, createStyles.assetIconBtnDestructive].join(" ")}
                  title="Asset entfernen"
                  onClick={() => onRemoveJellyfinAsset({ kind: "cover" })}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
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
            <div className={createStyles.assetIconActions}>
              <button
                type="button"
                className={createStyles.assetIconBtn}
                title="Asset bearbeiten"
                onClick={() => onOpenAssetSearch("banner")}
              >
                <Pencil size={15} />
              </button>
              {bannerPreview ? (
                <button
                  type="button"
                  className={[createStyles.assetIconBtn, createStyles.assetIconBtnDestructive].join(" ")}
                  title="Asset entfernen"
                  onClick={stagedBanner
                    ? () => onRemoveSingleAsset("banner")
                    : () => onRemoveJellyfinAsset({ kind: "banner" })}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
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
            <div className={createStyles.assetIconActions}>
              <button
                type="button"
                className={createStyles.assetIconBtn}
                title="Asset bearbeiten"
                onClick={() => onOpenAssetSearch("logo")}
              >
                <Pencil size={15} />
              </button>
              {logoPreview ? (
                <button
                  type="button"
                  className={[createStyles.assetIconBtn, createStyles.assetIconBtnDestructive].join(" ")}
                  title="Asset entfernen"
                  onClick={stagedLogo
                    ? () => onRemoveSingleAsset("logo")
                    : () => onRemoveJellyfinAsset({ kind: "logo" })}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
          }
        />

        {/* Background Video */}
        <CreateAssetCard
          label="Background-Video"
          source={stagedBackgroundVideo ? "Manuell" : null}
          statusNote={stagedBackgroundVideo ? "Wird beim Erstellen übernommen" : undefined}
          isEmpty={!stagedBackgroundVideo}
          actions={
            <div className={createStyles.assetIconActions}>
              <button
                type="button"
                className={createStyles.assetIconBtn}
                title="Hochladen"
                onClick={() => onOpenFileDialog("background_video")}
              >
                <Pencil size={15} />
              </button>
              {stagedBackgroundVideo ? (
                <button
                  type="button"
                  className={[createStyles.assetIconBtn, createStyles.assetIconBtnDestructive].join(" ")}
                  title="Asset entfernen"
                  onClick={() => onRemoveSingleAsset("background_video")}
                >
                  <Trash2 size={15} />
                </button>
              ) : null}
            </div>
          }
        />

        {/* Staged Backgrounds */}
        {stagedBackgrounds.map((bg, index) => (
          <CreateAssetCard
            key={bg.draftValue}
            label={`Background ${index + 1}`}
            previewUrl={bg.previewUrl}
            source="Manuell"
            statusNote="Wird beim Erstellen übernommen"
            actions={
              <div className={createStyles.assetIconActions}>
                <button
                  type="button"
                  className={[createStyles.assetIconBtn, createStyles.assetIconBtnDestructive].join(" ")}
                  title="Hintergrund entfernen"
                  onClick={() => onRemoveBackground(index)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            }
          />
        ))}

        {/* Jellyfin Backgrounds */}
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
                <div className={createStyles.assetIconActions}>
                  <button
                    type="button"
                    className={[createStyles.assetIconBtn, createStyles.assetIconBtnDestructive].join(" ")}
                    title="Hintergrund entfernen"
                    onClick={() => onRemoveJellyfinAsset({ kind: "background", index })}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              }
            />
          );
        })}

        {/* Add background */}
        <CreateAssetCard
          label="Hintergrund hinzufuegen"
          isEmpty
          actions={
            <div className={createStyles.assetIconActions}>
              <button
                type="button"
                className={createStyles.assetIconBtn}
                title="Hochladen"
                onClick={() => onOpenFileDialog("background")}
              >
                <Pencil size={15} />
              </button>
            </div>
          }
        />
      </div>
    </div>
  );
}
