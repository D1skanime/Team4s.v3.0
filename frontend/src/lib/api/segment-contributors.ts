import type {
  AdminThemeSegmentContributorCandidatesResponse,
  AdminThemeSegmentContributorsSetResponse,
} from '@/types/admin'
import { ApiError, apiClientFetch, parseApiErrorPayload } from '@/lib/api'

/**
 * Dediziertes API-Modul fuer die Segment-Contributor-Auswahl (Phase 156, Plan 156-14,
 * GAP-01) -- mirroring admin-anime-intake.ts's Extraktions-Praezedenzfall exakt: `api.ts`
 * selbst gewinnt fuer dieses Feature keine einzige neue Zeile.
 */

export async function getThemeSegmentContributorCandidates(
  animeId: number,
  segmentId: number,
): Promise<AdminThemeSegmentContributorCandidatesResponse> {
  const response = await apiClientFetch(`/api/v1/admin/anime/${animeId}/segments/${segmentId}/contributors`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminThemeSegmentContributorCandidatesResponse>
}

export async function setThemeSegmentContributors(
  animeId: number,
  segmentId: number,
  memberIds: number[],
): Promise<AdminThemeSegmentContributorsSetResponse> {
  const response = await apiClientFetch(`/api/v1/admin/anime/${animeId}/segments/${segmentId}/contributors`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ member_ids: memberIds }),
  })

  if (!response.ok) {
    const parsed = await parseApiErrorPayload(response, `API request failed: ${response.status}`)
    throw new ApiError(response.status, parsed.message, null, parsed.code, parsed.details)
  }

  return response.json() as Promise<AdminThemeSegmentContributorsSetResponse>
}
