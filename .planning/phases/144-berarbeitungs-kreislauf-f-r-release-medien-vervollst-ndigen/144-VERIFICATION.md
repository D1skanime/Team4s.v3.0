---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
verified: 2026-09-02T15:40:40Z
status: gaps_found
score: 17/18 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Changing category to a non-preview-allowed value while is_preview_candidate is true still returns PREVIEW_NOT_ALLOWED_FOR_CATEGORY (no silent bypass)"
    status: partial
    reason: >
      The guard `rvmCategoryAllowsPreview` (both PATCH in
      admin_content_release_version_media.go and the new PUT replace endpoint in
      admin_content_release_version_media_replace.go) only fires when the REQUEST body
      explicitly sets is_preview_candidate=true. It does not consult the row's CURRENT
      is_preview_candidate value. Because the frontend's buildSelectedItemSavePayload only
      includes isPreviewCandidate in the payload when the admin actually touches that
      control, the ordinary "fix only the category" admin action on a row that is already
      is_preview_candidate=true (e.g. previously screenshot+preview, rejected for an
      unrelated reason, resubmitted with category changed to fun_outtake/other) omits
      is_preview_candidate from the request, skips the guard, and reaches the repository's
      UPDATE ... COALESCE($4, is_preview_candidate) statement. Live-reproduced in the
      running dev Postgres: this exact UPDATE (executed inside a rolled-back transaction
      against a real row) is rejected by the DB's own CHECK constraint
      chk_rvm_preview_category, which the handler does not catch — it falls through to
      the generic `writeInternalErrorResponse` 500 "interner serverfehler"/"Patch
      fehlgeschlagen." response instead of the documented 422
      PREVIEW_NOT_ALLOWED_FOR_CATEGORY. No invalid data is ever persisted (the DB
      constraint is a real safety net — this is NOT a data-integrity or security bypass),
      but the admin cannot complete "fix only the category" in this specific state without
      being told to also touch the preview flag; they see an unexplained 500 instead.
    artifacts:
      - path: "backend/internal/handlers/admin_content_release_version_media.go"
        issue: "Lines 885-893: rvmCategoryAllowsPreview guard only runs when isPreviewCandidate != nil && *isPreviewCandidate — never checks relationMeta's existing preview state when the request omits the field"
      - path: "backend/internal/handlers/admin_content_release_version_media_replace.go"
        issue: "Lines 172-180 and 308-314: identical guard gap, same root cause, in the new PUT replace endpoint"
    missing:
      - "Guard must also fire when the row's CURRENT is_preview_candidate is true and categoryPatch.Category is being changed to a non-preview-allowed value, even though the request does not touch is_preview_candidate — e.g. by loading relationMeta with its own IsPreviewCandidate field and checking it in addition to the request-supplied value"
      - "Or: catch the CHECK constraint violation from the repository and translate it to the documented 422 PREVIEW_NOT_ALLOWED_FOR_CATEGORY response, so the admin gets an explainable error even without a pre-check"
---

# Phase 144: Überarbeitungs-Kreislauf für Release-Medien vervollständigen — Verification Report

**Phase Goal:** Ein abgelehntes Release-Medium lässt sich in derselben Zeile korrigieren — Datei
ersetzen und/oder Kategorie ändern, statt neu hochzuladen — und der Prüfer sieht beim erneuten
Vorlegen, dass es sich um die überarbeitete Fassung seiner eigenen Ablehnung handelt, nicht um
eine fremde neue Einreichung.

**Verified:** 2026-09-02T15:40:40Z
**Status:** gaps_found
**Re-verification:** No — initial verification

**Requirement mapping:** ROADMAP.md itself declares `Requirements: TBD (UAT-06, 143-UAT.md — kein
v1.4-Requirement-Mapping)` for this phase, and REQUIREMENTS.md has no phase-144 entries (confirmed
by grep — the only "144" hits in REQUIREMENTS.md are unrelated QUAL-07 text). This is by design,
not an omission: the phase closes a live-UAT finding (UAT-06 from Phase 143's UAT), not a v1.4
catalog requirement. No orphaned requirement IDs exist to reconcile.

## Goal Achievement

### Observable Truths

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|----------|
| 1 | 144-01 | Admin can change category via PATCH without CATEGORY_CHANGE_NOT_ALLOWED | ✓ VERIFIED | `parseRVMCategoryPatchField` (admin_content_release_version_media_category.go) wired at handler line 859; old 422 block removed; `TestPatchReleaseVersionMediaAllowsCategoryChange` + `TestReleaseVersionMedia_CategoryChangeAllowed` pass in a freshly rebuilt container |
| 2 | 144-01 | Changing category to non-preview-allowed while is_preview_candidate is true still returns PREVIEW_NOT_ALLOWED_FOR_CATEGORY (no silent bypass) | ✗ PARTIAL (see gap) | Guard only checks the REQUEST's is_preview_candidate field, not the row's current DB state; live-reproduced via direct SQL against a real row that the resulting UPDATE hits a DB CHECK constraint instead of the documented 422 — no data corruption, but wrong error surfaced |
| 3 | 144-01 | Handler/repository files stay within documented pre-phase budgets (1148/680 lines) | ✓ VERIFIED | `admin_content_release_version_media.go` = 1146 lines (under budget), `release_version_media_repository.go` = 681 lines (+1, within tolerance) |
| 4 | 144-02 | Replacing file changes media_asset_id without a new row (id preserved) | ✓ VERIFIED | `TestReleaseVersionMediaReplaceFilePreservesIdentityAndResetsLifecycle` passes against real Postgres (id=601 stays 601, media_asset_id 701→702, relation count unchanged) |
| 5 | 144-02 | Replace on rejected row bumps source_revision by 1, resets review_state to pending | ✓ VERIFIED | Same test: `lifecycle.SourceRevision == 2`, `review_state == 'pending'`, `decided_at == nil` after replace |
| 6 | 144-02 | Old media_asset_id's files enqueued into release_review_file_delete_jobs exactly once, safe against double enqueue | ✓ VERIFIED | `TestReleaseVersionMediaReplaceFileHandlesPriorFile` — two enqueue calls for the same asset produce `jobCount == 2` for the 2 real media_files rows, `ON CONFLICT (media_file_id) DO NOTHING` confirmed in source and exercised |
| 7 | 144-02 | Replace never creates a point_ledger_entries row or changes archivist badge count | ✓ VERIFIED | `TestReleaseVersionMediaReplaceFileDoesNotCreditPoints` and `TestReleaseVersionMediaReplaceFileArchivistCountUnchanged` pass against real Postgres with `loadContribArchivistCount` |
| 8 | 144-03 | Detail() exposes who/when/why for the immediately preceding revision's rejection when source_revision > 1 | ✓ VERIFIED | `TestReleaseReviewQueryDetailIncludesPriorRejection` — 3 subtests (own rejection, other reviewer, first submission) all pass against real Postgres after rebuild |
| 9 | 144-03 | No prior rejection → field absent, not empty object | ✓ VERIFIED | Same test's "first-time submission returns nil PriorRejection" subtest; `omitempty` on `PriorRejection *ReleaseReviewPriorRejection` confirmed in repository struct and OpenAPI (`nullable: true`, not required at the Detail level) |
| 10 | 144-04 | User with ActionReleaseVersionMediaUpdate can replace file | ✓ VERIFIED | Handler reuses `h.permissionSvc.CanForReleaseVersionMedia(..., permissions.ActionReleaseVersionMediaUpdate, ...)` and `h.canMutateReleaseVersionMediaRelation` verbatim (code trace, admin_content_release_version_media_replace.go:84-122) |
| 11 | 144-04 | User with only Upload (no update) rights denied replacing someone else's relation, same 403 shape as PATCH | ~ WEAKLY TESTED (code trace VERIFIED) | Same shared gate function as PATCH/DELETE, which IS behaviorally tested elsewhere; but the new endpoint's own test (`TestReplaceReleaseVersionMediaFileRequiresUpdatePermission`) is a source-substring assertion, not an httptest call — pre-existing WR-02 pattern flagged in 144-REVIEW.md, not a new gap |
| 12 | 144-04 | Same multipart file-intake guards apply identically to replace | ✓ VERIFIED | Code trace confirms identical `rvmMaxFileSizeBytes`, `rvmAllowedMIMETypes`, `rvmMaxImageWidth/Height`, 40MP decompression-bomb check, `rvmMaxGIFFrames` reused from the same package-level vars as upload (lines 182-243) |
| 13 | 144-04 | Endpoint atomically updates metadata + swaps file + enqueues cleanup + bumps lifecycle, all-or-nothing | ✓ VERIFIED | Single `BeginTx`/`defer tx.Rollback`/explicit `tx.Commit` wraps PatchReleaseVersionMedia, ReplaceReleaseVersionMediaFile, EnqueueReleaseVersionMediaFileDeleteJob, SubmitMedia; every failure branch calls `cleanupNewFiles()` before returning (lines 292-424) |
| 14 | 144-05 | Frontend caller can invoke PUT .../media/:relationId/file with file + optional fields, get ReleaseVersionMediaItem back | ✓ VERIFIED | `replaceReleaseVersionMediaFile()` in api.ts mirrors `uploadReleaseVersionMedia`'s shape, uses `authorizedUploadXhr({method:'PUT', ...})`; `AuthorizedUploadXhrOptions.method` plumbed through `xhr.open(options.method ?? "POST", ...)` |
| 15 | 144-05 | Rejection-category label vocabulary defined exactly once | ✓ VERIFIED | `RELEASE_REVIEW_REJECTION_CATEGORY_LABELS` single definition in releaseReviewPresentation.ts, imported (not redefined) by ReleaseVersionMediaSection.tsx |
| 16 | 144-06 | Rejected+editable item drawer shows category Select + file-replace drop-zone + caption; non-rejected/non-editable shows neither | ✓ VERIFIED | Behavioral test `'zeigt Kategorie-Auswahl und Datei-ersetzen-Kontrolle nur für abgelehnte, editierbare Medien'` renders the real component and asserts presence/absence via `getByLabelText`/`queryByLabelText` — test passes |
| 17 | 144-06 | Primary button reads "Erneut einreichen" (disabled, no changes) / "Überarbeitung einreichen" (enabled, staged change) for rejected item | ✓ VERIFIED | Behavioral test fires a real file-input change event and asserts button label + disabled state transitions — passes |
| 18 | 144-06 | Staged file → replaceItem; category/caption-only (no file) → patchItem | ✓ VERIFIED | Behavioral test asserts `replaceItem` called with the file and `patchItem` NOT called (and vice versa) via real click/submit simulation — passes |
| 19 | 144-07 | Resubmitted item's detail page shows "Überarbeitet" badge + context line naming who rejected the prior revision and why | ✓ VERIFIED | 3 behavioral tests render the real page with a mocked `prior_rejection` API response and assert the badge text + context-line content via `screen.findByText` — pass |
| 20 | 144-07 | Context line differs for own-rejection vs. other-reviewer rejection | ✓ VERIFIED | Two separate tests assert `deiner eigenen Ablehnung` vs `zuvor von Mika abgelehnt` phrasing — pass |
| 21 | 144-07 | Queue/list row shows compact badge for pending, resubmitted items, no new fetch | ✓ VERIFIED | `ReleaseReviewsSection.tsx:327` renders `releaseReviewResubmissionBadge()` gated on `item.status === 'pending' && item.source_revision > 1`, using only already-fetched `ReleaseReviewQueueItem` fields |
| 22 | 144-07 | No second ad-hoc status-formatting block outside releaseReviewPresentation.ts | ✓ VERIFIED | `grep -rn "rejected_by_current_actor\|zuvor von .* abgelehnt\|deiner eigenen Ablehnung"` across `frontend/src/app/admin/fansubs/` (excluding tests) returns only `releaseReviewPresentation.ts` |

**Score:** 21 fully verified + 1 partial (weakly-tested-but-code-confirmed #11, counted toward passing since the underlying gate is verified by trace and by other tests) out of 22 discrete truths across the 7 plans → collapsed to **17/18 plan-level must-have statements** (one PLAN-level must-have, #2 above, genuinely fails).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/internal/handlers/admin_content_release_version_media_category.go` | parseRVMCategoryPatchField + rvmCategoryAllowsPreview helpers | ✓ VERIFIED | 37 lines, wired into PATCH handler |
| `backend/internal/repository/release_version_media_repository.go` (Category field) | ReleaseVersionMediaPatchInput.Category + SQL SET clause | ✓ VERIFIED | Confirmed at lines 320-326 |
| `backend/internal/repository/release_version_media_replace_repository.go` | ReplaceReleaseVersionMediaFile + EnqueueReleaseVersionMediaFileDeleteJob (min 30 lines) | ✓ VERIFIED | 104 lines, both methods present and correct |
| `backend/internal/repository/release_version_media_replace_repository_test.go` | Real-Postgres integration tests | ✓ VERIFIED | 4 tests, all pass against real Postgres (rebuilt container + fresh disposable DB) |
| `backend/internal/repository/release_review_query_repository.go` | ReleaseReviewPriorRejection struct + Detail population | ✓ VERIFIED | Struct + JOIN LATERAL wiring confirmed, 3 real-Postgres subtests pass |
| `backend/internal/handlers/admin_content_release_version_media_replace.go` | ReplaceReleaseVersionMediaFile HTTP handler (min 80 lines) | ✓ VERIFIED | 448 lines, atomic transaction, all guards present |
| `frontend/src/lib/api.ts` | replaceReleaseVersionMediaFile() | ✓ VERIFIED | Confirmed at line 7497 |
| `frontend/src/app/admin/fansubs/releaseReviewPresentation.ts` | RELEASE_REVIEW_REJECTION_CATEGORY_LABELS + releaseReviewResubmissionBadge() | ✓ VERIFIED | Both present, single source of truth |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` | replaceItem hook action | ✓ VERIFIED | Correctly throws on error (unlike the unrelated runUpload — see CR-01 discussion below) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` | drop-zone, three-state button, staged-file routing | ✓ VERIFIED | 739 lines (pre-phase baseline documented as already 671, over CLAUDE.md's 450-line cap before this phase started — growth of 68 lines is the phase's own acknowledged, budgeted, and explained addition, not a new violation introduced from a compliant baseline) |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaReplaceControls.tsx` | category Select field, extracted component | ✓ VERIFIED | 37 lines, uses only @/components/ui primitives (Select, FormField), zero ESLint warnings |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| admin_routes.go | ReplaceReleaseVersionMediaFile handler | `PUT .../media/:relationId/file` | ✓ WIRED | Line 170 |
| PATCH handler | admin_content_release_version_media_category.go | parseRVMCategoryPatchField/rvmCategoryAllowsPreview | ✓ WIRED | Lines 859, 886 |
| replace_repository.go | release_version_media.media_asset_id | `SET media_asset_id = $2` | ✓ WIRED | Confirmed + exercised by real-Postgres test |
| replace_repository.go | release_review_file_delete_jobs | `ON CONFLICT (media_file_id) DO NOTHING` | ✓ WIRED | Confirmed + exercised (double-enqueue test) |
| release_review_query_repository.go (Detail) | review_decisions/review_reason_texts/members | LEFT JOIN LATERAL, `source_revision - 1` | ✓ WIRED | Confirmed + exercised by 3-subtest real-Postgres test |
| replace handler | replace_repository.go methods | `h.mediaRepo.ReplaceReleaseVersionMediaFile(ctx...)` | ✓ WIRED | Lines 364, 375 |
| replace handler | ActionReleaseVersionMediaUpdate | `h.canMutateReleaseVersionMediaRelation(...)` | ✓ WIRED | Lines 84, 109-122 |
| ReleaseVersionMediaSection.tsx | releaseReviewPresentation.ts | RELEASE_REVIEW_REJECTION_CATEGORY_LABELS import | ✓ WIRED | Confirmed |
| ReleaseVersionMediaSection.tsx | ReleaseVersionMediaReplaceControls.tsx | `<ReleaseVersionMediaReplaceControls ...>` | ✓ WIRED | Line 684 |
| handleSaveSelectedItem | media.replaceItem() | `await media.replaceItem(selectedItem.id, saveOp.payload)` | ✓ WIRED | Line 324, both real-DOM tests pass |
| reviewer page.tsx | releaseReviewResubmissionBadge() / resolvePriorRejectionContextLine() | function calls | ✓ WIRED | Lines 251, 276 |
| ReleaseReviewsSection.tsx | source_revision > 1 badge | existing queue-item fields | ✓ WIRED | Line 327, no new fetch |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|---------------------|--------|
| ReleaseReviewDetail.prior_rejection | `priorRejection` | `LEFT JOIN LATERAL review_decisions` scoped to `source_revision - 1` | Yes — real Postgres rows, confirmed by 3-subtest test with distinct own/other/absent fixtures | ✓ FLOWING |
| ReleaseVersionMediaItem after replace | `media.items` (via setItems map) | `replaceReleaseVersionMediaFile()` → backend response `item` from `loadReleaseVersionMediaResponseItem` (real DB re-read after commit) | Yes — handler reloads the row post-commit rather than returning a static echo | ✓ FLOWING |
| Reviewer badge/context line | `detail.prior_rejection` | Backend Detail() response, no client-side fabrication | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Backend builds cleanly | `go build ./...` (freshly rebuilt container) | no output, exit 0 | ✓ PASS |
| Backend replace-repository invariants | `go test ./internal/repository/... -run ReleaseVersionMediaReplaceFile` (real Postgres) | 4/4 pass | ✓ PASS |
| Backend prior-rejection Detail() query | `go test ./internal/repository/... -run ReleaseReviewQueryDetailIncludesPriorRejection` (real Postgres) | 3/3 subtests pass | ✓ PASS |
| Backend handlers package (category patch + replace endpoint + all pre-existing RVM tests) | `go test ./internal/handlers/...` | 45/45 pass | ✓ PASS |
| `go vet ./...` | vet | clean | ✓ PASS |
| Frontend component/behavioral tests for 144-06/144-07 | `vitest run ReleaseVersionMediaSection.test.tsx page.test.tsx [id]/edit/page.test.tsx` | 64/64 pass | ✓ PASS |
| Frontend api.ts + fansubs suite | `vitest run src/lib/api.test.ts src/app/admin/fansubs` | 263/263 pass | ✓ PASS |
| Frontend typecheck | `tsc --noEmit` | clean | ✓ PASS |
| Frontend ESLint (touched files) | `eslint ...` | 0 errors, 10 warnings (all pre-existing native-input warnings on the already-legacy-exempted ReleaseVersionMediaSection.tsx file; ReleaseVersionMediaReplaceControls.tsx clean) | ✓ PASS (no new errors) |
| **Guard-bypass edge case (live SQL repro)** | `UPDATE release_version_media SET category=COALESCE('fun_outtake',category), is_preview_candidate=COALESCE(NULL,is_preview_candidate) WHERE id=1` (exact PatchReleaseVersionMedia SQL, rolled back) against a real row with `is_preview_candidate=true` | `ERROR: new row ... violates check constraint "chk_rvm_preview_category"` | ✗ FAIL (confirms the gap — DB blocks the bad write, but handler doesn't translate this into the documented 422) |

### Requirements Coverage

No REQUIREMENTS.md entries map to Phase 144 (roadmap explicitly states `Requirements: TBD (UAT-06,
143-UAT.md — kein v1.4-Requirement-Mapping)`). Each plan instead cites its "Zielbild N
(144-CONTEXT.md)" goal as its requirement anchor. All four Zielbild goals from 144-CONTEXT.md are
addressed:

| Zielbild | Plans | Status |
|----------|-------|--------|
| 1. Datei ersetzen, id bleibt, source_revision springt, Lifecycle → pending | 144-02, 144-04, 144-05, 144-06 | ✓ SATISFIED |
| 2. Kategorie im selben Formular änderbar | 144-01, 144-06 | ⚠ PARTIALLY SATISFIED — works in the common case; fails with a confusing 500 in the specific edge case documented in the gap above |
| 3. Prüfer sieht überarbeitete Fassung der eigenen Ablehnung | 144-03, 144-07 | ✓ SATISFIED |
| 4. Alte Datei sauber behandelt, nicht verwaist | 144-02, 144-04 | ✓ SATISFIED |

No orphaned requirement IDs (none were expected).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/internal/handlers/admin_content_release_version_media_replace.go` | 198, 224 | `"gross"` instead of `"groß"` (Sprachqualität, CLAUDE.md) | ⚠️ Warning | New file this phase created copies forward a pre-existing Sprachqualität violation from the reused upload guard sequence (also flagged as WR-01 in 144-REVIEW.md, still unresolved) |
| `backend/internal/handlers/admin_content_release_version_media.go` | 193, 336, 359 | Same `"gross"`/`"geprueft"` pattern, pre-existing | ⚠️ Warning | Pre-existing debt this phase did not introduce but also did not clean up while touching the same file |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/useReleaseVersionMedia.ts` | 117-247 (`runUpload`) | Swallowed upload error, no re-throw (144-REVIEW.md CR-01) | ℹ️ Info for THIS phase (CRITICAL for the file overall) | Confirmed by direct read: `runUpload`'s catch block sets state but never re-throws, unlike `patchItem`/`replaceItem`/`deleteItem`/`reorderItems` in the SAME file, which all correctly `throw`. This bug is isolated to the FIRST-upload path (`startUpload`/`retryUpload`), a pre-existing helper this phase extended (added `replaceItem` alongside it) but did not introduce the swallow into and does not reuse for the replace/category-change flows this phase's own truths require. `replaceItem` (used by the resubmission flow) and `patchItem` (used by the category-only fix) both correctly propagate errors to `handleSaveSelectedItem`'s catch block, confirmed by code read and by the passing behavioral tests. **This finding does not block any of Phase 144's own must-haves** — it is a real, unresolved CRITICAL defect in a sibling function of a file this phase touched, and should be fixed, but it governs the unrelated "upload a brand-new file, before any rejection ever happened" flow, not the revision loop this phase built. |
| `frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMediaSection.tsx` | whole file | 739 lines, over CLAUDE.md's 450-line cap | ℹ️ Info | Pre-existing violation (671 lines before this phase per 144-06-PLAN.md's own stated baseline); this phase added 68 lines while explicitly trying to minimize growth and extracting what it could (category Select) into a new sibling component. Not a new violation from a compliant baseline — documented and rationalized in the plan itself. |

### Human Verification Required

None. All must-haves are either mechanically verifiable via code trace, real-Postgres integration
tests, or real-DOM behavioral tests, and were verified as such. No visual/UX/real-time items remain
that require a human tester — Phase 144 does not touch anything (styling, animation, cross-device
layout) that would need a live browser check beyond what the passing behavioral test suite already
exercises.

### Gaps Summary

One genuine gap, isolated to a single, specific edge case within Zielbild 2 (category change):

**The PREVIEW_NOT_ALLOWED_FOR_CATEGORY guard (both the existing PATCH endpoint from 144-01 and the
new PUT replace endpoint from 144-04) only inspects the REQUEST body's `is_preview_candidate`
field, never the row's actual current state.** Since the admin frontend (`buildSelectedItemSavePayload`)
only sends `isPreviewCandidate` when the admin explicitly changes it, a rejected item that is
currently `is_preview_candidate=true` and gets ONLY its category changed to a non-preview-allowed
value (fun_outtake/other) skips the application-level guard entirely. Live SQL reproduction against
the real dev database confirms the resulting write is rejected by the database's own
`chk_rvm_preview_category` CHECK constraint — **so no invalid data is ever actually persisted, and
this is not a data-integrity or security bypass** — but the Go handler does not catch this specific
constraint violation, so the admin sees a generic, unhelpful `500 interner serverfehler` /
"Patch fehlgeschlagen." instead of the documented, actionable `422 PREVIEW_NOT_ALLOWED_FOR_CATEGORY`.
In this specific state, the admin literally cannot complete the "just fix the category" resubmission
this phase's Zielbild 2 promises, without first knowing (undocumented, not surfaced by the UI) that
they must also uncheck the preview flag.

This is a narrow but real functional gap against the phase's own stated must-have text. It is
**not** related to the separately-known CR-01 finding (upload-error-swallowing in `runUpload`),
which is confirmed unrelated to this phase's replace/patch flows (both `replaceItem` and `patchItem`
correctly throw and are correctly awaited/caught by `handleSaveSelectedItem`).

**This looks intentional only in the narrow sense that the DB-level safety net was clearly a
deliberate design choice (chk_rvm_preview_category predates this phase) — but the specific gap
(missing 422 translation / missing pre-check against the row's actual current preview state) does
not look like a deliberate scope decision by either 144-01 or 144-04's plan.** If the team judges
this edge case acceptable to ship as-is (DB integrity is protected; only the error message is
wrong), the appropriate path is an explicit override, not silent acceptance:

```yaml
overrides:
  - must_have: "Changing category to a non-preview-allowed value while is_preview_candidate is true still returns PREVIEW_NOT_ALLOWED_FOR_CATEGORY (no silent bypass)"
    reason: "DB CHECK constraint chk_rvm_preview_category prevents the invalid state from ever being persisted; only the HTTP error code is wrong (500 instead of 422) in this specific edge case. Accepted as low-severity UX gap, not a data-integrity issue."
    accepted_by: "{name}"
    accepted_at: "{ISO timestamp}"
```

---

_Verified: 2026-09-02T15:40:40Z_
_Verifier: Claude (gsd-verifier)_
