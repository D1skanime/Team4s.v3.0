---
phase: 154-aggregator-duplikate-bildbudget-und-viewer-aufloesung
reviewed: 2026-09-10T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/app_public_profile.go
  - backend/internal/handlers/app_public_profile_test.go
  - backend/internal/repository/member_profile_contribution_badges_repository.go
  - backend/internal/repository/member_profile_contribution_badges_repository_test.go
  - backend/internal/repository/member_profile_progress_repository.go
  - backend/internal/repository/member_profile_progress_repository_test.go
  - backend/internal/repository/member_profile_public_repository.go
  - backend/internal/repository/member_profile_query_budget_test.go
  - backend/internal/repository/member_profile_repository_postgres_test.go
  - backend/internal/repository/member_profile_role_volume_repository.go
  - backend/internal/repository/member_profile_role_volume_repository_test.go
  - docs/audits/2026-09-09-public-member-performance/154-AFTER.md
  - docs/audits/2026-09-09-public-member-performance/154-D-MEASUREMENTS.md
  - frontend/src/app/members/[slug]/not-found.test.tsx
  - frontend/src/app/members/[slug]/OwnHiddenProfilePreview.test.tsx
  - frontend/src/app/members/[slug]/OwnProfileEditLink.test.tsx
  - frontend/src/app/members/[slug]/OwnProfileEditLink.tsx
  - frontend/src/components/profile/AnimeProjectAchievementStage.tsx
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberProfileHero.test.tsx
  - frontend/src/components/profile/MemberProfileHero.tsx
  - frontend/src/components/ui/ResponsiveImage.test.tsx
  - frontend/src/components/ui/ResponsiveImage.tsx
  - frontend/src/lib/api.no-token-boundary.test.ts
  - frontend/src/lib/api.ts
  - frontend/src/lib/useMemberViewer.test.ts
  - frontend/src/lib/useMemberViewer.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 154: Code Review Report

**Reviewed:** 2026-09-10T00:00:00Z
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

Phase 154 does three things: (1) dedups four SQL-backed raw-count loaders on the public
member profile hot path (`loadRoleVolumeCounts`, `loadContribProjectsCount`,
`loadContribChronicleCount`, `loadContribArchivistCount`) so `GetPublicMemberProfileByID`
issues each exactly once per request instead of twice; (2) closes an image-byte-budget gap
(`ResponsiveImage`'s optimizer-error fallback no longer escapes to an unbounded
`unoptimized` re-fetch of the raw original, and `AnimeProjectAchievementStage` now gates its
hero artwork on `currentCode` instead of leaking a not-yet-earned badge icon at zero
projects); and (3) adds a slim `GET /api/v1/members/:slug/viewer` endpoint + frontend hook
(`useMemberViewerAccess`) so `OwnProfileEditLink` no longer has to fetch the full public
profile just to read `is_owner`/`is_private_preview`.

I traced the refactor end-to-end (call sites, signatures, test fixtures) and did not find a
behavior regression: the dedup preserves badge append order, error semantics, and the
existing `loadContribProjectsCount`/`loadRoleVolumeCounts` reuse by
`member_profile_dashboard_repository.go` (a separate, still-independent call site that was
correctly left alone). The new `/viewer` route reuses the exact same
`resolvePublicMemberAccess` resolver and cache-header helper as the existing
`/members/:slug` route, so it inherits the same 404-neutrality and cache-class separation
guarantees — this is confirmed by dedicated tests
(`TestGetPublicMemberViewerDenialIsNeutral`, `TestGetPublicMemberViewerResolverCalledExactlyOnce`).
No hardcoded secrets, no dangerous functions (`eval`, raw `innerHTML`, etc.), no empty catch
blocks, and no debug artifacts were found in the reviewed files.

The findings below are quality/robustness observations, not correctness regressions proven
against the shipped tests.

## Warnings

### WR-01: Animated-WebP probe re-downloads the full avatar for every static WebP profile, working against this phase's own byte-budget goal

**File:** `frontend/src/components/profile/MemberProfileHero.tsx:120-185`

**Issue:** `isAnimatedWebpSource` is invoked from the `useEffect` on **every** avatar whose
URL ends in `.webp` (not just animated ones — the guard at line 173 only excludes GIFs, empty
URLs, and non-WebP URLs). It issues `fetch(url, { headers: { Range: 'bytes=0-63' } })` and
reads `response.ok` only; it never checks `response.status === 206` (Partial Content) before
calling `response.arrayBuffer()`. If the media route, a CDN, or any intermediary in front of
`/media/**` does not honor the `Range` header (returns `200` with the full body instead of
`206` with 64 bytes), this silently downloads the entire original avatar file a second time —
in addition to the `<img>`/`ResponsiveImage` request that is already loading the same file —
for every single static (non-animated) WebP avatar view. Given this exact phase's stated goal
is closing byte-budget leaks (RCA-06, `154-AFTER.md` "Bildbudget"), an unconditional,
un-verified duplicate full-file fetch for the common (static) case is a real regression risk
if the Range assumption ever stops holding (e.g. a future CDN/reverse-proxy in front of
`/media`), and it is currently untested against a non-206 response.

**Fix:** Verify the response actually honored the Range request before reading the body, and
bail out (treat as "unknown/not animated") otherwise:
```ts
async function isAnimatedWebpSource(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { headers: { Range: 'bytes=0-63' } })
    if (!response.ok || response.status !== 206) return false
    const buffer = new Uint8Array(await response.arrayBuffer())
    ...
```
Add a test that mocks a `200`-with-full-body response and asserts the probe does not treat it
as a signal to download (or at minimum documents/accepts the full download as an intentional
trade-off, since right now it is silent).

### WR-02: `parseBoundedProjectPageValue`'s `limit` clamp silently substitutes the fallback instead of clamping to the stated minimum

**File:** `backend/internal/handlers/app_public_profile.go:141-150`

**Issue:** Not new in this phase, but directly adjacent to/reused by the new
`GetPublicMemberViewer`/`GetPublicMemberProjects` pagination surface this phase touches
(`memberPageOffsetMax`, `currentProjectsMaxPageSize`, etc., lines 24-39). The function's doc
implies "bounded" clamping, but for `limit` (`minimum=1`), any client-supplied value below the
minimum (e.g. `limit=0` or a negative number) does **not** clamp to `1` — it silently returns
`fallback` (`currentProjectsInitialPageSize = 6`), which is a different, larger value than the
requested minimum. This is defensible as "reject invalid input, don't guess a boundary," but
it is inconsistent with the `maximum` branch two lines below, which *does* clamp
(`return maximum`), so the two ends of the same range are handled with different
strategies without a comment explaining why. A reviewer or future maintainer changing the
`offset` minimum (currently `0`, where fallback and minimum happen to coincide) could
introduce a real bug without noticing, because the asymmetry is undocumented.

**Fix:** Either document the intentional asymmetry inline (why `limit` below `minimum` maps
to `fallback` rather than `minimum`), or make both bounds symmetric (clamp to `minimum`
instead of substituting `fallback`) so the function's behavior matches its "bounded value"
name for both directions.

## Info

### IN-01: `154-AFTER.md`'s 0-project query count is an unverified arithmetic derivation presented alongside measured numbers

**File:** `docs/audits/2026-09-09-public-member-performance/154-AFTER.md:76-80`

**Issue:** The doc is transparent about this ("Nicht live nachgemessen in dieser Session"),
so this is not a defect in the audit methodology — but the enforced regression constant in
`member_profile_query_budget_test.go` (`phase131ConstantQueryBudget = 16`) only exercises the
2-project and 6-project cases (`TestPhase131PublicProfileQueryBudgetIsConstant`). The
0-current-projects path (which skips the batched `loadCurrentProjectReleaseVersionsBatch`
query per the comment on `phase131ConstantQueryBudget`) has no automated guard at all, so a
future change that breaks query-count constancy specifically for zero-project members would
not be caught by CI.

**Fix:** Consider adding a third seed (`0` current projects) to
`TestPhase131PublicProfileQueryBudgetIsConstant` (or a sibling test) asserting the derived
`15` value, closing the gap between "arithmetically expected" and "actually enforced."

### IN-02: `AnimeProjectAchievementStage` computes `descriptor` unconditionally even when `currentCode` is null and it will never be rendered

**File:** `frontend/src/components/profile/AnimeProjectAchievementStage.tsx:27-29,50-66`

**Issue:** `presentation` and `descriptor` are both derived from `heroStage.badge_code`
before the `currentCode ? (...) : <LockedStageArtwork hero />` branch is evaluated. Now that
the render branch explicitly short-circuits to `LockedStageArtwork` when `currentCode` is
null (the fix this phase makes, correctly, to stop leaking a not-yet-earned badge icon), the
`descriptor` computed via `resolveProgressArtworkDescriptor(heroStage.badge_code)` for the
locked case is dead work — harmless functionally, but a maintenance trap: a future
edit that reorders these lines could reintroduce the exact leak this phase just closed,
since nothing signals that `descriptor`/`presentation` are only safe to use inside the
`currentCode` branch.

**Fix:** Move the `descriptor`/`presentation` computation inside the `currentCode` branch (or
add a one-line comment noting they must stay unused in the locked branch) so the coupling is
explicit rather than incidental.

---

_Reviewed: 2026-09-10T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
