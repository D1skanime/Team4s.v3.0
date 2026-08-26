# Phase 141: Actor-Decidable Review Queue - Pattern Map

**Mapped:** 2026-08-26
**Files analyzed:** 15 (7 backend, 8 frontend)
**Analogs found:** 15 / 15 (all files modify or sit adjacent to existing, well-understood analogs — this phase is explicitly a consolidation of existing patterns, per RESEARCH.md's "Don't Hand-Roll" table)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `backend/internal/repository/release_review_query_predicates.go` (NEW) | repository (query-predicate builder) | CRUD (read) | `backend/internal/repository/release_review_query_repository.go` (`releaseReviewQueuePredicates`, lines 264-304 — being extracted from this same file) | exact (extraction of existing code) |
| `backend/internal/repository/release_review_query_repository.go` (MODIFY) | repository | CRUD (read) | itself (existing file, self-exclusion + shared-predicate wiring added) | exact |
| `backend/internal/repository/release_review_query_cursor.go` (MODIFY) | repository (cursor/scope validation) | transform | itself (add `ReleaseReviewQueueViewOwn` alongside existing `ViewOpen`/`ViewHistory`) | exact |
| `backend/internal/handlers/release_review_handler_authz.go` (NEW) | middleware/authz-helper | request-response | `backend/internal/handlers/release_review_handler.go` (`authorizedKinds`, lines 299-338 — extraction target) | exact (extraction of existing code) |
| `backend/internal/handlers/release_review_handler.go` (MODIFY) | controller | request-response | itself; secondary analog for the new 403 branch: `writeReadError`/`writeDecisionError` (lines 340-377) | exact |
| `backend/internal/services/review_service.go` (REFERENCE ONLY — do not modify) | service | CRUD (write/decision) | itself — canonical self-review definition already correct (lines 171-190) | exact (source of truth to copy from, not a target file) |
| `backend/internal/repository/release_review_query_repository_test.go` (MODIFY — add tests) | test | CRUD (read) | itself, `TestReleaseReviewQueueRepositoryFiltersCountsDetailAndStablePages` (line 126) | exact |
| `backend/internal/handlers/release_review_handler_test.go` (MODIFY — add tests) | test | request-response | itself, `TestReleaseReviewDetailCrossGroupIsScopedNotFound` (line 261) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx` (MODIFY) | component | request-response | itself (existing file, badge removal + filter gating + copy changes) | exact |
| `frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.tsx` (NEW) | component | request-response | `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx` (sibling, same fetch/filter/table shape, minus decision actions and Offen/Verlauf toggle) | exact (explicit sibling per UI-SPEC) |
| `frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx` (MODIFY — wrap in `Tabs`) | component (thin composition/provider) | request-response | `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (`Tabs` + `?tab=` URL sync + `keepMountedIds`, lines 128-146, 157-227) | role-match (different domain, identical `Tabs` mechanics) |
| `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` (MODIFY) | component (detail/decision page) | request-response | itself; secondary analog for `loadError: unknown` pattern: `frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx` (lines 5, 24, 34, 56) | exact (self) + role-match (error-shape pattern) |
| `frontend/src/types/releaseReviews.ts` (MODIFY) | model (type definitions) | transform | itself (extend `ReleaseReviewView`, `ReleaseReviewCounts`) | exact |
| `frontend/src/lib/api.ts` (MODIFY, `listReleaseReviews`/`getReleaseReviewCounts`/`buildReleaseReviewQuery`, lines 10460-10567) | service (API client functions) | request-response | itself | exact |
| `frontend/src/app/admin/fansubs/releaseReviews.test.tsx` (MODIFY) + `OwnPendingReviewsSection.test.tsx` (NEW) | test | request-response | itself / sibling of itself | exact |

## Pattern Assignments

### `backend/internal/repository/release_review_query_predicates.go` (NEW — repository, CRUD read)

**Analog:** `backend/internal/repository/release_review_query_repository.go` lines 264-304 (function to extract and extend)

**Existing predicate builder to extract as-is, then extend** (`release_review_query_repository.go:264-304`):
```go
func releaseReviewQueuePredicates(options ReleaseReviewQueueOptions, includeCursor bool) ([]string, []any, error) {
    scope := options.Scope
    args := []any{scope.FansubGroupID, options.AllowedKinds}
    where := []string{"source.fansub_group_id = $1", "source.review_kind = ANY($2::text[])"}
    if scope.View == ReleaseReviewQueueViewOpen {
        where = append(where, "source.review_state = 'pending'")
    } else {
        where = append(where, "source.review_state <> 'pending'")
    }
    add := func(value any, expression string) {
        args = append(args, value)
        where = append(where, fmt.Sprintf(expression, len(args)))
    }
    // ... anime_id / release_version_id / review_kind / category / search (unchanged)
    // NEW: self-exclusion (view=open/history) OR self-inclusion (view=own), see below
    if includeCursor && options.Cursor != "" {
        key, err := DecodeReleaseReviewQueueCursor(scope, options.Cursor)
        // ...
    }
    return where, args, nil
}
```

**New two-signal self-exclusion clause to add** — copy the exact identity definition from
`review_service.go:189-190` (do not invent a one-signal version):
```go
// view=open/history: EXCLUDE the actor's own rows
AND source.submitter_app_user_id <> $actorAppUserID
AND NOT (source.submitter_member_id = ANY($actorVerifiedMemberIDs::bigint[]))

// view=own (inverted polarity, per Pattern 2): INCLUDE only the actor's own rows,
// AllowedKinds bypassed (forced to [text, image] regardless of capability, per D10)
AND (source.submitter_app_user_id = $actorAppUserID
     OR source.submitter_member_id = ANY($actorVerifiedMemberIDs::bigint[]))
```

**Existence-then-authorize pattern for Detail (D04, Pattern 3)** — new shared function in this
file, used by both `Detail()` and `Next()`'s "resolve current item" half instead of each
hand-rolling its own `WHERE` (closes Pitfall 3). Two-step shape: (1) confirm row exists in
group+kind scope regardless of submitter, (2) apply self/capability predicate to decide 200 vs
403 in the handler layer. Do NOT collapse straight to the capability-filtered query (see
Anti-Patterns in RESEARCH.md — that produces 404, not 403, for D04).

**Auth/actor inputs threaded through, not re-queried:** `ReleaseReviewQueueOptions`
(`release_review_query_cursor.go:29-34`) gains `ActorAppUserID int64` and
`ActorMemberIDs []int64`, populated by the handler from `permissions.Actor.AppUserID` and a call to
`AuthzRepository.ResolveVerifiedActorMemberIDs` (`authz_permissions.go:278-...`, reused
unchanged — do not add a second identity-resolution helper).

---

### `backend/internal/repository/release_review_query_repository.go` (MODIFY — repository, CRUD read)

**Analog:** itself

**Detail's current hand-rolled query to replace with the shared predicate/existence-then-authorize
builder** (`release_review_query_repository.go:178-223`):
```go
func (r *ReleaseReviewQueryRepository) Detail(
    ctx context.Context, fansubGroupID int64, reviewID string, allowedKinds []string,
) (*ReleaseReviewDetail, error) {
    // ...
    err = r.db.QueryRow(ctx, releaseReviewQueueBaseSQL+`
        SELECT `+releaseReviewQueueColumns+`, source.note_title, source.note_html,
               source.caption, source.thumbnail_path, source.original_path
        FROM review_sources source
        WHERE source.fansub_group_id = $1 AND source.source_type = $2
          AND source.source_id = $3 AND source.review_kind = ANY($4::text[])
    `, fansubGroupID, sourceType, sourceID, allowedKinds).Scan(targets...)
    if errors.Is(err, pgx.ErrNoRows) {
        return nil, ErrNotFound
    }
    // ...
}
```
Must become: existence check (any submitter, any kind in group) → if absent, `ErrNotFound` (404,
unchanged for genuinely-missing/cross-group); if present but the self/capability predicate
excludes it → new `ErrForbidden` sentinel (403, D04); if present and included → 200 with data.

**Next's identical hand-rolled query** (`release_review_query_repository.go:225-262`, lines
236-243) needs the same treatment for its "resolve current item" half; the "find actual next
item" half already correctly delegates to `r.List(...)` (line 255) and inherits whatever
predicate change is made there for free.

**Counts' existing shared-builder usage to preserve exactly** (`release_review_query_repository.go:142-176`,
calls the same `releaseReviewQueuePredicates` as `List` at line 152) — do not diverge Counts from
List when adding the self-exclusion clause; both must go through the one predicate function.

**Error handling pattern** (existing, reuse unchanged): `errors.Is(err, pgx.ErrNoRows) →
ErrNotFound`, wrapped errors via `fmt.Errorf("...: %w", err)` — same convention throughout this
file, extend it with the new `ErrForbidden` sentinel using the identical shape.

---

### `backend/internal/repository/release_review_query_cursor.go` (MODIFY — repository, cursor/scope validation)

**Analog:** itself

**View constant + validation to extend** (`release_review_query_cursor.go:13-17, 154-164`):
```go
const (
    ReleaseReviewQueueViewOpen    = "open"
    ReleaseReviewQueueViewHistory = "history"
    releaseReviewCursorVersion    = 1
)
// NEW: ReleaseReviewQueueViewOwn = "own"

func validateReleaseReviewScope(scope ReleaseReviewQueueScope) error {
    if scope.FansubGroupID <= 0 ||
        (scope.View != ReleaseReviewQueueViewOpen && scope.View != ReleaseReviewQueueViewHistory) ||
        // NEW: accept ReleaseReviewQueueViewOwn as a third valid value
        ...
}
```
`DecodeReleaseReviewQueueCursor`'s existing `decoded.View != scope.View` check
(implicit in the full-tuple comparison at lines 99-107) already generalizes to a third `View`
value with zero structural change — this is the load-bearing reason Pattern 2 (own-pending as a
`view` value, not a new endpoint) works without a new cursor format.

**`ValidateReleaseReviewQueueOptions`'s `AllowedKinds == 0 → error` gate** (line 122) needs a
`view == "own"` branch forcing `AllowedKinds = [text, image]` unconditionally (D10 capability
bypass for the own-pending lane) rather than deriving it from the actor's capability.

---

### `backend/internal/handlers/release_review_handler_authz.go` (NEW — middleware/authz-helper, request-response)

**Analog:** `backend/internal/handlers/release_review_handler.go` lines 299-338 (function to extract)

**Existing per-action redundant resolution to replace** (`release_review_handler.go:299-338`,
extract this whole function here, then rewrite its body):
```go
func (h *ReleaseReviewHandler) authorizedKinds(
    c *gin.Context, actor permissions.Actor, groupID int64, requested string,
) ([]string, bool) {
    actions := []struct{ action permissions.Action; kind string }{
        {permissions.ActionReviewTextDecide, string(repository.ReviewKindText)},
        {permissions.ActionReviewImageDecide, string(repository.ReviewKindImage)},
    }
    allowed := make([]string, 0, len(actions))
    var denied permissions.Result
    for _, candidate := range actions {
        result, err := h.permissions.CanReviewForFansubGroup(
            c.Request.Context(), actor, candidate.action, groupID,
        ) // <- currently re-runs the full ResolveGroupRights source-load PER call (Pitfall 1)
        // ...
    }
    // ...
}
```

**Target pattern (Pattern 1 from RESEARCH.md)** — resolve once, project twice:
```go
// Source shape: permissions/effective_rights.go:177-196 (existing exported method, already
// batch-loads every known action in one pass) + :152-160 (Can() projection)
groupRights, err := h.permissionsService.ResolveGroupRights(ctx, actor, groupID)
if err != nil { /* writePermissionInternalError, same as today */ }
textAllowed := groupRights.Can(permissions.ActionReviewTextDecide).Allowed
imageAllowed := groupRights.Can(permissions.ActionReviewImageDecide).Allowed
```
This single resolved `*GroupRightsResolution` must be a **request-scoped local variable only**
(RESEARCH.md's Anti-Patterns: never cache across requests — that would reintroduce the RDEL-05
staleness window this phase must not create).

**Auth pattern to reuse unchanged:** `permissions.Actor`, `permissionActorFromContext(c)`
(`release_review_handler.go:234`), and the existing `writePermissionDenied`/
`writePermissionInternalError` helpers already used throughout this handler family — do not
invent new authorization plumbing.

---

### `backend/internal/handlers/release_review_handler.go` (MODIFY — controller, request-response)

**Analog:** itself

**Error-mapping pattern to extend for D04's new 403 branch** (`release_review_handler.go:340-349`):
```go
func (h *ReleaseReviewHandler) writeReadError(c *gin.Context, err error) {
    switch {
    case errors.Is(err, repository.ErrValidation):
        c.JSON(http.StatusBadRequest, reviewError("REVIEW_BAD_REQUEST", "..."))
    case errors.Is(err, repository.ErrNotFound):
        c.JSON(http.StatusNotFound, reviewError("REVIEW_NOT_FOUND", "..."))
    // NEW: case errors.Is(err, repository.ErrForbidden):
    //     c.JSON(http.StatusForbidden, reviewError("REVIEW_FORBIDDEN", "..."))
    default:
        writeInternalErrorResponse(c, "interner serverfehler", err, "...")
    }
}
```

**Existing 409 mapping to extend for "no longer pending" (D11)** — already present, do not
restructure, just confirm both sentinels route to the same code
(`release_review_handler.go:351-377`, specifically `services.ErrReviewTargetNotPending →
StatusConflict` at line 364-365 already exists; verify the frontend-facing `code` string is
routable the same way as `REVIEW_ALREADY_DECIDED`).

**`queueOptions` to extend** (`release_review_handler.go:250-297`) with the `view=own` branch
(bypass capability-derived `AllowedKinds`, force both kinds per D10) and the new
`ActorAppUserID`/`ActorMemberIDs` fields threaded into `repository.ReleaseReviewQueueOptions`.

**Validation/decoding pattern to reuse unchanged:** `decodeStrictReleaseReviewJSON`
(`release_review_handler.go:379-389`, `DisallowUnknownFields` + single-JSON-value check) — no
new decoder needed for any Phase 141 addition since no new request body shape is introduced.

---

### `frontend/src/app/admin/fansubs/[id]/edit/OwnPendingReviewsSection.tsx` (NEW — component, request-response)

**Analog:** `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx` (full file, 450
lines — sibling component, strip the decision-action column, the Offen/Verlauf toggle, and the
capability-gated Typ filter omission)

**Imports pattern to copy** (`ReleaseReviewsSection.tsx:1-43`):
```tsx
'use client'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Badge, Button, FormField, Input, LoadingState, SectionHeader, Select,
  Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeaderCell, TableRow, Toolbar,
} from '@/components/ui'
import { getReleaseReviewCounts, listReleaseReviews } from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { ReleaseReviewCounts, ReleaseReviewQueueItem, ... } from '@/types/releaseReviews'
import {
  dedupeReleaseReviews, EMPTY_RELEASE_REVIEW_COUNTS, formatReleaseReviewDateTime,
  readPositiveReviewNumber, readReviewCategory, readReviewType, releaseReviewQueueStatus,
} from '../../releaseReviewPresentation'
import styles from '../../releaseReviews.module.css'
import { useReleaseReviewMobileGate } from '../../useReleaseReviewMobileGate'
```
Call `listReleaseReviews`/`getReleaseReviewCounts` with `{ view: 'own', ... }` instead of
`view`/toggle state — no toggle needed (single-state lane per UI-SPEC).

**Fetch/abort/sequence pattern to copy verbatim** (`ReleaseReviewsSection.tsx:103-164`) —
`requestSequence` ref + `AbortController` + `Promise.all([list, counts])` + `dedupeReleaseReviews`
+ debounced search — this is the exact shape `loadInitial`/`loadMore` must follow, just against
`view: 'own'` and without a `view` state setter.

**Table pattern to copy, columns reduced** (`ReleaseReviewsSection.tsx:365-426`): same `Table`/
`TableHead`/`TableBody`/`TableRow`/`TableCell`/`TableEmptyState` primitives, `variant`
**not** `"withActions"` (no Aktion column per UI-SPEC), columns: `Eingereicht · Projekt · Episode /
Release · Typ · Status` only — drop `Einreicher` (always the viewing actor) and `Aktion` (no
per-row link into the decision-shaped detail page).

**Status badge reuse (do not invent a parallel function):**
```ts
// Source: frontend/src/app/admin/fansubs/releaseReviewPresentation.ts:55
export function releaseReviewQueueStatus(status: ReleaseReviewQueueItem['status']) { ... }
```

---

### `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx` (MODIFY — component, request-response)

**Analog:** itself

**Badge row to change** (`ReleaseReviewsSection.tsx:258-262`, remove the always-zero
Mitwirkungen badge per Pitfall 4 / UI-SPEC lock):
```tsx
<div className={styles.counters} aria-label="Offene Prüfungen nach Typ">
  <Badge variant="info">Texte {counts.text}</Badge>
  <Badge variant="info">Bilder {counts.image}</Badge>
  <Badge variant="muted">Mitwirkungen {counts.contribution}</Badge>  {/* DELETE this line */}
</div>
```
New `aria-label`: `"Prüfungen, die du entscheiden kannst, nach Typ"` (verbatim, per Copywriting
Contract). New `SectionHeader description` text also locked verbatim in UI-SPEC's Copywriting
Contract table.

**Typ filter to gate on `allowed_types`, not `counts`** (`ReleaseReviewsSection.tsx:310-324`):
```tsx
<FormField label="Typ" htmlFor="release-review-type">
  <Select id="release-review-type" value={type ?? ''} onChange={...}>
    <option value="">Alle Typen</option>
    <option value="text">Texte</option>   {/* NEW: only render if allowed_types includes 'text' */}
    <option value="image">Bilder</option> {/* NEW: only render if allowed_types includes 'image' */}
  </Select>
</FormField>
```
If `allowed_types.length <= 1`, omit the entire `FormField` (per UI-SPEC Component Contract 2) —
do not render a disabled/single-option control.

**Empty-state copy to lock exactly** (`ReleaseReviewsSection.tsx:379-384`) — replace the current
single generic description with the three D13-locked variants (no-filter / filters-active /
history) from UI-SPEC's Copywriting Contract table; do not paraphrase.

---

### `frontend/src/app/admin/fansubs/[id]/edit/FansubEditSecondaryTabs.tsx` (MODIFY — thin composition wrapper)

**Analog:** `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx` (`Tabs` usage,
`?tab=`-sync convention, `keepMountedIds` lazy-mount pattern)

**Existing thin-wrapper shape to preserve** (`FansubEditSecondaryTabs.tsx:39-76`, current
`pruefungen` branch to replace with a `Tabs`-wrapped pair):
```tsx
{activeMainTab === "pruefungen" ? (
  <ReleaseReviewsSection fansubId={fansubID} />
) : null}
```

**`Tabs` + URL-sync + `keepMountedIds` pattern to copy** (`UserDetailPageClient.tsx:128-146,
157-227`):
```tsx
const tabFromQuery = searchParams.get('tab')
const initialTab = parseDetailTab(tabFromQuery)
const [activeTab, setActiveTab] = useState<DetailTabId>(initialTab)
const [loadedTabs, setLoadedTabs] = useState<Set<DetailTabId>>(new Set([initialTab]))
function handleTabChange(id: string) {
  const nextTab = parseDetailTab(id)
  setActiveTab(nextTab)
  setLoadedTabs((prev) => new Set([...prev, nextTab]))
  const nextParams = new URLSearchParams(searchParams.toString())
  nextParams.set('tab', nextTab)
  router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false })
}
// ...
<Tabs items={items} activeId={activeTab} onActiveIdChange={handleTabChange} keepMountedIds={loadedTabs} />
```
Per UI-SPEC, this phase's version uses a **sibling `?lane=queue|own`** param (default `queue`,
omitted when default — mirrors `ReleaseReviewsSection.tsx:82-87`'s own omit-if-default
convention) nested inside the existing `?tab=pruefungen`, with `badge:` props on each `Tabs` item
(`Badge variant="info"` for `queue`, `Badge variant="muted"` for `own-pending` — never swapped,
per UI-SPEC's locked color asymmetry).

---

### `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` (MODIFY — component, request-response)

**Analog:** itself; secondary analog for the `loadError` type change:
`frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx`

**Current boolean `loadError` to replace with typed `unknown`** (`page.tsx:68, 84, 92, 104, 208-217`):
```tsx
const [loadError, setLoadError] = useState(false)   // CURRENT — becomes useState<unknown>(null)
// ...
} catch {
  if (!controller.signal.aborted) setLoadError(true)   // CURRENT — becomes: setLoadError(error)
}
// ...
if (loadError || !detail) {
  return ( /* one generic message regardless of 403 vs 404 */ )
}
```

**Reference pattern for the `unknown`-typed error + status branch** (`ReviewDelegationSection.tsx:5, 24, 34, 56`):
```tsx
import { ErrorState, getErrorStateCopy } from '@/components/ui'
const [loadError, setLoadError] = useState<unknown>(null)
// ...
.catch((error: unknown) => { if (active) setLoadError(error) })
// ...
{loadError ? <ErrorState {...getErrorStateCopy(loadError, { defaultDescription: '...' })} /> : ( ... )}
```
Per UI-SPEC, Phase 141's 403 branch must **bypass** `getErrorStateCopy`'s default 403 copy and
render `ErrorState` directly with the phase-specific locked title/description/action (UI-SPEC
Component Contract 3) — reuse `ApiError`'s `.status` (already imported at `page.tsx:18` for the
existing 409 check) to branch, not `getErrorStateCopy`'s built-in mapping.

**Existing 409-conflict pattern to keep as canonical, unchanged mechanics** (`page.tsx:161-181,
322-332`):
```tsx
} catch (error) {
  if (error instanceof ApiError && error.status === 409 && error.code === 'REVIEW_ALREADY_DECIDED') {
    setRejectOpen(false)
    setDecisionState({ kind: 'conflict' })
    return
  }
  // ... duplicate non-ApiError fallback check (unchanged — keep both branches)
}
```
Extend only the `error.code === 'REVIEW_ALREADY_DECIDED'` match to also catch the new
"target not pending" sentinel code (D11) — same `conflict` state, no second UI branch.

**Existing unused API call to finally wire up** (`api.ts:10541-10550`, `getNextReleaseReview` —
already implemented, currently called from nowhere): use for the new standalone "Nächste
Prüfung" button (UI-SPEC Component Contract 3, case B) exactly as `submitDecision`'s existing
`decideReleaseReview` call is wired, same abort/loading/error conventions.

**File-size note:** this file is 443/450 lines already (matches RESEARCH.md's measurement); per
UI-SPEC's File Size Note, extract a shared `NextReviewControl.tsx` (sibling, mirrors this
directory's existing `ReleaseReviewMediaPreview.tsx` extraction precedent) for the
resolving/available/exhausted/error states shared between case A (post-decision) and case B
(standalone skip) rather than inlining both here.

---

### `frontend/src/types/releaseReviews.ts` (MODIFY — model)

**Analog:** itself

**View union to extend** (`releaseReviews.ts:1`):
```ts
export type ReleaseReviewView = 'open' | 'history'  // becomes: | 'own'
```

**Counts shape to extend** (`releaseReviews.ts:46-51`):
```ts
export interface ReleaseReviewCounts {
  text: number
  image: number
  contribution: number
  image_categories: Record<ReleaseReviewImageCategory, number>
  // NEW: allowed_types: ReleaseReviewType[]  (per Cross-Reference to Backend Contract)
}
```

---

### `frontend/src/lib/api.ts` (MODIFY — service/API client functions, lines 10460-10567)

**Analog:** itself

**Query-builder pattern to extend** (`api.ts:10460-10484`, `buildReleaseReviewQuery` already
threads `params.view ?? 'open'` through unconditionally — the `view: 'own'` value needs zero
structural change here, it already passes through as a plain string):
```ts
function buildReleaseReviewQuery(
  params: ReleaseReviewListParams | ReleaseReviewCountParams,
  includePage: boolean,
): string {
  const query = new URLSearchParams();
  query.set("view", params.view ?? "open");  // already generic — 'own' flows through unchanged
  // ...
}
```

**Error-shape pattern already correct, reuse unchanged** (`api.ts:10486-10503`,
`parseReleaseReviewResponse` throws `ApiError` with `.status`/`.code` from the parsed payload) —
the new 403/`REVIEW_FORBIDDEN` response shape from the backend needs no new parsing logic here,
it flows through the exact same `ApiError` constructor already used for 409/`REVIEW_ALREADY_DECIDED`.

---

## Shared Patterns

### Backend: single-request authorization resolution (no caching)
**Source:** `backend/internal/permissions/effective_rights.go:177-196` (`ResolveGroupRights`) +
`:152-160` (`Can()`)
**Apply to:** `release_review_handler.go` (List/Counts/Detail/Next/Decide's pre-check), via the
new `release_review_handler_authz.go` extraction.
```go
groupRights, err := h.permissionsService.ResolveGroupRights(ctx, actor, groupID)
textAllowed := groupRights.Can(permissions.ActionReviewTextDecide).Allowed
imageAllowed := groupRights.Can(permissions.ActionReviewImageDecide).Allowed
```
Must remain a per-request local variable — never persisted, never a package-level map (this is
the load-bearing constraint behind RDEL-05's already-shipped immediacy guarantee).

### Backend: self-review two-signal identity check
**Source:** `backend/internal/services/review_service.go:171-190` (already shipped, canonical,
do not modify or simplify)
```go
self := cmd.Actor.AppUserID == *target.SubmitterAppUserID ||
    containsReviewMemberID(actorMembers, *target.BeneficiaryMemberID)
```
**Apply to:** the new SQL predicate in `release_review_query_predicates.go` — must use both
signals (`submitter_app_user_id` match OR verified-member-ID match via
`ResolveVerifiedActorMemberIDs`), not a weaker one-signal version.

### Backend: error-mapping switch-on-sentinel
**Source:** `backend/internal/handlers/release_review_handler.go:340-377`
(`writeReadError`/`writeDecisionError`)
**Apply to:** the new `ErrForbidden`/`REVIEW_FORBIDDEN` 403 branch (D04) and the "not pending"
409 branch (D11) — extend the existing `switch { case errors.Is(err, ...): }` shape, do not
introduce a new middleware or generic error handler.

### Frontend: `Tabs` primitive + `?tab=`/`?lane=`-sync + `keepMountedIds`
**Source:** `frontend/src/app/admin/users/[id]/UserDetailPageClient.tsx:128-146, 157-227`
**Apply to:** `FansubEditSecondaryTabs.tsx`'s new queue/own-pending split (UI-SPEC Component
Contract 1) — reuse the exact `router.replace(..., { scroll: false })` + `Set<TabId>`
lazy-mount idiom, do not invent a new tab-state mechanism.

### Frontend: `loadError: unknown` + `getErrorStateCopy`/`ErrorState`
**Source:** `frontend/src/app/admin/users/tabs/ReviewDelegationSection.tsx:5, 24, 34, 56`
**Apply to:** `page.tsx`'s detail-load error state (D04) — same typed-error storage pattern;
Phase 141's 403 case deliberately bypasses `getErrorStateCopy`'s default copy per UI-SPEC, but
the `useState<unknown>` + `.catch((error: unknown) => setLoadError(error))` shape is reused
verbatim.

### Frontend: fetch/abort/sequence-guard + `Promise.all([list, counts])`
**Source:** `frontend/src/app/admin/fansubs/[id]/edit/ReleaseReviewsSection.tsx:103-164`
**Apply to:** `OwnPendingReviewsSection.tsx`'s own independent fetch effect — same
`requestSequence` ref, `AbortController`, and dedupe-on-append (`loadMore`) shape, just against
`view: 'own'` params and without the Offen/Verlauf `view` state.

## No Analog Found

None — every file in this phase's scope either modifies an existing file directly or is an
explicit sibling/extraction of one, per RESEARCH.md's "Don't Hand-Roll" table and the UI-SPEC's
explicit sibling-file instructions. There is no green-field pattern in this phase.

## Metadata

**Analog search scope:** `backend/internal/{handlers,repository,services,permissions}`,
`frontend/src/app/admin/{fansubs,users}`, `frontend/src/lib/api.ts`, `frontend/src/types/`
**Files scanned:** ~14 read directly this session (release_review_handler.go,
release_review_query_repository.go, release_review_query_cursor.go, review_service.go
(excerpt), authz_permissions.go (excerpt), effective_rights.go (excerpt),
release_review_handler_test.go (excerpt), release_review_query_repository_test.go (excerpt),
ReleaseReviewsSection.tsx, releaseReviews.ts, api.ts (excerpt), page.tsx (review detail),
UserDetailPageClient.tsx (excerpt), ReviewDelegationSection.tsx, FansubEditSecondaryTabs.tsx) —
all cross-referenced against 141-RESEARCH.md's own independent file:line evidence, not
re-derived from scratch.
**Pattern extraction date:** 2026-08-26
