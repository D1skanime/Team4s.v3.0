---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
reviewed: 2026-09-02T00:00:00Z
depth: standard
files_reviewed: 62
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/admin_content_anime_project_timeline_test.go
  - backend/internal/handlers/app_auth_capabilities.go
  - backend/internal/handlers/app_auth.go
  - backend/internal/handlers/app_auth_group_member_roles.go
  - backend/internal/handlers/app_auth_group_members.go
  - backend/internal/handlers/app_auth_invitations.go
  - backend/internal/handlers/contribution_proposals_me_test.go
  - backend/internal/handlers/dashboard_me_handler.go
  - backend/internal/handlers/dashboard_me_handler_test.go
  - backend/internal/migrations/phase143_role_capability_defaults_reset_test.go
  - backend/internal/repository/anime_contributions_member_anchor_test.go
  - backend/internal/repository/anime_contributions_member_project_repository.go
  - backend/internal/repository/anime_contributions_member_project_repository_has_own_media_test.go
  - backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go
  - backend/internal/repository/anime_contributions_proposal_member_repository.go
  - backend/internal/repository/anime_contributions_proposal_repository.go
  - backend/internal/repository/anime_contributions_proposal_repository_test.go
  - backend/internal/repository/anime_fansub_project_timeline_repository_test.go
  - backend/internal/repository/member_claims_queries_repository.go
  - backend/internal/repository/member_claims_repository.go
  - backend/internal/repository/member_claims_repository_test.go
  - backend/internal/repository/member_claims_submit_repository.go
  - backend/internal/repository/member_profile_dashboard_repository.go
  - backend/internal/repository/member_profile_projects_release_versions_repository.go
  - backend/internal/repository/member_profile_projects_repository.go
  - backend/internal/repository/release_review_query_own_note_revisions.go
  - backend/internal/repository/release_review_query_repository.go
  - backend/internal/repository/release_review_query_repository_test.go
  - backend/internal/repository/release_review_query_scan_helpers.go
  - backend/internal/services/release_metadata_credit_service_test.go
  - database/migrations/0159_role_capability_defaults_reset.down.sql
  - database/migrations/0159_role_capability_defaults_reset.up.sql
  - frontend/eslint.config.mjs
  - frontend/next.config.mjs
  - frontend/src/app/admin/episode-versions/[versionId]/edit/page.test.tsx
  - frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.module.css
  - frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/FansubAppMembersSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useGroupMembersTab.ts
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx
  - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseGallery.test.tsx
  - frontend/src/app/fansubs/[slug]/fansubprojekt/[animeSlug]/mitwirkende/[memberSlug]/page.test.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.module.css
  - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.tsx
  - frontend/src/app/me/dashboard/components/CategoryProgressTable.test.tsx
  - frontend/src/app/me/dashboard/components/DashboardMetrics.test.tsx
  - frontend/src/app/me/dashboard/page.tsx
  - frontend/src/app/members/[slug]/page.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.rejected-artifacts.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/page.tsx
  - frontend/src/app/me/releases/[versionId]/workspace/workspaceHelpers.ts
  - frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css
  - frontend/src/components/contributions/ContributionCard.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberHero.tsx
  - frontend/src/components/fansubs/projectMember/ProjectMemberReleaseCard.tsx
  - frontend/src/components/profile/MemberBadgeChain.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.test.tsx
  - frontend/src/components/profile/MemberCurrentProjectsSection.tsx
  - frontend/src/components/profile/MembershipsSection.test.tsx
  - frontend/src/lib/api.dashboard.test.ts
  - frontend/src/lib/api.no-token-boundary.test.ts
  - frontend/src/lib/roleCatalog.ts
  - frontend/src/lib/roleColors.ts
  - frontend/src/types/contributions.ts
  - frontend/src/types/dashboard.ts
  - frontend/src/types/__tests__/v12-projection-contract.test.ts
  - shared/contracts/openapi.yaml
findings:
  critical: 0
  warning: 5
  info: 2
  total: 7
status: issues_found
---

# Phase 143: Code Review Report (full re-pass, overwrites prior partial round)

**Reviewed:** 2026-09-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 62
**Status:** issues_found

## Summary

This is a full standard-depth pass over the complete union of key files touched
across phase 143's 19 gap-closure/remediation plans, replacing the prior
partial `143-REVIEW.md` (which only covered plans 143-15..18).

The prior round's CR-01 (`has_own_media` not excluding rejected media) is
**confirmed fixed** by plan 143-19: `anime_contributions_member_project_repository.go`
now carries a `has_own_rejected_media` `EXISTS` subquery mirroring the note
fix exactly, threaded through `MemberProjectReleaseVersionRow`,
`shared/contracts/openapi.yaml`, `frontend/src/types/contributions.ts`, and
`page.tsx`'s `hasOwnArtifacts`/`needsRework` computation, and is well covered
by three new backend tests
(`anime_contributions_member_project_repository_has_own_media_test.go`) plus
five new frontend tests
(`page.rejected-artifacts.test.tsx`). No new Critical/BLOCKER findings were
identified in this pass — the media-artifact parity gap that was the headline
risk of the prior round is closed.

However, tracing the prior round's WR-01/WR-02/WR-03 warnings against the
current file contents shows all three are still present, byte-for-byte
unchanged — none of the four newest plans (143-15..19) touched
`app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx`'s dead duplicate
409-handling branch or its focus-escape issue, and 143-19 explicitly
**codified** the WR-03 masking behavior in a new regression test rather than
decoupling it. Two further issues were found during this pass: a defensive
initialization gap in `GetOwnDashboard`'s `PendingGroupMediaReviews` field
that is inconsistent with its three sibling `Pending*` fields and would crash
the dashboard frontend under an untested wiring regression, and two minor
Info-level quality items (a `gofmt`-inconsistent struct in
`app_auth_capabilities.go`, and a permanently-skipped scroll-locking
regression test).

## Warnings

### WR-01: `needsRework` badge remains maskable by an unrelated completed artifact on the same release (carried over from prior round, now explicitly locked in by a test)

**File:** `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:338-347`

**Issue:**
```ts
const hasOwnArtifacts = release.has_own_notes || release.has_own_media || release.has_own_rejected_notes || release.has_own_rejected_media
const releaseDone = isDone(release)                                                          // has_own_notes || has_own_media
const needsRework = !releaseDone && (release.has_own_rejected_notes || release.has_own_rejected_media)
```
If a release has an accepted/pending media contribution (`has_own_media:
true`) from the same member **and** a separately rejected note or rejected
media row on the very same release, `releaseDone` is `true` via the
unconditional artifact alone, so `needsRework` short-circuits to `false` and
the row renders the green "Erledigt" badge — even though the member has a
rejected artifact on that exact release that still needs revision. This is
the identical masking issue flagged in the prior review round's WR-03,
carried forward unchanged into 143-19's rewrite (the boolean expression was
extended to cover `has_own_rejected_media` too, but the `!releaseDone` gate
that causes the masking was preserved as-is).

This is now explicitly asserted as *intended* behavior by
`page.rejected-artifacts.test.tsx:139-160` ("shows 'Erledigt' (not
'Überarbeitung nötig') when has_own_media is true, even with rejected media
also set"), so this is a confirmed product decision rather than an oversight
— but it is still a real, reachable state (member uploads accepted media and
separately writes a note that gets rejected) where the UI gives the member no
visual signal that a rejected artifact on that release needs to be reworked
and resubmitted, silently understating the outstanding-work count.

**Fix:** If the masking is intentional, no code change is required, but
consider surfacing the rejected state as a secondary indicator alongside
"Erledigt" (e.g. a stacked badge or an inline note) instead of fully
suppressing it, so a member with mixed accepted/rejected artifacts on the
same release still gets a rework signal. If unintentional, decouple
`needsRework` from the `releaseDone` gate:
```ts
const needsRework = release.has_own_rejected_notes || release.has_own_rejected_media
```
and adjust the badge to show both signals when applicable.

### WR-02: Dead duplicate 409-conflict branch in `submitDecision` (carried over from prior round, still unchanged)

**File:** `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:164-185`

**Issue:** `submitDecision`'s catch block checks `error instanceof ApiError &&
error.status === 409 && error.code === 'REVIEW_ALREADY_DECIDED'` and then,
immediately after, repeats the identical check via manual duck-typing
(`typeof error === 'object' && ... 'status' in error && ...`). Every error
thrown by `frontend/src/lib/api.ts`'s request helpers is already an instance
of `ApiError`, so the second branch is unreachable in practice and adds
cyclomatic complexity while giving a false impression that some other error
shape can reach this code path.

**Fix:** Remove the second duck-typed block:
```ts
} catch (error) {
  if (
    error instanceof ApiError &&
    error.status === 409 &&
    error.code === 'REVIEW_ALREADY_DECIDED'
  ) {
    setRejectOpen(false)
    setDecisionState({ kind: 'conflict' })
    return
  }
  setDecisionState({ kind: 'error' })
}
```

### WR-03: Admin-override validation focuses a field hidden behind the open reject Modal (carried over from prior round, still unchanged)

**File:** `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:121-131`, `301-320`, `376-444`

**Issue:** `requiresAdminOverride` validation runs first inside
`submitDecision`, for *both* the `confirm` and `reject` decision paths. The
"Ablehnen" button that triggers `submitDecision('reject')` lives inside the
`Modal` (`rejectOpen === true`). If the platform admin is reviewing their own
submission and the override-reason textarea (rendered in `decisionPanel`,
*outside* the Modal, lines 301-320) is invalid,
`overrideReasonRef.current?.focus()` (line 129) moves keyboard focus out of
the currently-open Modal to a background field. Modal dialogs conventionally
trap focus while open; forcing focus outside an open dialog either breaks
that trap or silently no-ops, leaving the user with no visible indication of
why nothing happened (the field they need to fix is not reachable/visible
behind the modal overlay).

**Fix:** Validate the override reason before allowing the reject Modal to
open (e.g. in the "Ablehnen" button's `onClick`, before `setRejectOpen(true)`
at line 359), or move the override-reason field into the Modal for the
reject flow so focus stays within the open dialog.

### WR-04: `GetOwnDashboard` leaves `PendingGroupMediaReviews` as a nil slice, inconsistent with its three sibling `Pending*` fields — risks `null` JSON and a frontend crash if the review-query wiring ever regresses

**File:** `backend/internal/repository/member_profile_dashboard_repository.go:253-266`

**Issue:** `GetOwnDashboard`'s final `return &OwnDashboardData{...}` literal
explicitly initializes three of the four `Pending*` slice fields to empty
slices:
```go
PendingClaims:           []OwnDashboardPendingClaim{},
PendingReleaseReviews:   []OwnDashboardPendingReleaseReview{},
PendingOwnNoteRevisions: []OwnDashboardPendingOwnNoteRevisionGroup{},
```
`PendingGroupMediaReviews` is missing from this literal entirely, so it stays
Go's zero value (`nil`) unless `dashboard_me_handler.go`'s
`attachPendingGroupMediaReviewAttention` later overwrites it — which it only
does when `h.reviewQueryRepo != nil && h.permissionSvc != nil && data != nil`
(early-returns `nil` otherwise, leaving the field untouched). In current
`main.go` wiring `WithReviewQueryRepo(releaseReviewQueryRepo)` is always
called, so this is not reachable in production today, but it is a real,
silent trap: `OwnDashboardData.PendingGroupMediaReviews` has no
`json:"...,omitempty"` tag, so a nil slice serializes to `"pending_group_media_reviews": null`
in the API response.

On the frontend, `frontend/src/app/me/dashboard/page.tsx:150-152` passes
`state.dashboardData.pending_group_media_reviews` straight through as a prop.
`AttentionSection`'s `pendingGroupMediaReviews = []` default parameter
(`AttentionSection.tsx:39`) only applies when the prop is `undefined` — **not**
`null` — so a `null` value would flow through unchanged and
`pendingGroupMediaReviews.length` (line 50) would throw a `TypeError`,
crashing the whole dashboard page render. `emptyOwnDashboardData()` in
`dashboard_me_handler.go` correctly initializes this same field
(`PendingGroupMediaReviews: []repository.OwnDashboardPendingGroupMediaReview{}`),
making this repository-level omission the only place in the codebase where
the invariant is violated, and no existing test (`AttentionSection.test.tsx`
only exercises this prop as a populated array) would catch either the nil
JSON or the frontend crash.

**Fix:** Initialize the field defensively alongside its siblings:
```go
return &OwnDashboardData{
    ...
    PendingClaims:            []OwnDashboardPendingClaim{},
    PendingGroupMediaReviews: []OwnDashboardPendingGroupMediaReview{},
    PendingReleaseReviews:    []OwnDashboardPendingReleaseReview{},
    PendingOwnNoteRevisions:  []OwnDashboardPendingOwnNoteRevisionGroup{},
}, nil
```

### WR-05: `has_own_media` / `has_own_notes` anchor on two different identity columns within the same query without explanation

**File:** `backend/internal/repository/anime_contributions_member_project_repository.go:141-160`

**Issue:** `listMemberProjectReleaseVersions`'s `has_own_notes` /
`has_own_rejected_notes` subqueries filter on `rvn.member_id = $1`
(`memberID`), while the sibling `has_own_media` / `has_own_rejected_media`
subqueries filter on `rvm.uploaded_by_user_id = $2` (`appUserID`) — two
different parameters bound to two different identity columns in the same
function, for what the UI treats as parallel "your own artifact" signals.
This is very likely correct given the underlying schema
(`release_version_notes.member_id` vs.
`release_version_media.uploaded_by_user_id` are genuinely different FK
targets), and the has-own-media test file's fixtures confirm the media
column really is `uploaded_by_user_id`, but nothing in the function
documents *why* the two artifact types anchor on different identity
columns, which makes the asymmetry look like a copy-paste bug on first read
(as this review's own initial pass treated it before confirming the schema
difference in the test fixtures).

**Fix:** Add a short comment above the two `EXISTS` blocks noting that notes
are anchored to `member_id` (a `members` FK) while media is anchored to
`uploaded_by_user_id` (an `app_users` FK) by design, so a future reader (or
the eventual media/notes unification pass) doesn't "fix" this into a
regression.

## Info

### IN-01: `fansubGroupCapabilitiesResponse` struct is not `gofmt`-aligned

**File:** `backend/internal/handlers/app_auth_capabilities.go:13-42`

**Issue:** Most struct field/tag columns in `fansubGroupCapabilitiesResponse`
are tab-aligned as `gofmt` would produce, but `CanEditNotes` (line 24) and
`CanEditProjectTimeline` (line 25) carry one extra space before `bool`,
breaking the aligned block gofmt would otherwise produce for a
field list with no blank/comment-line breaks. This is purely cosmetic (no
runtime effect) but would show up as a diff under `gofmt -l`/`gofmt -w` if
CI or a pre-commit hook enforces formatting.

**Fix:** Run `gofmt -w backend/internal/handlers/app_auth_capabilities.go`.

### IN-02: Permanently skipped scroll-locking regression test

**File:** `frontend/src/components/profile/MemberBadgeChain.test.tsx:1235`

**Issue:** `it.skip('centers the current stage through its own strip and
never scrolls an ancestor', ...)` is disabled with no explanation (no
`// TODO`/reason comment), leaving the badge-carousel's "must scroll its own
strip, never an ancestor" behavior — a real, previously-reported class of bug
per the surrounding comments in this file — without regression coverage.

**Fix:** Either fix and re-enable the test, or add a comment explaining why
it is currently unrunnable (e.g. jsdom limitation) and link a follow-up task,
so the gap is visible and intentional rather than silently bit-rotting.

---

_Reviewed: 2026-09-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
