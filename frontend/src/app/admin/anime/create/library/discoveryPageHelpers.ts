/**
 * discoveryPageHelpers.ts: Reine Hilfsfunktionen der Discovery-Bibliotheksliste
 * (/admin/anime/create/library, 165-09) — Status-/Typ-Label-Mapping, Badge-Variante
 * und der Rücksprung-/Weiterleitungs-URL-Bau. Keine Komponentenzustands-Abhängigkeit,
 * unabhängig importier- und testbar (analog createPageHelpers.ts, 165-05).
 *
 * Deviation-Hinweis (165-09, siehe SUMMARY.md): `AdminJellyfinDiscoveryItem.status`
 * (165-06, `resolveDiscoveryItemStatus`) liefert tatsächlich die englische
 * DiscoveryStatus*-Vokabular ("open"/"existing"/"partial"/"ignored"), NICHT die
 * deutsche `filter`-Query-Parameter-Vokabular ("offen"/"bereits_vorhanden"/…), die im
 * Ursprungsplan als Beispieleingabe für `mapDiscoveryStatusToBadgeVariant` genannt
 * wurde. `mapDiscoveryStatusToBadgeVariant`/`mapDiscoveryStatusToLabel` arbeiten daher
 * auf der tatsächlichen Backend-Vokabular, um DiscoveryLibraryCard (Task 2) korrekt
 * mit echten API-Antworten zu verdrahten (Rule 1 - Bugfix vor Implementierung).
 */

import type { AdminJellyfinDiscoveryStatus } from "@/types/admin";

export type DiscoveryBadgeVariant = "muted" | "success" | "warning" | "info";

const STATUS_BADGE_VARIANTS: Record<AdminJellyfinDiscoveryStatus, DiscoveryBadgeVariant> = {
  open: "muted",
  existing: "success",
  partial: "warning",
  ignored: "info",
};

/** UI-SPEC Color-Sektion: Offen=muted, Bereits vorhanden=success, Teilweise=warning, Ignoriert=info. */
export function mapDiscoveryStatusToBadgeVariant(
  status: AdminJellyfinDiscoveryStatus | string,
): DiscoveryBadgeVariant {
  return STATUS_BADGE_VARIANTS[status as AdminJellyfinDiscoveryStatus] ?? "muted";
}

const STATUS_LABELS: Record<AdminJellyfinDiscoveryStatus, string> = {
  open: "Offen",
  existing: "Bereits vorhanden",
  partial: "Teilweise",
  ignored: "Ignoriert",
};

/** Der Badge-Text ist immer das deutsche Statuswort selbst (WCAG 1.4.1, nie nur Farbe). */
export function mapDiscoveryStatusToLabel(status: AdminJellyfinDiscoveryStatus | string): string {
  return STATUS_LABELS[status as AdminJellyfinDiscoveryStatus] ?? "Offen";
}

const TYPE_HINT_LABELS: Record<string, string> = {
  tv: "Serie",
  film: "Film",
  ova: "OVA",
  ona: "ONA",
  special: "Special",
  bonus: "Special",
};

/** UI-SPEC's exaktes Typ-Label-Set: Serie/Film/OVA/Special/ONA/Unbekannt (Design-Entscheidung 11). */
export function mapDiscoveryTypeHintToLabel(suggestedType?: string | null): string {
  if (!suggestedType) return "Unbekannt";
  return TYPE_HINT_LABELS[suggestedType] ?? "Unbekannt";
}

/**
 * D-24 Karten-Metazeile 2: "{Typ} | {Bibliothek}", ohne "| Bibliothek"-Suffix wenn
 * `libraryContext` leer/null/undefined ist (pfadbasiert, keine zusätzliche Anfrage).
 */
export function buildDiscoveryCardMetaLine(typeLabel: string, libraryContext?: string | null): string {
  if (libraryContext) return `${typeLabel} | ${libraryContext}`;
  return typeLabel;
}

export interface BuildDiscoveryCreateURLParams {
  jellyfinItemID: string;
  currentDiscoveryURL?: string;
}

/**
 * Ziel-URL für "Anime anlegen" (Design-Entscheidung 3):
 * /admin/anime/create?jellyfin_id={id}&from=discovery&return={encodedDiscoveryURL}.
 * `return` entfällt, wenn keine aktuelle Discovery-URL übergeben wird.
 */
export function buildDiscoveryCreateURL({
  jellyfinItemID,
  currentDiscoveryURL,
}: BuildDiscoveryCreateURLParams): string {
  const base = `/admin/anime/create?jellyfin_id=${encodeURIComponent(jellyfinItemID)}&from=discovery`;
  if (!currentDiscoveryURL) return base;
  return `${base}&return=${encodeURIComponent(currentDiscoveryURL)}`;
}
