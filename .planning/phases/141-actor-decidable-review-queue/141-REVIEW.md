---
phase: 141-actor-decidable-review-queue
reviewed: 2026-08-26T00:00:00Z
depth: standard
files_reviewed: 23
files_reviewed_list:
  - backend/cmd/server/main.go
  - backend/internal/handlers/release_review_handler_authz.go
  - backend/internal/handlers/release_review_handler.go
  - backend/internal/handlers/release_review_handler_identity.go
  - backend/internal/handlers/release_review_handler_test.go
  - backend/internal/permissions/review_group_authorization.go
  - backend/internal/repository/errors.go
  - backend/internal/repository/release_review_query_cursor.go
  - backend/internal/repository/release_review_query_predicates.go
  - backend/internal/repository/release_review_query_repository.go
  - backend/internal/repository/release_review_query_repository_test.go
  - backend/internal/services/review_service_test.go
  - frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.test.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx
  - frontend/src/app/admin/fansubs/[id]/edit/useReleaseReviewLane.test.ts
  - frontend/src/app/admin/fansubs/[id]/edit/useReleaseReviewLane.ts
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/NextReviewControl.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.test.tsx
  - frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx
  - frontend/src/app/admin/fansubs/releaseReviewPresentation.ts
  - frontend/src/app/admin/fansubs/releaseReviews.test.tsx
  - frontend/src/types/releaseReviews.ts
findings:
  critical: 0
  warning: 5
  info: 1
  total: 6
status: issues_found
---

# Phase 141: Code Review Report

**Reviewed:** 2026-08-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 23
**Status:** issues_found

## Summary

Reviewed the actor-decidable release-review queue: the query repository (predicates, cursor,
list/detail/next), the permission single-resolution helper, the handler layer (authz, identity,
decision validation), and the corresponding frontend queue/detail/lane UI. The core
authorization design is solid and well-tested: the two-signal self-exclusion (app_user_id +
verified member claim) is consistently applied across `List`, `Counts`, `Detail`, and `Next`;
cross-group access correctly collapses to `404`; own-submission/insufficient-capability
correctly collapses to a single `403` to avoid leaking which condition applies; specialized
delegation grant/revoke takes effect immediately with no cache staleness (verified by a
real-Postgres concurrency test). No SQL injection, hardcoded secrets, or auth-bypass issues were
found in the reviewed files.

The issues found are functional/robustness gaps rather than security holes: the repository's
`Next()` silently drops the caller's active filter/view scope (jumping outside the user's
filtered context), a secondary error inside `Decide()` is discarded and misrepresented as "queue
exhausted" rather than surfaced, request validation allows a platform-admin `override_reason` on
a non-self decision to produce a confusing `403` instead of a clean validation error, the
frontend's own-submission detection only checks one of the two identity signals the backend
enforces, and two sibling frontend components race to rewrite the same URL query string. One
cosmetic `gofmt` drift was found in `main.go`.

## Warnings

### WR-01: `Next()` silently drops the caller's active view/filter scope

**File:** `backend/internal/repository/release_review_query_repository.go:286-298`
**Issue:** `Next()` hardcodes a brand-new scope to compute the following item:
```go
scope := ReleaseReviewQueueScope{FansubGroupID: fansubGroupID, View: ReleaseReviewQueueViewOpen}
...
page, err := r.List(ctx, ReleaseReviewQueueOptions{
    Scope: scope, AllowedKinds: allowedKinds, Cursor: cursor, Limit: 1,
    ActorAppUserID: actorAppUserID, ActorMemberIDs: actorMemberIDs,
})
```
`AnimeID`, `ReleaseVersionID`, `ReviewKind`, `Category`, and `Search` from whatever filtered
queue the actor was actually browsing are never passed through — and `ReleaseReviewHandler.Next`
/ `Decide` (`backend/internal/handlers/release_review_handler.go:141-166, 238-243`) don't even
accept those as request parameters, so there is no way to preserve them. A reviewer who filtered
to "Anime X, category=screenshot" and confirms an item can be sent to a completely unrelated
anime/category's pending item as "next," silently breaking the filtered workflow they were in.
**Fix:** Thread the scope (view/animeId/releaseVersionId/reviewKind/category/search) that
produced the current item through to `Next`/`Decide` (e.g. as optional query parameters on the
`next`/`decision` endpoints), and use that scope instead of a hardcoded `View: Open` scope when
resolving the following item.

### WR-02: Internal errors from the post-decision "next" lookup are discarded, not surfaced

**File:** `backend/internal/handlers/release_review_handler.go:238-243`
**Issue:**
```go
next, nextErr := h.query.Next(
    c.Request.Context(), groupID, c.Param("reviewId"), allowedKinds, actor.AppUserID, actorMemberIDs,
)
if nextErr != nil && !errors.Is(nextErr, repository.ErrNotFound) {
    next = nil
}
```
Any error other than "genuinely no next item" (e.g. a transient DB failure, a query timeout) is
silently swallowed — no log line, no error surfaced to the caller. The response still returns
`200 OK` with `"next": null`, which the frontend (`NextReviewControl.tsx`) renders as "Keine
weiteren Prüfungen für dich offen" (queue exhausted). A genuine backend problem is indistinguishable
from "you're done," directly at odds with this project's own stated principle
("operational errors must be visible immediately in the UI").
**Fix:** Log the swallowed error (`log.Printf`) and/or surface a distinct signal to the client
(e.g. omit `next` and let the frontend's own `NextReviewControl` standalone "load next" affordance
retry rather than presenting definitive "exhausted" state) so real failures are visible.

### WR-03: `override_reason` on a non-self decision produces a misleading `403` instead of a validation error

**File:** `backend/internal/handlers/release_review_handler.go:390-421` (`validateReleaseReviewDecisionRequest`)
**Issue:** The handler-level validator only checks that a non-empty `override_reason` is
10–1000 characters and that the actor is a platform admin — it never checks whether the target
is actually the actor's own submission (it can't yet; `Detail` hasn't been loaded). If a
platform admin (or a modified client) sends a syntactically valid `override_reason` for a
decision on someone else's submission, `services.ReviewService.Decide`'s `validateReviewIntent`
(`review_service.go:304-307`) explicitly rejects it:
```go
if !self {
    if cmd.SelfReviewOverride || cmd.OverrideReason != "" {
        return false, ErrReviewSelfReviewForbidden
    }
    ...
}
```
which `writeDecisionError` maps to `403 REVIEW_FORBIDDEN` ("Keine Berechtigung für diese
Prüfung.") — a confusing "forbidden" response for input that is simply invalid, not an
authorization failure. The current UI never triggers this path (it only sends `override_reason`
when it has already determined `isOwnSubmission`), so this is reachable only via direct API use,
but the error code/message actively misleads whoever hits it.
**Fix:** Either document this as an intentional generic-denial response, or have the handler
determine self-review-ness before deciding whether `override_reason` is accepted, returning
`422 REVIEW_VALIDATION_FAILED` ("Ein Override-Grund ist nur für die eigene Einreichung
zulässig.") for this specific combination instead of relying on the downstream service's
generic self-review-forbidden error.

### WR-04: Frontend own-submission check only uses one of the two identity signals the backend enforces

**File:** `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx:229-234`
**Issue:**
```ts
const isOwnSubmission = currentAppUserId === detail.submitter_app_user_id
const requiresAdminOverride = isOwnSubmission && isPlatformAdmin
const showDecisionActions =
  detail.status === 'pending' &&
  (!isOwnSubmission || isPlatformAdmin) &&
  ...
```
The backend enforces self-review exclusion via **two** signals — direct `app_user_id` match
*or* a verified member-claim match (`submitter_member_id`; see
`backend/internal/repository/release_review_query_predicates.go:46-67` and
`backend/internal/repository/release_review_query_repository.go:203-207`). The frontend only
checks the first signal because `getCurrentUser()` never returns the current user's verified
member IDs, so the page has no way to detect the second case. If the acting admin is verified as
the same member as the submitter under a different `app_user_id`, the page renders the normal
"Confirm"/"Reject" buttons (instead of the "Das ist dein eigener Beitrag..." warning that
already handles the direct-match case), and clicking them always fails backend-side with a
generic `403` mapped to the catch-all `decisionState: { kind: 'error' }` panel
("Die Entscheidung wurde nicht gespeichert...") rather than the clear, already-implemented
own-submission messaging.
**Fix:** Either have `getCurrentUser()` also return the caller's verified member IDs so the
frontend can replicate the full self-exclusion check, or special-case the `403 REVIEW_FORBIDDEN`
response from `decideReleaseReview` to render the same "this is your own submission" messaging
instead of the generic error panel.

### WR-05: URL query-sync race between the lane switcher and the queue filters

**File:** `frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx:76-81`,
`frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx:63-86`
**Issue:** `PruefungenTabs` and `ReleaseReviewsSection` both independently sync state to the URL
via `router.replace()`, each starting from a fresh, empty `URLSearchParams()` and writing only
the fields it owns:
```ts
// PruefungenTabs
const params = new URLSearchParams()
params.set("tab", "pruefungen")
if (lane === "own-pending") params.set("lane", "own")
router.replace(`${pathname}?${params.toString()}`, { scroll: false })
```
```ts
// ReleaseReviewsSection
const query = new URLSearchParams()
query.set('tab', 'pruefungen')
if (view !== 'open') query.set('view', view)
if (animeId) query.set('anime_id', String(animeId))
...
router.replace(`${pathname}?${query.toString()}`, { scroll: false })
```
Neither effect merges the other's params into its own write. Because both lane tabs are kept
mounted (`keepMountedIds`), switching to "Wartet auf Fremdprüfung" and back to "Zu prüfen" fires
`PruefungenTabs`' effect (lane changed twice) without re-running `ReleaseReviewsSection`'s effect
(its own dependencies didn't change), so the URL collapses to `?tab=pruefungen` and silently
drops any previously-synced `view`/`anime_id`/`release_version_id`/`type`/`category`/`search`
query params — even though the in-memory filter state (and the rendered table) is unaffected.
Refreshing or sharing the URL at that point loses the active filters.
**Fix:** Have one effect own the full query string (merging both the lane and the queue-filter
state), or have each effect read-and-preserve the other's keys (`lane`, `view`, filters) from
the current `searchParams` before writing, instead of starting from an empty `URLSearchParams()`.

## Info

### IN-01: `gofmt` drift in `registerAdminRoutes` struct literal

**File:** `backend/cmd/server/main.go:570-578`
**Issue:** The `adminRouteHandlers{...}` literal added by this phase (and adjacent phases
squashed into the same diff) is not `gofmt`-aligned:
```go
releaseReviewHandler:          releaseReviewHandler,
adminEffectiveRightsHandler:   adminEffectiveRightsHandler,
adminReviewDelegationHandler: adminReviewDelegationHandler,
adminRoleHoldersHandler:          adminRoleHoldersHandler,
adminRoleAssignmentImpactHandler: adminRoleAssignmentImpactHandler,
```
The colon alignment is inconsistent within what should be one gofmt-aligned block, indicating
the file wasn't run through `gofmt`/`goimports` before commit.
**Fix:** Run `gofmt -w backend/cmd/server/main.go` (or `go fmt ./...`) before merging.

---

_Reviewed: 2026-08-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
