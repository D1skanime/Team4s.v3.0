// 174-07: createAnimeComment triaged out of api.ts's "other/unclear" bucket.
// Grep evidence: zero production call sites under frontend/src/app or
// frontend/src/components (grep -rl "createAnimeComment" returns nothing
// there) -- this function appears unused by any shipped UI today. It is only
// exercised by frontend/src/lib/api.auth-refresh.test.ts, which imports many
// cross-domain functions (including this one) purely to prove the shared
// auth-refresh/retry behavior works uniformly regardless of endpoint. Placed
// here by endpoint-domain reasoning (POST /api/v1/anime/:id/comments is an
// anime-comment operation, not a fit for any instantiated domain module) --
// not by consumer evidence, since none exists. Flagged in the plan SUMMARY as
// a known-unused function rather than silently dropped.
import {
  CommentCreateRequest,
  CommentCreateResponse,
} from "@/types/comment";
import {
  ApiError,
  authorizedFetch,
  getApiBaseUrl,
  parseApiError,
  withAuthHeader,
} from "./client";

export async function createAnimeComment(
  id: number,
  payload: CommentCreateRequest,
  authToken?: string,
): Promise<CommentCreateResponse> {
  const API_BASE_URL = getApiBaseUrl();
  const headers = withAuthHeader(
    {
      "Content-Type": "application/json",
    },
    authToken,
  );

  const response = await authorizedFetch(
    `${API_BASE_URL}/api/v1/anime/${id}/comments`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader
      ? Number.parseInt(retryAfterHeader, 10)
      : Number.NaN;
    const message = await parseApiError(
      response,
      `API request failed: ${response.status}`,
    );
    throw new ApiError(
      response.status,
      message,
      Number.isNaN(retryAfterSeconds) ? null : retryAfterSeconds,
    );
  }

  return response.json() as Promise<CommentCreateResponse>;
}
