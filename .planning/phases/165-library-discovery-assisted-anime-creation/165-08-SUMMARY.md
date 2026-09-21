---
phase: 165-library-discovery-assisted-anime-creation
plan: 08
subsystem: frontend
tags: [nextjs, react, admin-anime-create, discovery, anisearch, jellyfin, duplicate-guard]

# Dependency graph
requires:
  - phase: 165-03
    provides: "CreateAnime save-time anisearch:<id> re-check (409, confirm_duplicate bypass) consumed here as the D-20 second trigger"
  - phase: 165-05
    provides: "buildAssistedCreateRedirectPath, DiscoveryEntryCard, DiscoveryReturnLink"
  - phase: 165-13
    provides: "Enrich() ForceNew bypass, consumed by the force_new retry wired in this plan"
provides:
  - "useCreatePageDiscoveryHandoff — D-08 auto-adopt-once + D-09/D-26 AniSearch-prefill hook"
  - "AniSearchDuplicateDecision — Verbinden/Als-neu-anlegen/Wechseln decision UI, fires at both D-02 (selection-time) and D-20 (save-time) trigger points"
  - "D-23 fix: loadAniSearchDraftByID no longer hard-navigates via window.location.href on a duplicate hit"
  - "Discovery-assisted post-create redirect (buildAssistedCreateRedirectPath) wired end to end on the Create page, gated by isDiscoveryFlow/returnURL"
affects: [165-09, 165-12]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Auto-adopt-once/prefill-once logic kept in a new sibling hook file (useCreatePageDiscoveryHandoff.ts) instead of growing an already-oversized controller, mirroring 165-05's precedent"
    - "Conflict-aware ApiError: a shared buildCreateAnimeConflictAwareApiError helper attaches the 409 redirect payload onto ApiError.conflict so callers can branch on it instead of losing the payload in the generic error path"
    - "submitCreate({confirmDuplicate}) extraction lets both the regular form submit and the D-20 confirmed-retry share one payload-building/validation path"

key-files:
  created:
    - frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.ts
    - frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.test.ts
    - frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx
    - frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.test.tsx
  modified:
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts
    - frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts
    - frontend/src/app/admin/anime/create/createAniSearchControllerHelpers.ts
    - frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx
    - frontend/src/app/admin/anime/create/page.tsx
    - frontend/src/app/admin/anime/create/page.test.tsx
    - frontend/src/types/admin.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/api/admin-anime-intake.ts
    - frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts

key-decisions:
  - "handleCreateSubmit was refactored into submitCreate({confirmDuplicate}) so the D-20 'Als neuen Anime anlegen' second-trigger click can resubmit the actual save (not reload the AniSearch draft) with confirm_duplicate:true, distinct from the D-23/165-13 ForceNew retry used at the first (selection-time) trigger point."
  - "AniSearchDuplicateDecision exposes one onCreateAsNew prop; CreateAniSearchIntakeCard chooses which controller handler to bind to it (handleAniSearchCreateAsNew vs handleConfirmedDuplicateCreate) based on conflict.viaSaveTimeRecheck, per UI-SPEC's note that the exact resubmission mechanism is a backend/planning decision, not part of the UI contract."
  - "useAdminAnimeCreateController takes a new optional options argument ({isDiscoveryFlow, returnURL}) instead of a handleCreateSubmit parameter, since the redirect branch needs the flag at hook-initialization time (query params are read once in page.tsx via useSearchParams)."

requirements-completed: [REQ-165-08, REQ-165-09]

# Metrics
duration: ~25min
completed: 2026-09-21
---

# Phase 165 Plan 08: Create-Page Discovery Integration Summary

**Wires the Discovery hand-off end to end on the Create page: auto-adopt + AniSearch-prefill via a new sibling hook, a real Verbinden/Als-neu-anlegen/Wechseln decision UI that fires at both AniSearch-selection and save-time trigger points, the D-23 hard-navigation bug fix, and the assisted post-create redirect branch — all with the manual/direct create flow provably byte-identical.**

## Performance

- **Duration:** ~25 min
- **Tasks:** 3 completed
- **Files modified:** 14 (4 created, 10 modified)

## Accomplishments

- **D-08/D-09 (Task 1):** `useCreatePageDiscoveryHandoff` auto-adopts a `?jellyfin_id=` candidate exactly once (ref-guarded, works even if the caller doesn't memoize `adoptCandidate`) and prefills — never auto-runs — the AniSearch search field with the Jellyfin series name, only when the field is still empty. Zero imports from `useAdminAnimeCreateController.ts`, so the already-1451-line controller needed zero changes for this behavior.
- **D-23 fix (Task 2):** `loadAniSearchDraftByID` no longer executes `window.location.href = resolved.redirect.redirectPath` on a duplicate hit — it only sets `aniSearchConflict`, so the conflict decision UI can actually render instead of being raced by a full-page navigation (live-reproduced bug: AniSearch-ID 2788 → Naruto #4, adopted Jellyfin draft was silently discarded before this fix). Exactly one `window.location.href` call site remains in the file (the untouched D-10 manual redirect).
- **D-23/165-13 ForceNew retry (Task 2):** `loadAniSearchDraftByID` accepts `{ forceNew }` and sends `force_new` in the enrichment request; `handleAniSearchCreateAsNew` re-triggers it for the conflicting ID, consuming 165-13's backend bypass to load the real draft instead of re-hitting the same conflict.
- **D-20 save-time second trigger (Task 2):** `handleCreateSubmit` is now backed by `submitCreate({ confirmDuplicate })`. A 409 from the 165-03 CreateAnime guard is detected via a new `extractAniSearchCreateConflict` helper and sets the same `aniSearchConflict` state with `viaSaveTimeRecheck: true` instead of the generic error path — no draft field is lost, the submit button returns to its clickable state. `handleConfirmedDuplicateCreate` resubmits with `confirm_duplicate: true`.
- **Assisted redirect branch (Task 2):** the post-create redirect now branches on a new `isDiscoveryFlow`/`returnURL` hook option: `buildAssistedCreateRedirectPath` for Discovery-originated creates, `buildManualCreateRedirectPath` (byte-identical, regression-tested) otherwise.
- **AniSearchDuplicateDecision extraction (Task 3):** new `@/components/ui`-only component replaces the old link-only conflict branch in `CreateAniSearchIntakeCard.tsx` with the full decision: "Mit bestehendem Anime verbinden" (only with an active Jellyfin candidate) → "Als neuen Anime anlegen" → "Zum vorhandenen Anime wechseln", plus the D-20 context line and the D-13 consequence text. Verbinden calls `applyAdminAnimeMetadataFromJellyfin` directly and swaps to a `role="status"` success line on success.
- **Create-page wiring (Task 3):** `page.tsx` now reads `jellyfin_id`/`from`/`return` via `useSearchParams()` (client-component pattern, mirroring `AdminUsersClient.tsx`), is `useCreatePageDiscoveryHandoff`'s only call site, passes `isDiscoveryFlow`/`returnURL` into the controller, renders `DiscoveryEntryCard` above the provider grid and `DiscoveryReturnLink` near the header.

## Task Commits

Each task was committed atomically:

1. **Task 1: Discovery auto-adopt + AniSearch-prefill hook** - `c181f690` (feat)
2. **Task 2: Controller wiring (D-23 fix, ForceNew retry, D-20 second trigger, assisted redirect)** - `befcb34b` (fix)
3. **Task 3: AniSearchDuplicateDecision extraction + Create-page rendering** - `90b0ab24` (feat)

**Plan metadata:** (this commit, to follow)

## Files Created/Modified

- `frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.ts` — new: auto-adopt-once + AniSearch-prefill sibling hook (D-08/D-09/D-26)
- `frontend/src/app/admin/anime/create/useCreatePageDiscoveryHandoff.test.ts` — new: 5 tests via real `renderHook` effect execution
- `frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.tsx` — new: the Verbinden/Als-neu-anlegen/Wechseln decision component
- `frontend/src/app/admin/anime/create/AniSearchDuplicateDecision.test.tsx` — new: 5 tests (button set/order per active-candidate state, connect success, save-time context line, create-as-new in-flight state)
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.ts` — D-23 deletion, `loadAniSearchDraftByID({forceNew})`, `handleAniSearchCreateAsNew`, `submitCreate({confirmDuplicate})`/`handleCreateSubmit`/`handleConfirmedDuplicateCreate` split, `extractAniSearchCreateConflict`, assisted-redirect branch, new `UseAdminAnimeCreateControllerOptions` hook argument
- `frontend/src/app/admin/anime/create/useAdminAnimeCreateController.test.ts` — 16 new hook-execution tests (`renderHook` against mocked `@/lib/api`/`@/lib/api/admin-anime-intake`) covering all 6 of Task 2's required behaviors, alongside the pre-existing 10 pure-function tests
- `frontend/src/app/admin/anime/create/createAniSearchControllerHelpers.ts` — added optional `viaSaveTimeRecheck` to `CreateAniSearchConflictState`
- `frontend/src/app/admin/anime/create/CreateAniSearchIntakeCard.tsx` — replaces the old conflict branch with `<AniSearchDuplicateDecision>`, adds `activeJellyfinSeriesID`/`onCreateAsNew`/`onConfirmDuplicateCreate` props
- `frontend/src/app/admin/anime/create/page.tsx` — `useSearchParams()`, `useCreatePageDiscoveryHandoff` call site, `DiscoveryEntryCard`/`DiscoveryReturnLink` rendering, controller options, new props threaded into `CreateAniSearchIntakeCard`
- `frontend/src/app/admin/anime/create/page.test.tsx` — `next/navigation`/`./useCreatePageDiscoveryHandoff` mocks, 3 new wiring tests
- `frontend/src/types/admin.ts` — `AdminAnimeAniSearchCreateRequest.force_new?`, `AdminAnimeCreateRequest.confirm_duplicate?`
- `frontend/src/lib/api.ts` — widened `ApiError.conflict`, new `buildCreateAnimeConflictAwareApiError` (shared by `createAdminAnime` and `createAdminAnimeFromJellyfinDraft`)
- `frontend/src/lib/api/admin-anime-intake.ts` — `createAdminAnimeFromJellyfinDraft` now uses the shared conflict-aware error builder (Rule 2 deviation, see below)
- `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts` — narrowed the widened `ApiError.conflict` back to the edit-route shape at its one call site (Rule 1 fix for the type regression the widening caused)

## Decisions Made

- **submitCreate({confirmDuplicate}) split instead of a second parallel submit function.** `handleCreateSubmit(event)` now just calls `submitCreate({})`; `handleConfirmedDuplicateCreate()` calls `submitCreate({ confirmDuplicate: true })`. This keeps the payload-building/validation logic in exactly one place for both the regular form submit and the D-20 confirmed retry.
- **AniSearchDuplicateDecision takes one `onCreateAsNew` prop; the caller (CreateAniSearchIntakeCard) picks the handler.** Per UI-SPEC's note that "die genaue Bestätigungskennzeichnung des Requests ist eine Backend-/Planungsentscheidung, nicht Teil dieses UI-Vertrags" — the component itself stays agnostic to *which* retry mechanism fires; `CreateAniSearchIntakeCard` binds `handleAniSearchCreateAsNew` (ForceNew AniSearch reload) for the first trigger point and `handleConfirmedDuplicateCreate` (confirmed save retry) for the D-20 second trigger, selected via `conflict.viaSaveTimeRecheck`.
- **`useAdminAnimeCreateController` takes a new optional `{ isDiscoveryFlow, returnURL }` argument** rather than threading the discovery flag through `handleCreateSubmit`'s call signature, since `page.tsx` already knows both values at hook-initialization time from `useSearchParams()`, and threading them as hook options keeps `handleCreateSubmit`'s existing `(event)` signature — and every existing call site — untouched.
- **`DiscoveryEntryCard` rendered as a sibling above `providerGrid`, not inside it** — matches the plan's literal wording ("above the existing `providerGrid` block") and keeps the existing 2-column AniSearch/Jellyfin grid layout unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] `createAdminAnimeFromJellyfinDraft` (admin-anime-intake.ts) also needed conflict-aware 409 parsing**
- **Found during:** Task 2, while wiring the D-20 catch handler in `submitCreate`
- **Issue:** The plan's `files_modified` list for Task 2 only lists `frontend/src/lib/api.ts` for the conflict-aware `ApiError`, but `submitCreate` calls `createAdminAnime` (via `createManualAnimeAndRedirect`) only when no Jellyfin preview is adopted — `createAdminAnimeFromJellyfinDraft` (in `frontend/src/lib/api/admin-anime-intake.ts`, not in the plan's file list) is used instead whenever a Jellyfin preview *was* adopted, which is the common case for the Discovery-assisted flow this plan implements (D-08 auto-adopts a Jellyfin candidate). Without the same conflict-aware 409 parsing in that function, the D-20 must-have truth ("A second collision surfacing at the actual save click ... renders the identical decision block") would silently fail to work whenever a Jellyfin preview was active — i.e. in the primary Discovery scenario this plan exists to support.
- **Fix:** Extracted the conflict-aware error construction into a single exported `buildCreateAnimeConflictAwareApiError(response)` in `lib/api.ts` (used by `createAdminAnime`) and reused it from `createAdminAnimeFromJellyfinDraft` in `admin-anime-intake.ts`, since both functions POST to the same `/api/v1/admin/anime` endpoint and are subject to the identical 165-03 save-time guard.
- **Files modified:** `frontend/src/lib/api/admin-anime-intake.ts` (not in this task's `files_modified` list).
- **Verification:** `useAdminAnimeCreateController.test.ts`'s D-20 test exercises the `createAdminAnime` path (manual, no Jellyfin preview adopted); the shared helper is the same code path `createAdminAnimeFromJellyfinDraft` now calls, verified by direct code inspection and `tsc --noEmit`/`eslint` passing clean on both files.
- **Committed in:** `befcb34b` (Task 2 commit)

**2. [Rule 1 - Bug] Widening `ApiError.conflict`'s type broke `useAniSearchEditEnrichment.ts`'s stricter typed state**
- **Found during:** Task 2, `tsc --noEmit` after widening `ApiError.conflict` to `AdminAnimeAniSearchEditConflictResult | AdminAnimeAniSearchCreateConflictResult | null`
- **Issue:** `createAniSearchEditFailureState` (edit-route hook, not in this plan's scope) assigned `error.conflict` directly into a field statically typed as `AdminAnimeAniSearchEditConflictResult | null` — a type-checking regression caused directly by this plan's `lib/api.ts` change.
- **Fix:** Narrowed the assignment with `error.conflict?.mode === 'conflict' ? error.conflict : null` — `loadAdminAnimeEditAniSearchEnrichment` (the only caller `createAniSearchEditFailureState` serves) never produces the `mode: "redirect"` variant, so this is a type-only fix with zero behavior change.
- **Files modified:** `frontend/src/app/admin/anime/hooks/useAniSearchEditEnrichment.ts` (not in this task's `files_modified` list).
- **Verification:** `npx tsc --noEmit` clean (only the pre-existing, documented `page.ts` route-type issue remains); `useAniSearchEditEnrichment.test.ts`'s existing 5 tests pass unmodified.
- **Committed in:** `befcb34b` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing-functionality, 1 bug)
**Impact on plan:** Both were necessary for correctness — #1 makes the D-20 must-have truth actually hold in the realistic Discovery flow (Jellyfin preview adopted); #2 fixes a type regression this plan's own `lib/api.ts` change caused. No unrelated scope creep.

## Issues Encountered

- `frontend/src/app/admin/anime/create/page.tsx` was already 506 lines (over CLAUDE.md's 450-line production-file ceiling) before this plan touched it, and this plan's additive wiring (useSearchParams, DiscoveryEntryCard/DiscoveryReturnLink rendering, 3 new props into CreateAniSearchIntakeCard) grew it to 542 lines. Splitting `page.tsx`'s existing `detailsSection`/`assetsSection` JSX into sub-components was out of this plan's declared task scope (3 tasks, none of which called for a page.tsx structural refactor) and would be an unplanned architectural change (Rule 4 territory). Logged to `deferred-items.md` with a suggested follow-up rather than performed here.
- `@testing-library/user-event` is not an installed dependency in this project — `AniSearchDuplicateDecision.test.tsx` was written with `fireEvent` from `@testing-library/react` instead, matching the codebase's existing convention (confirmed via `grep -rln fireEvent src/app/admin`).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- 165-09 (Discovery List Page) can now link into `/admin/anime/create?jellyfin_id=X&from=discovery&return=Y` and expect the full auto-adopt/prefill/conflict-decision/assisted-redirect pipeline to work end to end.
- 165-12 (episodes/edit-page `DiscoveryReturnLink` wiring) is unaffected — this plan only touched the Create page's own return-link rendering.
- No blockers.

## Known Stubs

None — all wired behaviors have real data sources; no hardcoded empty/placeholder values were introduced.

## Threat Flags

None — this plan's new surface (`AniSearchDuplicateDecision`'s `applyAdminAnimeMetadataFromJellyfin` call, the `force_new`/`confirm_duplicate` client flags) is already covered by the plan's own `<threat_model>` (T-165-15/16/17), all `accept`-dispositioned as admin-only, reversible, and non-disclosing beyond what the pre-existing `Enrich()` conflict flow already exposed.

---
*Phase: 165-library-discovery-assisted-anime-creation*
*Completed: 2026-09-21*

## Self-Check: PASSED

All 14 created/modified source files plus this SUMMARY.md and `deferred-items.md`
confirmed present on disk; all 3 task commits (`c181f690`, `befcb34b`, `90b0ab24`)
confirmed present in `git log`.
