// createPageHelpers.ts: static helper functions extracted from page.tsx to keep
// the create-route component under the 700-line guardrail. These functions have
// no component state dependencies and can be imported and tested independently.

import { ApiError } from "@/lib/api";
import type {
  AdminAnimeCreateAniSearchSummary,
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
  if (summary.warnings.length > 0) return true;
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

  if ((summary?.warnings.length ?? 0) > 0) {
    parts.push(summary!.warnings.join(" "));
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
    ) => Promise<{ data: { id: number } }>;
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
      ? "Jellyfin nutzt den aktuellen Titel als Suchanfrage. AniSearch Sync kommt in Phase 4."
      : "Gib zuerst einen aussagekraeftigen Anime-Titel ein. AniSearch Sync kommt in Phase 4.",
  };
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
