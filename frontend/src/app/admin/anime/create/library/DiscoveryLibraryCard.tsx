"use client";

// DiscoveryLibraryCard (D-24, Update-Durchlauf 2): eine Karte pro Bibliothekseintrag
// der Discovery-Liste. Feld-/Informationshierarchie wiederverwendet von
// JellyfinCandidateCard.tsx (Poster -> Titel -> "{Jahr} | {Pfad}" -> "{Typ} |
// {Bibliothek}" -> Status(-detail) -> Aktionen) — dessen native article/button/img
// Markup-Elemente + eigenes CSS-Modul werden NICHT übernommen
// (D-13/CLAUDE.md "closest-analog"-Klausel, siehe 165-UI-SPEC.md Design-Entscheidung
// 1/22). Reines, zustandsloses Callback-Prop-Component — keine eigenen API-Aufrufe;
// DiscoveryLibraryPanel (Task 3) verdrahtet Navigation/Mutationen.

import type { CSSProperties } from "react";

import { Badge, Button, Card } from "@/components/ui";
import type { AdminJellyfinDiscoveryItem } from "@/types/admin";

import {
  buildDiscoveryCardMetaLine,
  mapDiscoveryStatusToBadgeVariant,
  mapDiscoveryStatusToLabel,
  mapDiscoveryTypeHintToLabel,
} from "./discoveryPageHelpers";

export interface DiscoveryLibraryCardProps {
  item: AdminJellyfinDiscoveryItem;
  onCreate: (jellyfinItemID: string) => void;
  onOpenExisting: (existingAnimeID: number) => void;
  onIgnore: (jellyfinItemID: string) => void;
  onUnignore: (jellyfinItemID: string) => void;
}

const cardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "96px minmax(0,1fr)",
  gap: "var(--space-2)",
  padding: "var(--space-4)",
};

const posterWrapStyle: CSSProperties = {
  width: "96px",
  aspectRatio: "2 / 3",
  borderRadius: "var(--radius-md)",
  overflow: "hidden",
  flexShrink: 0,
  background: "var(--surface-sunken)",
};

const contentStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-2)",
  minWidth: 0,
};

const titleStyle: CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  lineHeight: 1.3,
  margin: 0,
};

const bodyLineStyle: CSSProperties = {
  fontSize: "14px",
  fontWeight: 400,
  lineHeight: 1.5,
  margin: 0,
};

const pathLineStyle: CSSProperties = {
  ...bodyLineStyle,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const captionStyle: CSSProperties = {
  fontSize: "12px",
  fontWeight: 600,
  lineHeight: 1.2,
  margin: 0,
};

const statusBlockStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
  alignItems: "flex-start",
};

const actionsStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--space-1)",
};

export function DiscoveryLibraryCard({
  item,
  onCreate,
  onOpenExisting,
  onIgnore,
  onUnignore,
}: DiscoveryLibraryCardProps) {
  const typeLabel = mapDiscoveryTypeHintToLabel(item.type_hint?.suggested_type);
  const metaLine2 = buildDiscoveryCardMetaLine(typeLabel, item.parent_context, item.library_context);
  const yearPathLine = `${item.year != null ? `${item.year} | ` : ""}${item.path || "ohne Pfad"}`;
  const badgeVariant = mapDiscoveryStatusToBadgeVariant(item.status);
  const statusLabel = mapDiscoveryStatusToLabel(item.status);

  return (
    <Card style={cardStyle}>
      <div style={posterWrapStyle}>
        {item.poster_url ? (
          <img
            src={item.poster_url}
            alt={`Poster von ${item.name}`}
            loading="lazy"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div aria-hidden="true" style={{ width: "100%", height: "100%" }} />
        )}
      </div>

      <div style={contentStyle}>
        <h3 style={titleStyle}>{item.name}</h3>
        <p style={pathLineStyle} title={item.path || undefined}>
          {yearPathLine}
        </p>
        <p style={bodyLineStyle}>{metaLine2}</p>

        <div style={statusBlockStyle}>
          <Badge variant={badgeVariant}>{statusLabel}</Badge>
          {item.status === "existing" ? (
            <p style={bodyLineStyle}>
              {item.existing_title || item.name}
              {item.existing_anime_id != null ? ` (#${item.existing_anime_id})` : ""}
            </p>
          ) : null}
          {item.status === "partial" ? (
            <p style={captionStyle}>
              Mehrere Staffeln erkannt – noch nicht jede Staffel einem Anime zugeordnet.
            </p>
          ) : null}
        </div>

        <div style={actionsStyle}>
          {item.status === "existing" ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (item.existing_anime_id != null) onOpenExisting(item.existing_anime_id);
              }}
            >
              Anime öffnen
            </Button>
          ) : item.status === "ignored" ? (
            <Button variant="secondary" size="sm" onClick={() => onUnignore(item.jellyfin_item_id)}>
              Nicht mehr ignorieren
            </Button>
          ) : (
            <>
              <Button variant="primary" size="sm" onClick={() => onCreate(item.jellyfin_item_id)}>
                Anime anlegen
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onIgnore(item.jellyfin_item_id)}>
                Ignorieren
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
