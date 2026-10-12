"use client";

import type { ReactNode } from "react";
import { UploadDropzone } from "@/components/ui";
import createStyles from "./page.module.css";

export type AssetSource =
  | "Jellyfin"
  | "Manuell"
  | "Online"
  | "TMDB"
  | "Zerochan"
  | "Fanart.tv"
  | "AniList"
  | "Konachan"
  | "Safebooru";

export type CreateAssetCardVariant =
  | "cover"
  | "banner"
  | "logo"
  | "background"
  | "backgroundVideo"
  | "adder";

interface CreateAssetCardProps {
  label: string;
  previewUrl?: string | null;
  source?: AssetSource | null;
  variant?: CreateAssetCardVariant;
  isEmpty?: boolean;
  isRequired?: boolean;
  statusNote?: string;
  actions?: ReactNode;
  /** D-16/D-17 (Live-UAT-Nachtrag 2026-10-12): echter Upload-Trigger (Klick + Drag&Drop) über
   * die gemeinsame Primitive. Wird sowohl im leeren als auch im befüllten Zustand gezeigt --
   * im befüllten Fall ersetzt ein Drop/Klick das vorhandene Asset (Single-Slot-Replace bzw.
   * neuer Listeneintrag, je nach aufrufendem Slot). */
  onFilesSelected?: (files: File[]) => void;
  uploadAccept?: string;
  uploadMultiple?: boolean;
  uploadPromptLabel?: string;
  uploadDisabled?: boolean;
}

export function CreateAssetCard({
  label,
  previewUrl,
  source,
  variant = "cover",
  isEmpty,
  isRequired,
  statusNote,
  actions,
  onFilesSelected,
  uploadAccept = "image/*",
  uploadMultiple = false,
  uploadPromptLabel,
  uploadDisabled = false,
}: CreateAssetCardProps) {
  const sourceModifierClass: string = (() => {
    if (!source) return "";
    const map: Record<AssetSource, string> = {
      Jellyfin: createStyles.assetCardSourceOverlayJellyfin,
      TMDB: createStyles.assetCardSourceOverlayTMDB,
      Zerochan: createStyles.assetCardSourceOverlayZerochan,
      "Fanart.tv": createStyles.assetCardSourceOverlayFanart,
      AniList: createStyles.assetCardSourceOverlayAniList,
      Konachan: createStyles.assetCardSourceOverlayKonachan,
      Safebooru: createStyles.assetCardSourceOverlaySafebooru,
      Manuell: createStyles.assetCardSourceOverlayManuell,
      Online: createStyles.assetCardSourceOverlayOnline,
    };
    return map[source] ?? "";
  })();

  const cardVariantClass: string = (() => {
    const map: Record<CreateAssetCardVariant, string> = {
      cover: createStyles.assetCardCover,
      banner: createStyles.assetCardBanner,
      logo: createStyles.assetCardLogo,
      background: createStyles.assetCardBackground,
      backgroundVideo: createStyles.assetCardBackgroundVideo,
      adder: createStyles.assetCardAdder,
    };
    return map[variant] ?? createStyles.assetCardCover;
  })();

  const previewVariantClass: string = (() => {
    const map: Record<CreateAssetCardVariant, string> = {
      cover: createStyles.assetCardPreviewCover,
      banner: createStyles.assetCardPreviewBanner,
      logo: createStyles.assetCardPreviewLogo,
      background: createStyles.assetCardPreviewBackground,
      backgroundVideo: createStyles.assetCardPreviewBackgroundVideo,
      adder: createStyles.assetCardPreviewAdder,
    };
    return map[variant] ?? createStyles.assetCardPreviewCover;
  })();

  const imageVariantClass: string = (() => {
    const map: Record<CreateAssetCardVariant, string> = {
      cover: createStyles.assetCardImageCover,
      banner: createStyles.assetCardImageBanner,
      logo: createStyles.assetCardImageLogo,
      background: createStyles.assetCardImageBackground,
      backgroundVideo: createStyles.assetCardImageBackgroundVideo,
      adder: createStyles.assetCardImageCover,
    };
    return map[variant] ?? createStyles.assetCardImageCover;
  })();

  const emptyClass =
    variant === "adder" ? createStyles.assetCardEmptyAdder : createStyles.assetCardEmptyStandard;

  return (
    <div className={[createStyles.assetCard, cardVariantClass].join(" ")}>
      <div className={createStyles.assetCardHeader}>
        <span className={createStyles.assetCardLabel}>
          {label}
          {isRequired ? <span className={createStyles.assetCardRequired}> *</span> : null}
        </span>
        {source ? (
          <span
            className={[createStyles.assetCardSourcePill, sourceModifierClass]
              .filter(Boolean)
              .join(" ")}
          >
            {source}
          </span>
        ) : null}
      </div>
      <div className={[createStyles.assetCardPreview, previewVariantClass].join(" ")}>
        {previewUrl && variant === "backgroundVideo" ? (
          <video
            src={previewUrl}
            className={[createStyles.assetCardImage, imageVariantClass].join(" ")}
            muted
            playsInline
            preload="metadata"
          />
        ) : previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className={[createStyles.assetCardImage, imageVariantClass].join(" ")}
          />
        ) : (
          <div className={[createStyles.assetCardEmpty, emptyClass].join(" ")}>
            <span>
              {variant === "adder"
                ? "+ Neuer Hintergrund"
                : isEmpty
                  ? isRequired
                    ? "Cover fehlt"
                    : "Noch nichts ausgewählt"
                  : "-"}
            </span>
          </div>
        )}
        {actions ? (
          <div className={createStyles.assetCardActions}>{actions}</div>
        ) : null}
        {onFilesSelected ? (
          <div className={createStyles.assetCardUploadSlot}>
            <UploadDropzone
              density="compact"
              multiple={uploadMultiple}
              accept={uploadAccept}
              disabled={uploadDisabled}
              promptLabel={uploadPromptLabel ?? (previewUrl ? `${label} ersetzen` : `${label} hochladen`)}
              onFilesSelected={onFilesSelected}
            />
          </div>
        ) : null}
        {source ? (
          <span
            className={[createStyles.assetCardImageSource, sourceModifierClass]
              .filter(Boolean)
              .join(" ")}
          >
            {source}
          </span>
        ) : null}
      </div>
      {statusNote ? (
        <div className={createStyles.assetCardFooter}>
          <span className={createStyles.assetStatusNote}>{statusNote}</span>
        </div>
      ) : null}
    </div>
  );
}
