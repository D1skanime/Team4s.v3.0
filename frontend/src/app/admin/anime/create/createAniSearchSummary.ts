import type { AdminAnimeAniSearchCreateDraftResult } from "@/types/admin";

/**
 * Parameter fuer die Erstellung einer AniSearch-Entwurfs-Zusammenfassung.
 * Enthaelt das Ergebnis vom Backend sowie Listen ueberschriebener und
 * beibehaltener Felder.
 */
interface BuildCreateAniSearchDraftSummaryParams {
  result: Pick<
    AdminAnimeAniSearchCreateDraftResult,
    "anisearch_id" | "filled_fields" | "manual_fields_kept" | "provider"
  >;
  overwrittenJellyfinFields: string[];
  preservedManualFields: string[];
}

/**
 * Strukturierte Zusammenfassung nach dem Laden eines AniSearch-Entwurfs,
 * bestehend aus einer Hauptnachricht, Detailnotizen, aktualisierten Feldern,
 * Relationshinweisen und Entwurfsstatusnotizen.
 */
export interface CreateAniSearchDraftSummary {
  message: string;
  notes: string[];
  updatedFields: string[];
  relationNotes: string[];
  draftStatusNotes: string[];
}

/**
 * Gibt die Werte als kommagetrennte Zeichenkette zurueck oder den Fallback-
 * Text, wenn die Liste leer ist. Hilfsfunktion fuer lesbare Zusammenfassungen.
 */
function joinOrFallback(values: string[], fallback: string): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

/**
 * Erstellt eine strukturierte Zusammenfassung nach dem Laden eines
 * AniSearch-Entwurfs. Beruecksichtigt ueberschriebene Jellyfin-Felder,
 * manuell beibehaltene Felder und Relationsstatistiken.
 */
export function buildCreateAniSearchDraftSummary({
  result,
  overwrittenJellyfinFields,
  preservedManualFields,
}: BuildCreateAniSearchDraftSummaryParams): CreateAniSearchDraftSummary {
  const updatedFields = [...(result.filled_fields ?? [])];
  const relationNotes =
    result.provider.relation_candidates > 0
      ? [
          `${result.provider.relation_matches} von ${result.provider.relation_candidates} AniSearch-Relationen konnten lokal zugeordnet werden.`,
        ]
      : ["AniSearch hat keine lokalen Relationen fuer diesen Titel gefunden."];
  const draftStatusNotes: string[] = [];
  const notes = [
    `Aktualisiert: ${joinOrFallback(updatedFields, "keine Felder")}.`,
    `Relationen: ${relationNotes[0]}`,
  ];

  if (overwrittenJellyfinFields.length > 0) {
    draftStatusNotes.push(
      `AniSearch hat bestehende Jellyfin-Werte fuer ${overwrittenJellyfinFields.join(", ")} ueberschrieben.`,
    );
    notes.push(`Jellyfin ersetzt: ${overwrittenJellyfinFields.join(", ")}.`);
  }

  if (preservedManualFields.length > 0) {
    draftStatusNotes.push(
      `Manuell gepflegte ${preservedManualFields.join(", ")} bleiben erhalten.`,
    );
    notes.push(`Manuell behalten: ${preservedManualFields.join(", ")}.`);
  }

  draftStatusNotes.push(
    "Noch nichts gespeichert. Erst Speichern uebernimmt die Daten dauerhaft.",
  );
  notes.push("Noch nichts gespeichert.");

  return {
    message: `AniSearch ID ${result.anisearch_id} hat den Entwurf aktualisiert. Noch nichts gespeichert.`,
    notes,
    updatedFields,
    relationNotes,
    draftStatusNotes,
  };
}
