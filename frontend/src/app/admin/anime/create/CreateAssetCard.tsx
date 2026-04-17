"use client";

import type { ReactNode } from "react";
import { Upload } from "lucide-react";
import createStyles from "./page.module.css";

export type AssetSource = "Jellyfin" | "Manuell" | "Online" | "TMDB" | "Zerochan";

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
  onEmptyClick?: () => void;
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
  onEmptyClick,
}: CreateAssetCardProps) {
  const sourceModifierClass: string = (() => {
    if (!source) return "";
    const map: Record<AssetSource, string> = {
      Jellyfin: createStyles.assetCardSourceOverlayJellyfin,
      TMDB: createStyles.assetCardSourceOverlayTMDB,
      Zerochan: createStyles.assetCardSourceOverlayZerochan,
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
  const metaClass =
    variant === "adder" ? createStyles.assetCardMetaAdder : createStyles.assetCardMetaDefault;

  return (
    <div className={[createStyles.assetCard, cardVariantClass].join(" ")}>
      <div className={[createStyles.assetCardPreview, previewVariantClass].join(" ")}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className={[createStyles.assetCardImage, imageVariantClass].join(" ")}
          />
        ) : onEmptyClick ? (
          <div
            className={[createStyles.assetCardEmpty, createStyles.assetCardEmptyClickable].join(" ")}
            onClick={onEmptyClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onEmptyClick();
              }
            }}
          >
            <span>{isEmpty ? (isRequired ? "Cover fehlt" : "Noch nichts ausgewählt") : "–"}</span>
            <Upload size={20} className={createStyles.assetCardEmptyUploadIcon} />
          </div>
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
        {source ? (
          <span
            className={[createStyles.assetCardSourceOverlay, sourceModifierClass]
              .filter(Boolean)
              .join(" ")}
          >
            {source}
          </span>
        ) : null}
      </div>
      <div className={[createStyles.assetCardMeta, metaClass].join(" ")}>
        <span className={createStyles.assetCardLabel}>
          {label}
          {isRequired ? <span className={createStyles.assetCardRequired}> *</span> : null}
        </span>
        {statusNote ? (
          <span className={createStyles.assetStatusNote}>{statusNote}</span>
        ) : null}
        {actions ? (
          <div className={createStyles.assetCardActions}>{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
