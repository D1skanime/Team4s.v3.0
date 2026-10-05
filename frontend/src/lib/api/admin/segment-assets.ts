// D-24 sub-split (174-06): the 10 segment-asset/preview-image functions
// triaged out of the media/assets cross-cutting bucket in api.ts. Siblings
// of admin/segments.ts (174-03, core segment CRUD) but a distinct
// sub-concern (asset/render/preview-image upload+assignment vs. segment
// CRUD) -- confirmed via grep call-site triage: all 10 are consumed
// exclusively from admin/episode-versions/[versionId]/edit/** (
// useSegmentAssetHandlers.ts, useSegmentPreviewImageHandlers.ts,
// useReleaseSegments.ts, SegmenteTab.tsx), the episode-version editor
// surface, not any release-version-media or profile flow.
import {
  AdminSegmentLibraryAttachRequest,
  AdminSegmentLibraryCandidatesResponse,
  AdminSegmentPreviewImageCandidatesResponse,
  AdminSegmentSuggestionsResponse,
  AdminThemeSegment,
  AdminThemeSegmentRenderResponse,
} from "@/types/admin";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiErrorPayload,
  withAuthHeader,
} from "../client";

export async function renderAnimeSegment(
  segmentId: number,
  releaseVersionId?: number | null,
  authToken?: string,
): Promise<AdminThemeSegmentRenderResponse> {
  const API_BASE_URL = getApiBaseUrl();
  // release_version_id ist backend-seitig der Diskriminator fuer die release-version-scoped
  // Render-Quelle; ohne ihn liefert der Endpoint 404 (segment nicht gefunden).
  const query =
    releaseVersionId != null ? `?release_version_id=${releaseVersionId}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/segments/${segmentId}/render${query}`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
    },
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

  return response.json() as Promise<AdminThemeSegmentRenderResponse>;
}

/**
 * Laedt Segment-Vorschläge für einen Anime und eine Episodennummer aus anderen Releases.
 * Optional kann die aktuelle (excludeGroupId, excludeVersion)-Kombination ausgeschlossen werden.
 */
export async function getAnimeSegmentSuggestions(
  animeId: number,
  episode: number,
  excludeGroupId?: number | null,
  excludeVersion?: string | null,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminSegmentSuggestionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("episode", String(episode));
  if (excludeGroupId) params.set("exclude_group_id", String(excludeGroupId));
  if (excludeVersion) params.set("exclude_version", excludeVersion);
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/suggestions?${params.toString()}`,
    {
      authToken,
      cache: "no-store",
    },
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

  return response.json() as Promise<AdminSegmentSuggestionsResponse>;
}

export async function getSegmentLibraryCandidates(
  animeId: number,
  groupId: number,
  kind: string,
  name?: string | null,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminSegmentLibraryCandidatesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  params.set("group_id", String(groupId));
  params.set("kind", kind);
  if (name?.trim()) params.set("name", name.trim());
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/library-candidates?${params.toString()}`,
    {
      authToken,
      cache: "no-store",
    },
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

  return response.json() as Promise<AdminSegmentLibraryCandidatesResponse>;
}

export async function attachSegmentLibraryAsset(
  animeId: number,
  segmentId: number,
  payload: AdminSegmentLibraryAttachRequest,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/reuse${qs}`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Laedt eine Videodatei als Segment-Asset hoch und aktualisiert die Source-Felder des Segments.
 * Sendet multipart/form-data mit dem Feld "file".
 * Gibt das aktualisierte Segment zurück.
 */
export async function uploadSegmentAsset(
  animeId: number,
  segmentId: number,
  file: File,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const formData = new FormData();
  formData.append("file", file);
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset${qs}`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
      retryAuth401: false,
      body: formData,
    },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Loescht das Segment-Asset: leert Source-Felder, loescht Datei und media_assets-Eintrag.
 */
export async function deleteSegmentAsset(
  animeId: number,
  segmentId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<void> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/asset${qs}`,
    {
      method: "DELETE",
      authToken,
    },
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
}

/**
 * Ordnet ein ueber den globalen Uploader (uploadAdminAnimeMedia, assetType "segment_preview")
 * hochgeladenes Bild als manuelles Segment-Vorschaubild zu (Phase 172, D-11) -- analog zur
 * Cover-Zuordnung. Gibt das aktualisierte Segment mit neu aufgelöster
 * `preview_url`/`preview_source` zurück.
 */
export async function assignSegmentPreviewImage(
  animeId: number,
  segmentId: number,
  mediaId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image${qs}`,
    {
      method: "PUT",
      headers: withAuthHeader({ "Content-Type": "application/json" }, authToken),
      retryAuth401: false,
      body: JSON.stringify({ media_id: mediaId }),
    },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Laedt die waehlbaren Release-Bilder fuer den "Aus Release-Bildern wählen"-Picker des
 * Segment-Vorschaubilds (Phase 172, D-11).
 */
export async function getSegmentPreviewImageCandidates(
  animeId: number,
  segmentId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<AdminSegmentPreviewImageCandidatesResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image/candidates${qs}`,
    {
      authToken,
      cache: "no-store",
    },
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

  return response.json() as Promise<AdminSegmentPreviewImageCandidatesResponse>;
}

/**
 * Uebernimmt ein bereits oeffentliches, freigegebenes Release-Bild als neues manuelles
 * Segment-Vorschaubild (Phase 172, D-11 "Aus Release-Bildern wählen"). Gibt das
 * aktualisierte Segment zurück.
 */
export async function attachSegmentPreviewImage(
  animeId: number,
  segmentId: number,
  payload: { media_asset_id: number },
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image/attach${qs}`,
    {
      method: "POST",
      headers: withAuthHeader(
        { "Content-Type": "application/json" },
        authToken,
      ),
      body: JSON.stringify(payload),
    },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}

/**
 * Entfernt die manuelle Wahl des Segment-Vorschaubilds (Phase 172, D-11 "Automatisches Bild
 * verwenden") -- das Segment faellt danach auf die Rangfolge automatisch > Ersatzbild zurück.
 */
export async function resetSegmentPreviewImage(
  animeId: number,
  segmentId: number,
  authToken?: string,
  releaseVariantId?: number | null,
): Promise<{ data: AdminThemeSegment }> {
  const API_BASE_URL = getApiBaseUrl();
  const params = new URLSearchParams();
  if (releaseVariantId != null)
    params.set("release_variant_id", String(releaseVariantId));
  const qs = params.toString() ? `?${params.toString()}` : "";
  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/admin/anime/${animeId}/segments/${segmentId}/preview-image/reset${qs}`,
    {
      method: "POST",
      headers: withAuthHeader({}, authToken),
    },
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

  return response.json() as Promise<{ data: AdminThemeSegment }>;
}
