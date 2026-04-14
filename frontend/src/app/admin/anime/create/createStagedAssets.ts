/**
 * createStagedAssets.ts: Typdefinitionen und Hilfsfunktionen fuer vorbereitete
 * (gestagede) Assets auf der Anime-Erstellen-Seite. Ausgelagert, damit die
 * Hauptkomponente unter der 700-Zeilen-Grenze bleibt und die Asset-Logik
 * separat testbar ist.
 */

import type { AdminAnimeAssetKind } from "@/types/admin";
import { stageManualCreateAsset } from "./createAssetUploadPlan";
import type { CreateAssetUploadDraftValue } from "./createAssetUploadPlan";

/**
 * Asset-Arten, die als einzelner Slot (nicht als Liste) verwaltet werden.
 * Schliesse Cover und Hintergrundbilder aus, die gesondert behandelt werden.
 */
export type CreateSingleAssetKind = Exclude<
  AdminAnimeAssetKind,
  "cover" | "background"
>;

/**
 * Repraesentiert alle manuell vorbereiteten (gestaged) Assets waehrend des
 * Anime-Erstellens, bevor sie nach dem Speichern hochgeladen werden.
 */
export interface CreateManualStagedAssets {
  banner: CreateAssetUploadDraftValue | null;
  logo: CreateAssetUploadDraftValue | null;
  background: CreateAssetUploadDraftValue[];
  background_video: CreateAssetUploadDraftValue | null;
}

/**
 * Erstellt ein leeres Objekt fuer vorbereitete Assets, bei dem alle Slots null
 * bzw. leer sind. Wird als Anfangszustand beim Erstellen eines neuen Anime
 * verwendet.
 */
export function createEmptyManualStagedAssets(): CreateManualStagedAssets {
  return {
    banner: null,
    logo: null,
    background: [],
    background_video: null,
  };
}

/**
 * Gibt den Objekt-URL eines einzelnen gestaged-Assets frei, um Speicherlecks
 * zu verhindern. Wird aufgerufen, wenn ein Asset ersetzt oder verworfen wird.
 */
export function revokeStagedAssetPreview(
  asset: CreateAssetUploadDraftValue | null,
) {
  if (asset?.previewUrl) {
    URL.revokeObjectURL(asset.previewUrl);
  }
}

/**
 * Gibt alle Objekt-URLs aller gestaged-Assets auf einmal frei. Wird beim
 * Unmount der Seite oder beim vollstaendigen Zuruecksetzen der Assets verwendet.
 */
export function revokeStagedAssetPreviews(assets: CreateManualStagedAssets) {
  revokeStagedAssetPreview(assets.banner);
  revokeStagedAssetPreview(assets.logo);
  revokeStagedAssetPreview(assets.background_video);
  for (const entry of assets.background) {
    revokeStagedAssetPreview(entry);
  }
}

/**
 * Ersetzt einen einzelnen Asset-Slot mit einer neuen Datei und gibt die
 * vorherige Preview-URL frei. Gibt sowohl das aktualisierte Assets-Objekt
 * als auch den neuen gestaged-Asset-Eintrag zurueck.
 */
export function buildReplacedSingleAsset(
  current: CreateManualStagedAssets,
  kind: CreateSingleAssetKind,
  file: File,
): { next: CreateManualStagedAssets; staged: CreateAssetUploadDraftValue } {
  const staged = stageManualCreateAsset(file);
  const previous = current[kind];
  revokeStagedAssetPreview(previous);
  return {
    next: { ...current, [kind]: staged },
    staged,
  };
}
