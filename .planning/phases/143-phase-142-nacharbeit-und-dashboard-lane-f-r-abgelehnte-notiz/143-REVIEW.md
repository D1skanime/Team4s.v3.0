---
phase: 143-phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
reviewed: 2026-09-02T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - frontend/src/app/me/dashboard/components/AttentionSection.tsx
  - frontend/src/app/me/dashboard/components/AttentionSection.module.css
  - frontend/src/app/me/dashboard/components/AttentionSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx
  - backend/internal/repository/anime_contributions_member_project_repository.go
  - backend/internal/repository/anime_contributions_member_project_repository_has_own_notes_test.go
  - shared/contracts/openapi.yaml
  - frontend/src/types/contributions.ts
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx
  - frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.test.tsx
findings:
  critical: 1
  warning: 3
  info: 0
  total: 4
status: issues_found
---

# Phase 143: Code Review Report (gap-closure re-review, UAT-01..UAT-04)

**Reviewed:** 2026-09-02T00:00:00Z
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

This pass is scoped to only the files touched by phase 143's four gap-closure
plans (143-15 through 143-18), which addressed live UAT findings UAT-01
(stale header status badge), UAT-02 (rejected-note "done" false positive),
UAT-03 (single-entry rejected-notes card spacing) and UAT-04 (hardcoded CSS
color fallback). All four narrowly-targeted fixes are correctly implemented
and covered by focused regression tests (verified by reading the actual
commits: `1c9b96d8`, `69c0b5bf`, `b9c84b76`, `bc5e1d14`/`291d233d`,
`217c47aa`).

However, tracing the exact SQL pattern that was fixed for
**notes** (`has_own_notes` / `has_own_rejected_notes` in
`anime_contributions_member_project_repository.go`) against the sibling
`has_own_media` query in the *same file* (untouched by this phase, but read
in full as part of the required scope) surfaces a real, high-confidence
correctness gap: rejected **media** contributions are not excluded from
`has_own_media` the way rejected **notes** now are, and the async cleanup
job that eventually deletes rejected media rows has a 90-day production
retention window. This directly undermines the intent of this phase's UAT-02
fix for the sibling artifact type and is filed as a Critical finding. Two
further Warnings cover dead/duplicate error-handling code and a Modal focus
escape introduced in the UAT-01 fix's surrounding code, plus a masking
interaction between the new `needsRework` badge and pre-existing `has_own_media`
completion logic.

## Critical Issues

### CR-01: `has_own_media` does not exclude rejected media, unlike the just-fixed `has_own_notes` — rejected media falsely reports "Erledigt" for up to 90 days

**File:** `backend/internal/repository/anime_contributions_member_project_repository.go:150-156`

**Issue:** This phase's UAT-02 fix (commits `8d9695ba`, `bc5e1d14`) correctly
taught `has_own_notes` and the new `has_own_rejected_notes` to join
`release_version_note_review_lifecycle` and exclude/detect
`review_state = 'rejected'` notes, so a rejected note no longer counts as
"done" and instead surfaces the new "Überarbeitung nötig" badge
(`frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:217c47aa`).

The sibling `has_own_media` `EXISTS` subquery in the same query/file was left
untouched:

```sql
EXISTS (
    SELECT 1
    FROM release_version_media rvm
    WHERE rvm.release_version_id = rv.id
      AND rvm.uploaded_by_user_id = $2
      AND rvm.deleted_at IS NULL
) AS has_own_media,
```

It has no join to `release_version_media_review_lifecycle` at all, and does
not check `review_state`. Media has an exactly analogous lifecycle table and
`rejected` state (`backend/internal/repository/release_review_lifecycle_repository.go:25`,
`ReleaseVersionMediaReviewSourceType`), and rejected media rows are **not**
deleted (`deleted_at` stays `NULL`) until the async cleanup job runs past its
retention window:

```go
// backend/internal/services/release_review_cleanup.go:13
ReleaseReviewCleanupProductionRetention = 90 * 24 * time.Hour
```

Consequence: a member whose only contribution to a release is a **rejected**
image submission will have `has_own_media = true` for up to 90 days in
production. On the frontend
(`frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:53-55`,
`isDone()` returns `release.has_own_notes || release.has_own_media`), this
makes the release badge show green "Erledigt" and downgrades the workspace
button to secondary styling (`page.tsx:338,351`) — exactly the false-positive
"done" bug that UAT-02 was raised to fix, just for the media artifact type
instead of notes. The member has no visual signal that their rejected image
needs to be reworked and resubmitted.

**Fix:** Mirror the note fix for media — exclude rejected media from
`has_own_media`, and optionally add a `has_own_rejected_media` flag
mirroring `has_own_rejected_notes` so the frontend badge/button logic can
treat both artifact types consistently:

```sql
EXISTS (
    SELECT 1
    FROM release_version_media rvm
    LEFT JOIN release_version_media_review_lifecycle lifecycle
      ON lifecycle.release_version_media_id = rvm.id
    WHERE rvm.release_version_id = rv.id
      AND rvm.uploaded_by_user_id = $2
      AND rvm.deleted_at IS NULL
      AND (lifecycle.review_state IS NULL OR lifecycle.review_state <> 'rejected')
) AS has_own_media,
EXISTS (
    SELECT 1
    FROM release_version_media rvm
    JOIN release_version_media_review_lifecycle lifecycle
      ON lifecycle.release_version_media_id = rvm.id
    WHERE rvm.release_version_id = rv.id
      AND rvm.uploaded_by_user_id = $2
      AND rvm.deleted_at IS NULL
      AND lifecycle.review_state = 'rejected'
) AS has_own_rejected_media,
```

then thread `has_own_rejected_media` through `MemberProjectReleaseVersionRow`,
`shared/contracts/openapi.yaml`'s `MeProjectReleaseVersion`,
`frontend/src/types/contributions.ts`, and
`page.tsx`'s `needsRework`/`hasOwnArtifacts` computation.

## Warnings

### WR-01: Dead duplicate 409-conflict branch in `submitDecision`

**File:** `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:164-185`

**Issue:** `submitDecision`'s catch block checks `error instanceof ApiError &&
error.status === 409 && error.code === 'REVIEW_ALREADY_DECIDED'` and then,
immediately after, repeats the identical check via manual duck-typing
(`typeof error === 'object' && ... 'status' in error && ...`). Every error
thrown by `frontend/src/lib/api.ts`'s request helpers is already an instance
of `ApiError` (confirmed: all `throw` sites in `api.ts` construct
`new ApiError(...)`), so the second branch is unreachable in practice. It
adds cyclomatic complexity and gives a false impression that some other
error shape can reach this code path.

**Fix:** Remove the second duck-typed block; the `instanceof ApiError` check
already covers the real error shape:

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

### WR-02: Admin-override validation focuses a field hidden behind the open reject Modal

**File:** `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:121-131`, `301-320`, `376-444`

**Issue:** `requiresAdminOverride` validation runs first inside
`submitDecision`, for *both* the `confirm` and `reject` decision paths. The
"Ablehnen" button that triggers `submitDecision('reject')` lives inside the
`Modal` (`rejectOpen === true`). If the platform admin is reviewing their own
submission and the override-reason textarea (rendered in `decisionPanel`,
*outside* the Modal) is invalid, `overrideReasonRef.current?.focus()` moves
keyboard focus out of the currently-open Modal to a background field. Modal
dialogs conventionally trap focus while open; forcing focus outside an open
dialog either breaks that trap (letting focus land on a field the user can't
see behind the overlay) or silently no-ops if the Modal's trap intercepts it
(in which case the user gets no indication at all of why nothing happened,
since the Modal's own `validationError` paragraph correctly renders the
message, but the referenced field is not reachable/visible to fix).

**Fix:** Validate the override reason before allowing the reject Modal to
open (e.g. in the "Ablehnen" button's `onClick`, before `setRejectOpen(true)`),
or move the override-reason field into the Modal for the reject flow so
focus stays within the open dialog.

### WR-03: `needsRework` badge is masked whenever the release is independently "done" via media

**File:** `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:338-347`

**Issue:**
```ts
const releaseDone = isDone(release)                                  // has_own_notes || has_own_media
const needsRework = !releaseDone && release.has_own_rejected_notes   // short-circuits to false if releaseDone
```
If a release has an accepted/pending media contribution (`has_own_media:
true`) from the same member **and** a separately rejected note
(`has_own_rejected_notes: true`), `releaseDone` is `true` (via media alone),
so `needsRework` is forced to `false` and the row renders the green
"Erledigt" badge — even though the member has a rejected note on that exact
release that still needs revision. This is a real, reachable state (member
uploads accepted media and writes a note that later gets rejected) and
directly undercuts this phase's stated goal of surfacing rejected-work
needing revision (Kriterium 5 / UAT-02 / 143-18).

**Fix:** Decouple the "needs rework" signal from the overall done/undone
status so it is not suppressed by unrelated completed artifacts, e.g. render
it as an additional badge/indicator rather than an alternative to "Erledigt":

```ts
const releaseDone = isDone(release)
const needsRework = release.has_own_rejected_notes // no releaseDone gate
```
and adjust the `Badge`/label rendering to show both signals when applicable
(e.g. "Erledigt · Überarbeitung nötig" or two stacked badges), confirming
the desired UX with product before changing the visual treatment.

---

_Reviewed: 2026-09-02T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
