import type {
  AdminAnimeAniSearchCreateConflictResult,
  AdminAnimeAniSearchCreateDraftResult,
  AdminAnimeAniSearchCreateResult,
} from "@/types/admin";

import { hydrateManualDraftFromAniSearchDraft, type ManualAnimeDraftValues } from "../hooks/useManualAnimeDraft";
import { buildCreateAniSearchDraftSummary, resolveCreateAniSearchDraftMergeInputs } from "./createPageHelpers";

export interface CreateAniSearchDraftState {
  anisearchID: string;
  source: string;
  summary: string;
  filledFields: string[];
  manualFieldsKept: string[];
  filledAssets: string[];
  relationCandidateCount: number;
  relationMatchCount: number;
  jellysyncApplied: boolean;
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
): CreateAniSearchDraftState {
  return {
    anisearchID: result.anisearch_id,
    source: result.source,
    summary: buildCreateAniSearchDraftSummary(result),
    filledFields: [...(result.filled_fields ?? [])],
    manualFieldsKept: [...(result.manual_fields_kept ?? [])],
    filledAssets: [...(result.filled_assets ?? [])],
    relationCandidateCount: result.provider.relation_candidates,
    relationMatchCount: result.provider.relation_matches,
    jellysyncApplied: result.provider.jellysync_applied,
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

  return {
    nextDraft: hydrateManualDraftFromAniSearchDraft(
      params.currentDraft,
      params.result.draft,
      mergeInputs.protectedFields,
    ),
    draftResult: buildCreateAniSearchDraftState(params.result),
    redirect: null,
  };
}
