"use client";

import type { ReactNode } from "react";
import { MediaSlot } from "@/components/ui";
import { classNames } from "@/components/ui/classNames";
import {
  ANIME_BANNER_CROP_OUTPUT_HEIGHT,
  ANIME_BANNER_CROP_OUTPUT_WIDTH,
  ANIME_COVER_CROP_OUTPUT_HEIGHT,
  ANIME_COVER_CROP_OUTPUT_WIDTH,
} from "../utils/animeAssetCropConfig";
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
  | "backgroundVideo";

interface CreateAssetCardProps {
  label: string;
  previewUrl?: string | null;
  source?: AssetSource | null;
  variant?: CreateAssetCardVariant;
  isRequired?: boolean;
  statusNote?: string;
  /** Rendered as its own row BELOW the slot (Live-UAT-Nachtrag 2026-10-12, dasselbe Muster wie
   * MediaSlot bei Fansub-Logo/Banner/Profil): Suchen/Zuschnitt/Entfernen ueberlagern das Bild
   * nicht mehr und werden nicht mehr abgeschnitten. */
  actions?: ReactNode;
  /** Weglassen fuer einen Slot, der nur geloescht, nie per Drop ersetzt werden kann (ein
   * einzelner bestehender Hintergrund/Video-Eintrag der Liste -- neue Eintraege kommen ueber
   * einen eigenen leeren "Adder"-Slot mit eigenem onFilesSelected). */
  onFilesSelected?: (files: File[]) => void;
  uploadAccept?: string;
  uploadMultiple?: boolean;
  uploadPromptLabel?: string;
  uploadDisabled?: boolean;
}

/** Ausgabeformat-Seitenverhaeltnis je Slot (Live-UAT-Nachtrag 2026-10-12, Scope-Erweiterung):
 * Cover/Banner spiegeln exakt den Zuschnitt-Ausgang wider (keine doppelte Konstante), Logo bleibt
 * optisch unveraendert (kein Zuschnitt), Background/Background-Video bleiben 16:9-aehnlich. */
function resolveAssetCardAspectRatio(variant: CreateAssetCardVariant): number {
  switch (variant) {
    case "cover":
      return ANIME_COVER_CROP_OUTPUT_WIDTH / ANIME_COVER_CROP_OUTPUT_HEIGHT;
    case "banner":
      return ANIME_BANNER_CROP_OUTPUT_WIDTH / ANIME_BANNER_CROP_OUTPUT_HEIGHT;
    case "logo":
      return 16 / 10.5;
    case "background":
    case "backgroundVideo":
      return 16 / 9;
  }
}

function defaultEmptyPromptLabel(label: string): string {
  return `${label} hochladen`;
}

export function CreateAssetCard({
  label,
  previewUrl,
  source,
  variant = "cover",
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
    };
    return map[variant] ?? createStyles.assetCardCover;
  })();

  const imageVariantClass: string = (() => {
    const map: Record<CreateAssetCardVariant, string> = {
      cover: createStyles.assetCardImageCover,
      banner: createStyles.assetCardImageBanner,
      logo: createStyles.assetCardImageLogo,
      background: createStyles.assetCardImageBackground,
      backgroundVideo: createStyles.assetCardImageBackgroundVideo,
    };
    return map[variant] ?? createStyles.assetCardImageCover;
  })();

  const hasValue = Boolean(previewUrl);
  const sourceBadge = source ? (
    <span className={classNames(createStyles.assetCardSourcePill, sourceModifierClass)}>{source}</span>
  ) : undefined;

  const previewContent = previewUrl
    ? variant === "backgroundVideo" ? (
        <video
          src={previewUrl}
          className={classNames(createStyles.assetCardImage, imageVariantClass)}
          muted
          playsInline
          preload="metadata"
        />
      ) : (
        <img
          src={previewUrl}
          alt={label}
          className={classNames(createStyles.assetCardImage, imageVariantClass)}
        />
      )
    : undefined;

  return (
    <div className={classNames(createStyles.assetCard, cardVariantClass)}>
      <div className={createStyles.assetCardHeader}>
        <span className={createStyles.assetCardLabel}>
          {label}
          {isRequired ? <span className={createStyles.assetCardRequired}> *</span> : null}
        </span>
        {sourceBadge}
      </div>

      <div className={createStyles.assetCardMediaSlotWrap}>
        <MediaSlot
          aspectRatio={resolveAssetCardAspectRatio(variant)}
          label={label}
          hasValue={hasValue}
          previewContent={previewContent}
          disabled={uploadDisabled}
          onFilesSelected={onFilesSelected}
          accept={uploadAccept}
          multiple={uploadMultiple}
          emptyPromptLabel={uploadPromptLabel ?? defaultEmptyPromptLabel(label)}
          replaceAriaLabel={`${label} ersetzen`}
          actions={actions}
          cornerBadge={sourceBadge}
          className={createStyles.assetCardMediaSlot}
        />
      </div>

      {statusNote ? (
        <div className={createStyles.assetCardFooter}>
          <span className={createStyles.assetStatusNote}>{statusNote}</span>
        </div>
      ) : null}
    </div>
  );
}
