// createPageHelpers.ts: static helper functions extracted from page.tsx to keep
// the create-route component under the 700-line guardrail. These functions have
// no component state dependencies and can be imported and tested independently.

import { ApiError } from "@/lib/api";
import type {
  AdminAnimeAniSearchCreateDraftResult,
  AdminAnimeCreateAniSearchSummary,
  AdminAnimeCreateDraftPayload,
  AdminAnimeCreateRequest,
  AdminAnimeUpsertResponse,
  AdminAnimeJellyfinIntakePreviewResult,
} from "@/types/admin";
import type { ManualAnimeDraftValues } from "../hooks/useManualAnimeDraft";
import { buildManualCreateDraftSnapshot } from "../hooks/useManualAnimeDraft";

export const CREATE_REDIRECT_DELAY_MS = 1600;

export function buildManualCreateRedirectPath(id: number): string {
  return `/admin/anime?created=${id}#anime-${id}`;
}

function hasAniSearchFollowThroughWarning(
  summary: AdminAnimeCreateAniSearchSummary | undefined,
): boolean {
  if (!summary) return false;
  if ((summary.warnings ?? []).length > 0) return true;
  return summary.relations_attempted > summary.relations_applied;
}

export function buildCreateSuccessMessage(
  response: Pick<AdminAnimeUpsertResponse, "data" | "anisearch">,
): string {
  const summary = response.anisearch;
  if (!hasAniSearchFollowThroughWarning(summary)) {
    return `Anime #${response.data.id} wurde erstellt. (Weiterleitung zur Uebersicht...)`;
  }

  const parts = [`Anime #${response.data.id} wurde erstellt.`];
  const sourceLabel = summary?.source ? `AniSearch ${summary.source}` : "AniSearch";
  parts.push(
    `${sourceLabel}: ${summary?.relations_applied ?? 0}/${summary?.relations_attempted ?? 0} Relationen uebernommen.`,
  );

  if ((summary?.relations_skipped_existing ?? 0) > 0) {
    parts.push(
      `${summary?.relations_skipped_existing} bereits vorhandene Relationen wurden uebersprungen.`,
    );
  }

  if ((summary?.warnings?.length ?? 0) > 0) {
    parts.push((summary?.warnings ?? []).join(" "));
  }

  parts.push("(Weiterleitung zur Uebersicht...)");
  return parts.join(" ");
}

export function appendJellyfinLinkageToCreatePayload(
  payload: AdminAnimeCreateRequest,
  preview: AdminAnimeJellyfinIntakePreviewResult | null,
): AdminAnimeCreateRequest {
  if (!preview) {
    return payload;
  }

  const source = `jellyfin:${preview.jellyfin_series_id.trim()}`;
  const folderName = preview.jellyfin_series_path?.trim();

  return {
    ...payload,
    source,
    folder_name: folderName || undefined,
  };
}

export async function createManualAnimeAndRedirect(
  payload: AdminAnimeCreateRequest,
  deps: {
    createAdminAnime: (
      payload: AdminAnimeCreateRequest,
      authToken?: string,
    ) => Promise<Pick<AdminAnimeUpsertResponse, "data" | "anisearch">>;
    setLocationHref: (value: string) => void;
    authToken?: string;
  },
) {
  const response = deps.authToken
    ? await deps.createAdminAnime(payload, deps.authToken)
    : await deps.createAdminAnime(payload);
  deps.setLocationHref(buildManualCreateRedirectPath(response.data.id));
  return response;
}

export function formatCreatePageError(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof ApiError) {
    const details = (error.details || "").trim();
    return details
      ? `(${error.status}) ${error.message}\n${details}`
      : `(${error.status}) ${error.message}`;
  }

  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

export function resolveJellyfinReviewVisibility(
  candidateCount: number,
  reviewMode: "idle" | "review" | "hydrated",
) {
  const hasCandidates = candidateCount > 0;

  return {
    showCandidateReview: hasCandidates && reviewMode !== "hydrated",
    showRestartAction: hasCandidates && reviewMode === "hydrated",
  };
}

export function resolveSourceActionState(title: string) {
  const trimmed = title.trim();
  const meaningful = trimmed.length >= 2 && /[\p{L}\p{N}]/u.test(trimmed);
  return {
    canSync: meaningful,
    helperText: meaningful
      ? "Jellyfin nutzt den aktuellen Titel als Suchanfrage. AniSearch laedt gezielt per ID."
      : "Gib zuerst einen aussagekraeftigen Anime-Titel ein, damit Jellyfin suchen kann. AniSearch laedt gezielt per ID.",
  };
}

export function appendCreateSourceLinkageToPayload(
  payload: AdminAnimeCreateRequest,
  params: {
    aniSearchDraftResult?: Pick<AdminAnimeAniSearchCreateDraftResult, "draft"> | null;
    jellyfinPreview: AdminAnimeJellyfinIntakePreviewResult | null;
  },
): AdminAnimeCreateRequest {
  const aniSearchDraft = params.aniSearchDraftResult?.draft;
  if (aniSearchDraft?.source?.trim()) {
    return {
      ...payload,
      source: aniSearchDraft.source.trim(),
      folder_name: normalizeOptionalString(aniSearchDraft.folder_name ?? ""),
      relations: aniSearchDraft.relations ? [...aniSearchDraft.relations] : undefined,
    };
  }

  return appendJellyfinLinkageToCreatePayload(payload, params.jellyfinPreview);
}

export function buildCreateAniSearchDraftSummary(
  result: Pick<
    AdminAnimeAniSearchCreateDraftResult,
    "anisearch_id" | "manual_fields_kept" | "filled_fields" | "filled_assets" | "provider"
  >,
): string {
  const manualFieldCount = result.manual_fields_kept?.length ?? 0;
  const filledFieldCount = result.filled_fields?.length ?? 0;
  const filledAssetCount = result.filled_assets?.length ?? 0;
  const relationCount = result.provider.relation_matches ?? 0;
  const providerLabel = result.provider.jellysync_applied
    ? "Jellysync-Fill aktiv"
    : "ohne Jellysync-Fill";

  return [
    `AniSearch ${result.anisearch_id} geladen.`,
    `${filledFieldCount} Felder aktualisiert, ${manualFieldCount} manuell behalten, ${filledAssetCount} Assets vorgeschlagen.`,
    `${relationCount}/${result.provider.relation_candidates} Relationen lokal zugeordnet, ${providerLabel}.`,
    "Noch nichts gespeichert.",
  ].join(" ");
}

function normalizeOptionalString(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function parseOptionalPositiveInt(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number.parseInt(trimmed, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function mapManualDraftToCreateDraft(
  values: ManualAnimeDraftValues,
): AdminAnimeCreateDraftPayload {
  return {
    title: values.title.trim(),
    type: values.type,
    content_type: values.contentType,
    status: values.status,
    year: parseOptionalPositiveInt(values.year),
    max_episodes: parseOptionalPositiveInt(values.maxEpisodes),
    title_de: normalizeOptionalString(values.titleDE),
    title_en: normalizeOptionalString(values.titleEN),
    genre: values.genreTokens.length > 0 ? values.genreTokens.join(", ") : undefined,
    tags: values.tagTokens.length > 0 ? [...values.tagTokens] : undefined,
    description: normalizeOptionalString(values.description),
    cover_image: normalizeOptionalString(values.coverImage),
  }
}

function fieldDiffers(left: string, right: string): boolean {
  return left.trim() !== right.trim()
}

function arrayDiffers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return true
  return left.some((value, index) => value.trim() !== (right[index] || "").trim())
}

export function resolveCreateAniSearchDraftMergeInputs(params: {
  currentDraft: ManualAnimeDraftValues
  jellyfinSnapshot: ManualAnimeDraftValues | null
}) {
  const baseline = params.jellyfinSnapshot
    ? buildManualCreateDraftSnapshot(params.jellyfinSnapshot)
    : buildManualCreateDraftSnapshot(params.currentDraft)
  const current = params.currentDraft
  const protectedFields: string[] = []

  if (params.jellyfinSnapshot) {
    if (fieldDiffers(current.titleDE, baseline.titleDE)) protectedFields.push("title_de")
    if (fieldDiffers(current.titleEN, baseline.titleEN)) protectedFields.push("title_en")
    if (fieldDiffers(current.year, baseline.year)) protectedFields.push("year")
    if (fieldDiffers(current.maxEpisodes, baseline.maxEpisodes)) protectedFields.push("max_episodes")
    if (arrayDiffers(current.genreTokens, baseline.genreTokens)) protectedFields.push("genre")
    if (arrayDiffers(current.tagTokens, baseline.tagTokens)) protectedFields.push("tags")
    if (fieldDiffers(current.description, baseline.description)) protectedFields.push("description")
    if (fieldDiffers(current.coverImage, baseline.coverImage)) protectedFields.push("cover_image")
    if (current.type !== baseline.type) protectedFields.push("type")
    if (current.contentType !== baseline.contentType) protectedFields.push("content_type")
    if (current.status !== baseline.status) protectedFields.push("status")
  }

  return {
    requestDraft: mapManualDraftToCreateDraft(baseline),
    protectedFields,
  }
}

export function buildManualCreateDraftSnapshotHelper(
  values: ManualAnimeDraftValues,
): ManualAnimeDraftValues {
  return buildManualCreateDraftSnapshot(values);
}

export function resolveJellyfinPreviewBaseDraft(
  currentDraft: ManualAnimeDraftValues,
  existingSnapshot: ManualAnimeDraftValues | null,
): ManualAnimeDraftValues {
  return existingSnapshot
    ? buildManualCreateDraftSnapshot(existingSnapshot)
    : buildManualCreateDraftSnapshot(currentDraft);
}
