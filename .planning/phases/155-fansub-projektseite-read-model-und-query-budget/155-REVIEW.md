---
phase: 155-fansub-projektseite-read-model-und-query-budget
reviewed: 2026-09-11T16:25:28Z
depth: standard
files_reviewed: 33
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/fansub_admin.go
  - backend/internal/handlers/fansub_project_resolver_handler.go
  - backend/internal/handlers/fansub_project_resolver_handler_test.go
  - backend/internal/handlers/group_contributors_handler.go
  - backend/internal/repository/fansub_project_resolver_query_budget_test.go
  - backend/internal/repository/fansub_project_resolver_repository.go
  - backend/internal/repository/group_contributors_repository_test.go
  - backend/internal/repository/group_release_version_count_test.go
  - backend/internal/repository/group_repository.go
  - docs/audits/2026-09-11-fansub-project-performance/REPORT.md
  - docs/audits/2026-09-11-fansub-project-performance/REPRODUCE.md
  - docs/audits/2026-09-11-fansub-project-performance/TABLES.md
  - docs/audits/2026-09-11-fansub-project-performance/VALIDATION.md
  - frontend/src/app/anime/[id]/group/[groupId]/GroupAssetShowcase.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/ProjectPage.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/page.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.releasePreview.ts
  - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.test.ts
  - frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts
  - frontend/src/app/anime/[id]/group/[groupId]/sections/HeroSection.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.test.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/sections/ReleasesSection.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.test.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/page.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.test.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/releases/[releaseVersionId]/page.tsx
  - frontend/src/components/groups/GroupAssetsExperience.tsx
  - frontend/src/lib/api.ts
  - frontend/src/lib/fansubProjectNavigation.test.ts
  - frontend/src/lib/fansubProjectNavigation.ts
  - frontend/src/types/fansub.ts
  - frontend/src/types/group.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 3
  info: 3
  total: 6
status: issues_found
---

# Phase 155: Code Review Report

**Reviewed:** 2026-09-11T16:25:28Z
**Depth:** standard
**Files Reviewed:** 33 (+ 4 audit docs)
**Status:** issues_found

## Summary

This phase adds a narrow `groupSlug+animeSlug` project resolver, a standalone release-version-count
endpoint, wires both into the three fansub pretty routes, removes dead theme/release-media fetches
and the `per_page:100` release list from the project loader, and rewires the render tree off the
removed `releaseEpisodes` field. The implementation is unusually disciplined: contract parity
(Go DTO ↔ OpenAPI ↔ TS types ↔ `api.ts`) is intact everywhere checked, the not-found semantics for
the resolver correctly collapse two distinct failure modes into one neutral 404 (no information
leak), the release-count query is proven byte-identical to the legacy row count for a multi-version
episode (not the rejected `episode_count` substitute), and every new backend test is a real
httptest/real-Postgres behavioral test rather than the forbidden `os.ReadFile`+`strings.Contains`
pattern. `go build`, `go vet`, the new Go tests, `tsc --noEmit`, and the full relevant Vitest suite
were independently re-run during this review and are all green.

The defects found are narrow and none rise to Critical: one route (`mitwirkende/[memberSlug]/page.tsx`)
adds a new, unguarded network call that lacks the same-function's own established 404-mapping
pattern; one dead computed field (`hasTeamContent`) survives in the loader's public contract despite
the phase's own "no dead contract" framing; and one new API client function silently deviates from
this file's own documented `authorizedFetch`-vs-`fetch` convention. Two findings already
acknowledged by the phase's own SUMMARY/CONTEXT documents (the `contributor_roles.name`/
`role_definitions.code` case-mismatch from 155-03, and the `ReleasesSection` gating simplification
from 155-04/155-05) are not re-litigated here — they are pre-existing/accepted, not new defects.

## Warnings

### WR-01: New `getGroupDetail` call in the project-member route has no error handling, unlike its sibling calls in the same function

**File:** `frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.tsx:44`
**Issue:** The pre-155 version of this route sourced `groupName` from the already-fetched public
profile response (`profile.group.name`) — zero extra network calls, zero extra failure surface.
The rewritten route now makes a brand-new `await getGroupDetail(resolution.data.anime_id, resolution.data.group_id)`
call with **no try/catch at all**, while the two calls immediately before and after it
(`resolveFansubProject`, `getProjectMemberSummary`) both explicitly catch `ApiError` with
`status === 404` and map it to `notFound()`. If `getGroupDetail` ever throws — a transient backend
500, a network blip, or (rarely) a race where the `anime_fansub_groups` relation is removed between
the resolver call and this call — the request will produce an unhandled Next.js server error
instead of the graceful `notFound()`/error handling every other fetch in this function has. This is
a new failure mode that did not exist before this phase's rewrite of the route.
**Fix:**
```typescript
let groupDetail: Awaited<ReturnType<typeof getGroupDetail>>
try {
  groupDetail = await getGroupDetail(resolution.data.anime_id, resolution.data.group_id)
} catch (error) {
  if (error instanceof ApiError && error.status === 404) return notFound()
  throw error
}
```

### WR-02: `getGroupReleaseCount` deviates from this file's own documented public-endpoint fetch convention

**File:** `frontend/src/lib/api.ts:6614-6635`
**Issue:** `155-PATTERNS.md` (this phase's own pattern map) explicitly documents the established
convention in `api.ts`: `authorizedFetch` for slug-family calls, plain `fetch` for anime/group
numeric-ID calls (citing `getGroupReleaseListCursor` as the numeric-ID example). `getGroupReleaseCount`
is a numeric-ID call (`animeID`, `groupID`) but uses `authorizedFetch`, unlike its direct sibling
`getGroupReleaseListCursor` a few hundred lines below it, which uses plain `fetch` for the exact same
parameter shape. This adds an unnecessary `ensureFreshRuntimeSession()` auth-preflight check to
every anonymous SSR load of a public page for no behavioral benefit (the backend route requires no
auth). Low impact today, but it's an inconsistency a future maintainer copying "the nearest sibling
function" will silently propagate.
**Fix:** Use plain `fetch` (matching `getGroupReleaseListCursor`/`getGroupReleases`) instead of
`authorizedFetch`, or if `authorizedFetch` is intentional here, document why this numeric-ID call
differs from its neighbors.

### WR-03: Dead computed field `hasTeamContent` remains in the loader's public data contract

**File:** `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:49,269-271,340`
**Issue:** `hasTeamContent` is computed from `contributorsData` and exposed on
`PublicFansubProjectPageData`, but `ProjectPage.tsx` never reads it (verified: zero references to
`hasTeamContent` anywhere under `frontend/src/app/anime/[id]/group/[groupId]/` outside this file and
its own test). This predates Phase 155 (confirmed via `git show b68d4c61`, it was already unused
before this phase), but this phase explicitly touched this exact interface and this exact file under
the rule "No render consumer → no initial fetch... removed fields also disappear from
`PublicFansubProjectPageData` so no dead contract remains" (P155-10) while cleaning up the sibling
dead fields `hasThemes`/`hasMedia`. The underlying fetch (`getGroupContributors`) is very much alive
and needed for `TeamSection`, so this is not a wasted fetch — only a dead derived boolean that
survived the same cleanup pass that removed its two neighbors.
**Fix:** Remove `hasTeamContent` from `PublicFansubProjectPageData` and its computation, or wire it
into an actual consumer if a "team section empty state" gate was intended.

## Info

### IN-01: No handler-level (httptest) test exists for the new `GetGroupReleaseCount` endpoint

**File:** `backend/internal/handlers/group_contributors_handler.go:206-235`
**Issue:** Every other new/changed handler in this phase (`ResolveFansubProject`) has a dedicated
httptest+fake-repo test file proving status codes and response shape. `GetGroupReleaseCount` has
only a repository-level test (`group_release_version_count_test.go`, DSN-gated real Postgres) — no
test exercises the handler's own `badRequest`/`internalError`/200 response-shaping code paths (e.g.
invalid `animeID`/`groupID` → 400, `groupReleasesRepo == nil` → 500). This gap matches a pre-existing
convention (no file in this package tests `GroupPublicHandler` via httptest at all — `GetGroupContributors`,
`GetGroupReleaseListCursor`, etc. have the same gap), so it is not a regression introduced by this
phase, but a new public endpoint is a natural point to have closed the gap rather than inherited it.
**Fix:** Add a small httptest-based test asserting 400 for invalid path params and 200 with the
expected `{"data":{"count":N}}` shape for a fake/injected repo, mirroring the resolver handler's own
test file added in this same phase.

### IN-02: `ResolveProject`/`ListProjectNavigationProjects` do not filter on `fansub_groups.status`

**File:** `backend/internal/repository/fansub_project_resolver_repository.go:59-121`
**Issue:** Both queries join `fansub_groups` only on `slug`/`fansub_group_id` with no
`fg.status <> 'disabled'` (or similar) predicate, so a disabled/dissolved fansub group's projects
would still resolve. Verified this exactly matches the pre-existing behavior of
`getPublicGroupBase`/`listPublicFansubProjects` (the resolver's own stated analogs), which also never
filter on group status — so this is not a regression, just an existing gap the resolver faithfully
reproduces rather than one it introduces. Flagged for visibility only, since a reviewer scanning the
new file in isolation would reasonably expect a status filter given the anime-side predicate
(`a.status <> 'disabled'`) is present.
**Fix:** None required for this phase (matches established behavior); if group-status filtering is
ever added, it should be added consistently across `getPublicGroupBase`, `listPublicFansubProjects`,
and this resolver together, not just one of the three.

### IN-03: `PublicFansubProjectPageData`'s two canonical-path resolution helpers remain duplicated

**File:** `frontend/src/app/anime/[id]/group/[groupId]/projectPageData.ts:109-153`
**Issue:** `resolvePublicFansubProjectCanonicalPath` (used only by the numeric legacy route) and
`resolveCanonicalProjectPath` (used internally by the loader's own profile-fallback branch) both
independently fetch `getGroupDetail` + `getPublicFansubProfileBySlug` and find a matching project by
`animeID`/`anime_slug`, with near-identical but not-quite-shared logic. Confirmed via `git show
b68d4c61` that this duplication predates Phase 155 and was not introduced or worsened by it — noted
here only because this phase touched this exact file extensively (487 → 357 lines) and had a natural
opportunity to consolidate it, without being obligated to.
**Fix:** Optional follow-up: have `resolvePublicFansubProjectCanonicalPath` delegate to
`resolveCanonicalProjectPath` by starting its own profile promise, removing the duplicated `.find()`
logic.

---

_Reviewed: 2026-09-11T16:25:28Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
