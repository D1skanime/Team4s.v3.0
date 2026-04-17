"use client";

import type { ReactNode } from "react";
import createStyles from "./page.module.css";

export type AssetSource = "Jellyfin" | "Manuell" | "Online" | "TMDB" | "Zerochan";

interface CreateAssetCardProps {
  label: string;
  previewUrl?: string | null;
  source?: AssetSource | null;
  isEmpty?: boolean;
  isRequired?: boolean;
  statusNote?: string;
  actions?: ReactNode;
}

export function CreateAssetCard({
  label,
  previewUrl,
  source,
  isEmpty,
  isRequired,
  statusNote,
  actions,
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

  return (
    <div className={createStyles.assetCard}>
      <div className={createStyles.assetCardPreview}>
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={label}
            className={createStyles.assetCardImage}
          />
        ) : (
          <div className={createStyles.assetCardEmpty}>
            <span>{isEmpty ? (isRequired ? "Cover fehlt" : "Noch nichts ausgewählt") : "–"}</span>
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
      <div className={createStyles.assetCardMeta}>
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
