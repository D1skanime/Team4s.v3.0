// D-24 truly-shared bucket (174-06): RESEARCH.md anticipated that most of
// the media/assets cross-cutting bucket would turn out to be consumer-
// specific (see admin/anime-assets.ts, admin/fansub-media.ts,
// admin/segment-assets.ts, releases.ts, members-media.ts, and
// contributions-me.ts's uploadMediaSuggestion) rather than belonging in one
// shared media.ts god-module. getMediaOwnershipProjection is the one
// genuine exception: it takes a generic `ownerType` string parameter (not
// hardcoded to one domain) and has zero production call sites of its own
// (Phase 72's GET-only media-ownership projection infrastructure) -- the
// textbook "truly shared mechanics, not one owning domain" case this file
// exists for.
import { apiClientFetch, ApiError, getApiBaseUrl, parseApiErrorPayload } from "./client";
import type { MediaOwnershipProjectionResponse } from "@/types/media-ownership";

export async function getMediaOwnershipProjection(
  ownerType: string,
  ownerID: number,
): Promise<MediaOwnershipProjectionResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const encodedOwnerType = encodeURIComponent(ownerType);
  const response = await apiClientFetch(
    `${API_BASE_URL}/api/v1/media-ownership/${encodedOwnerType}/${ownerID}`,
    { cache: "no-store" },
  );

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      parsed.message,
      null,
      parsed.code,
      parsed.details,
    );
  }

  return response.json() as Promise<MediaOwnershipProjectionResponse>;
}
