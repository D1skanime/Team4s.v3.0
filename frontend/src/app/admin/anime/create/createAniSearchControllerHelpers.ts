import type {
  AdminAnimeAniSearchCreateConflictResult,
  AdminAnimeAniSearchCreateDraftResult,
  AdminAnimeAniSearchCreateResult,
} from "@/types/admin";

import { hydrateManualDraftFromAniSearchDraft, type ManualAnimeDraftValues } from "../hooks/useManualAnimeDraft";
import { buildCreateAniSearchDraftSummary } from "./createAniSearchSummary";
import { resolveCreateAniSearchDraftMergeInputs } from "./createPageHelpers";

export interface CreateAniSearchDraftState {
  anisearchID: string;
  source: string;
  summary: string;
  updatedFields: string[];
  relationNotes: string[];
  draftStatusNotes: string[];
  draft: AdminAnimeAniSearchCreateDraftResult["draft"];
}

export interface CreateAniSearchConflictState {
  anisearchID: string;
  existingAnimeID: number;
  existingTitle: string;
  redirectPath: string;
}

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
