/**
 * aniSearchJellyfinPrecedence.ts: entscheidet für GAP-18, welche Felder eines
 * Create-Entwurfs als echte Handänderung des Admins nach einer
 * Jellyfin-Übernahme gelten und deshalb vor einem nachfolgenden
 * AniSearch-Laden geschützt werden müssen. Felder, die nur von Jellyfin
 * automatisch befüllt wurden, sind NICHT geschützt und dürfen von AniSearch
 * überschrieben werden (165-USER-REQUEST.md §14: AniSearch bleibt fachliche
 * Wahrheit für Titel, Typ, Jahr, Episoden, Beschreibung, Genres, Tags;
 * Jellyfin bleibt Quelle für Bilder/Pfad/technische Daten).
 */

import type { ManualAnimeDraftValues } from "../hooks/useManualAnimeDraft";
import { buildManualCreateDraftSnapshot } from "../hooks/useManualAnimeDraft";

function fieldDiffers(left: string, right: string): boolean {
  return left.trim() !== right.trim();
}

function arrayDiffers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return true;
  return left.some((value, index) => value.trim() !== (right[index] || "").trim());
}

/**
 * Liefert die Liste der Felder, die als echte Handänderung des Admins gelten
 * und deshalb vor einem nachfolgenden AniSearch-Laden geschützt werden. Ohne
 * eine vorangegangene Jellyfin-Übernahme (jellyfinHydratedSnapshot ist null)
 * gibt es keine Präzedenz-Prüfung — AniSearch darf dann alles setzen.
 */
export function resolveAniSearchProtectedFields(params: {
  currentDraft: ManualAnimeDraftValues;
  jellyfinHydratedSnapshot: ManualAnimeDraftValues | null;
}): string[] {
  if (!params.jellyfinHydratedSnapshot) {
    return [];
  }

  const baseline = buildManualCreateDraftSnapshot(params.jellyfinHydratedSnapshot);
  const current = params.currentDraft;
  const protectedFields: string[] = [];

  if (fieldDiffers(current.titleDE, baseline.titleDE)) protectedFields.push("title_de");
  if (fieldDiffers(current.titleEN, baseline.titleEN)) protectedFields.push("title_en");
  if (fieldDiffers(current.year, baseline.year)) protectedFields.push("year");
  if (fieldDiffers(current.maxEpisodes, baseline.maxEpisodes)) protectedFields.push("max_episodes");
  if (arrayDiffers(current.genreTokens, baseline.genreTokens)) protectedFields.push("genre");
  if (arrayDiffers(current.tagTokens, baseline.tagTokens)) protectedFields.push("tags");
  if (fieldDiffers(current.description, baseline.description)) protectedFields.push("description");
  if (current.type !== baseline.type) protectedFields.push("type");
  if (current.contentType !== baseline.contentType) protectedFields.push("content_type");
  if (current.status !== baseline.status) protectedFields.push("status");
  // GAP-18-Fix: cover_image wird absichtlich NICHT in diese Präzedenzliste
  // aufgenommen. Bilder gehören fachlich zu Jellyfin, zur manuellen Auswahl
  // oder zur Online-Bildsuche — nicht zur AniSearch-Präzedenzliste aus
  // 165-USER-REQUEST.md §14. Ein aus Jellyfin übernommenes oder per
  // Online-Suche gewähltes Cover darf durch ein späteres AniSearch-Laden
  // niemals ersetzt werden, unabhängig davon, ob es sich "geändert" hat.

  return protectedFields;
}
