import type {
  AdminAnimeAniSearchCreateConflictResult,
  AdminAnimeAniSearchCreateDraftResult,
  AdminAnimeAniSearchCreateResult,
} from "@/types/admin";

import { hydrateManualDraftFromAniSearchDraft, type ManualAnimeDraftValues } from "../hooks/useManualAnimeDraft";
import { buildCreateAniSearchDraftSummary } from "./createAniSearchSummary";
import { resolveCreateAniSearchDraftMergeInputs } from "./createPageHelpers";

/**
 * Zustand nach einem erfolgreichen AniSearch-Entwurfsabruf. Enthaelt die
 * AniSearch-ID, Quellenreferenz, Zusammenfassung, aktualisierte Felder,
 * Relationshinweise und den rohen Entwurf vom Backend.
 */
export interface CreateAniSearchDraftState {
  anisearchID: string;
  source: string;
  summary: string;
  updatedFields: string[];
  relationNotes: string[];
  draftStatusNotes: string[];
  draft: AdminAnimeAniSearchCreateDraftResult["draft"];
}

/**
 * Zustand, wenn eine AniSearch-ID bereits mit einem vorhandenen Anime
 * verknuepft ist. Enthaelt die Konflikts-ID, vorhandenen Titel und einen
 * Weiterleitungspfad zum bestehenden Anime.
 */
export interface CreateAniSearchConflictState {
  anisearchID: string;
  existingAnimeID: number;
  existingTitle: string;
  redirectPath: string;
}

/**
 * Erstellt den Controller-Zustand aus einem erfolgreichen AniSearch-
 * Entwurfsergebnis. Optionale Felder erlauben das Markieren ueberschriebener
 * Jellyfin-Werte und manuell beibehaltener Felder.
 */
export function buildCreateAniSearchDraftState(
  result: AdminAnimeAniSearchCreateDraftResult,
  options?: {
    overwrittenJellyfinFields?: string[];
    preservedManualFields?: string[];
  },
): CreateAniSearchDraftState {
  const summary = buildCreateAniSearchDraftSummary({
    result,
    overwrittenJellyfinFields: [...(options?.overwrittenJellyfinFields ?? [])],
    preservedManualFields: [...(options?.preservedManualFields ?? [])],
  });

  return {
    anisearchID: result.anisearch_id,
    source: result.source,
    summary: summary.message,
    updatedFields: summary.updatedFields,
    relationNotes: summary.relationNotes,
    draftStatusNotes: summary.draftStatusNotes,
    draft: result.draft,
  };
}

/**
 * Erstellt den Konfliktzustand aus einem Backend-Konfliktergebnis, das
 * zurueckgegeben wird, wenn die AniSearch-ID bereits vergeben ist.
 */
export function buildCreateAniSearchConflictState(
  result: AdminAnimeAniSearchCreateConflictResult,
): CreateAniSearchConflictState {
  return {
    anisearchID: result.anisearch_id,
    existingAnimeID: result.existing_anime_id,
    existingTitle: result.existing_title,
    redirectPath: result.redirect_path,
  };
}

/**
 * Verarbeitet das vollstaendige AniSearch-Ergebnis im Controller-Kontext.
 * Bei einem Konflikt wird der Weiterleitungspfad zurueckgegeben; bei Erfolg
 * wird der naechste Entwurfszustand mit den gemergten Daten berechnet.
 */
export function applyCreateAniSearchControllerResult(params: {
  currentDraft: ManualAnimeDraftValues;
  jellyfinSnapshot: ManualAnimeDraftValues | null;
  result: AdminAnimeAniSearchCreateResult;
}): {
  nextDraft: ManualAnimeDraftValues;
  draftResult: CreateAniSearchDraftState | null;
  redirect: CreateAniSearchConflictState | null;
} {
  if (params.result.mode === "redirect") {
    return {
      nextDraft: params.currentDraft,
      draftResult: null,
      redirect: buildCreateAniSearchConflictState(params.result),
    };
  }

  const mergeInputs = resolveCreateAniSearchDraftMergeInputs({
    currentDraft: params.currentDraft,
    jellyfinSnapshot: params.jellyfinSnapshot,
  });
  const overwrittenJellyfinFields = params.jellyfinSnapshot
    ? [...(params.result.filled_fields ?? [])]
    : [];
  const preservedManualFields = [...(params.result.manual_fields_kept ?? [])];

  return {
    nextDraft: hydrateManualDraftFromAniSearchDraft(
      params.currentDraft,
      params.result.draft,
      mergeInputs.protectedFields,
    ),
    draftResult: buildCreateAniSearchDraftState(params.result, {
      overwrittenJellyfinFields,
      preservedManualFields,
    }),
    redirect: null,
  };
}
