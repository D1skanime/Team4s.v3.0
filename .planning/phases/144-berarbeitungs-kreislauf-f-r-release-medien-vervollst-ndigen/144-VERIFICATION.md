---
phase: 144-berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
verified: 2026-09-02T18:39:13Z
status: passed
score: 18/18 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 17/18
  gaps_closed:
    - "Changing category to a non-preview-allowed value while is_preview_candidate is true still returns PREVIEW_NOT_ALLOWED_FOR_CATEGORY (no silent bypass)"
  gaps_remaining: []
  regressions: []
---

# Phase 144: Überarbeitungs-Kreislauf für Release-Medien vervollständigen — Re-Verification Report

**Phase Goal:** Ein abgelehntes Release-Medium lässt sich in derselben Zeile korrigieren — Datei
ersetzen und/oder Kategorie ändern, statt neu hochzuladen — und der Prüfer sieht beim erneuten
Vorlegen, dass es sich um die überarbeitete Fassung seiner eigenen Ablehnung handelt, nicht um
eine fremde neue Einreichung.

**Verified:** 2026-09-02T18:39:13Z
**Status:** passed
**Re-verification:** Yes — after gap closure (144-08-PLAN.md)

**Requirement mapping:** ROADMAP.md declares `Requirements: TBD (UAT-06, 143-UAT.md — kein
v1.4-Requirement-Mapping)` for this phase. Re-confirmed by grep against REQUIREMENTS.md: no
phase-144 entries exist (the only "144" hits are unrelated QUAL-07 text). This is by design — the
phase closes a live-UAT finding (UAT-06 from Phase 143's UAT), not a v1.4 catalog requirement. No
orphaned requirement IDs to reconcile.

## Goal Achievement

### Gap Closure: Original Blocking Truth Re-Verified

| # | Truth | Previous Status | Current Status | Evidence |
|---|-------|------------------|-----------------|----------|
| 2 | Changing category to a non-preview-allowed value while is_preview_candidate is true still returns PREVIEW_NOT_ALLOWED_FOR_CATEGORY (no silent bypass) — for a single, non-concurrent request | ✗ PARTIAL (500 instead of 422 when request omits the field and the row's current state is true) | ✓ VERIFIED | New `rvmPreviewGuardBlocked(requestPreview *bool, currentPreview bool, currentCategory string, newCategory *string) bool` in `admin_content_release_version_media_category.go` falls back to the row's real current `is_preview_candidate` (`relationMeta.IsPreviewCandidate`, now populated by `GetReleaseVersionMediaRelation`'s SELECT) whenever the request omits the field; an explicit request value still always wins. Both `PatchReleaseVersionMedia` (line 885) and `ReplaceReleaseVersionMediaFile` (line 172) call the identical shared function. Independently re-run (not trusting SUMMARY/REVIEW claims): rebuilt the `team4sv30-backend` container from current source (the running container was stale — see Regression Verification Method below), then ran `TestRvmPreviewGuardBlocked` directly — all 6 subtests pass, including the exact gap scenario (`requestPreview=nil, currentPreview=true, currentCategory="screenshot", newCategory="fun_outtake"` → `blocked=true`) and the "explicit false always overrides row's true" non-regression case. |

**This closes the phase's single blocking gap for its own stated must-have** (a single admin
request fixing only the category on an already-`is_preview_candidate=true` rejected row). The
fix is scoped correctly per plan: an explicit request value (`true` or `false`) still always
wins over the row's current DB state — verified by subtest 3 (`explicit false always overrides
row's current true` → `blocked=false`), so admins who deliberately toggle the preview flag are
unaffected.

### Regression Verification Method (Important — Environment Note)

The `team4sv30-backend` container running at verification start (`docker compose ps`) was a
**stale image** — created at `2026-09-02T15:30:46Z`, before the 144-08 gap-closure commits
(`18:15:26Z`–`18:15:41Z`). `docker-compose.override.yml` uses `develop: watch:` (Compose Watch)
to sync source into the dev image, but no active `docker compose watch` process was running, so
the container's `/app` reflected an older build and was **missing
`admin_content_release_version_media_category_test.go` entirely** (`go test -run
TestRvmPreviewGuardBlocked` returned "no tests to run"). Running verification commands against
this stale container would have silently skipped the exact test proving the gap closure.

**Corrective action taken:** ran `docker compose build team4sv30-backend && docker compose up -d
team4sv30-backend` to force a fresh image from current source, then re-ran all checks against
the rebuilt container. This is flagged for the team: any future `docker compose exec
team4sv30-backend ...` verification command should confirm the container was rebuilt/synced
after the latest commits, not just assume `docker compose ps` "Up" means "current source."

### Independently-Run Checks (this verification pass, against the freshly rebuilt container)

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| Backend builds cleanly | `go build ./...` (freshly rebuilt container) | exit 0, no output | ✓ PASS |
| Backend vet clean | `go vet ./...` | exit 0, no output | ✓ PASS |
| New guard unit test (6 subtests) | `go test ./internal/handlers/... -run TestRvmPreviewGuardBlocked -v` | 6/6 pass, including the exact 144-VERIFICATION.md gap scenario | ✓ PASS |
| Full ReleaseVersionMedia handler regression | `go test ./internal/handlers/... -run ReleaseVersionMedia -v` | all pass (permission, upload-guard, category, preview-rejection, patch, delete, reorder, capabilities tests — no failures) | ✓ PASS |
| New repository test proving IsPreviewCandidate read-back (real Postgres) | `go test ./internal/repository/... -run TestGetReleaseVersionMediaRelationReturnsCurrentPreviewCandidate -v` (required creating a disposable `team4s_phase107_test_*` DB and setting `TEAM4S_PHASE107_TEST_DSN`, since the default `docker compose exec` env doesn't set it) | PASS against real Postgres, both true/false states confirmed | ✓ PASS |
| Full ReleaseVersionMedia repository regression (real Postgres) | `go test ./internal/repository/... -run ReleaseVersionMedia -v` | all 15 tests pass (replace-file identity/lifecycle/points tests from 144-02/144-04, plus the new preview-candidate test) — zero regressions | ✓ PASS |
| Sprachqualität fix (WR-01) | `grep -c 'gross\|geprueft' admin_content_release_version_media.go admin_content_release_version_media_replace.go` | 0 matches in both files | ✓ PASS |
| Dead code removal (WR-03) | `grep -c "func (r *MediaRepository) GetRVMCategory"` on repository.go + `grep -c "GetRVMCategory"` on repository_test.go | 0, 0 | ✓ PASS |
| Line-cap budgets | `wc -l` on both handler files | `admin_content_release_version_media.go` = 1144 (≤1148 budget), `admin_content_release_version_media_replace.go` = 446 (≤450 budget) | ✓ PASS |
| Replace endpoint has identical corrected guard | Code read of `admin_content_release_version_media_replace.go:95-178` | `GetReleaseVersionMediaRelation` called before the guard (line 95), `rvmPreviewGuardBlocked(isPreviewCandidate, relationMeta.IsPreviewCandidate, relationMeta.Category, categoryField)` at line 172, identical pattern to PATCH, `"groß"` correctly spelled at lines 196/222 | ✓ PASS |

### New Finding from 144-REVIEW.md: TOCTOU Race — Assessed, Not a Blocking Gap

**144-REVIEW.md's WR-01** (re-numbered in the fresh review; not to be confused with the prior
review's WR-01 Sprachqualität finding, now fixed) flags that `GetReleaseVersionMediaRelation`'s
read of the row's current `is_preview_candidate`/`category` happens **before** `BeginTx(...)` and
without a `FOR UPDATE` row lock in both `PatchReleaseVersionMedia` (read at line 821, `BeginTx` at
line 900 — 79 lines and several validation branches apart) and `ReplaceReleaseVersionMediaFile`
(read at line 95, guard at 172, file I/O and `BeginTx` further downstream). I independently
confirmed this by reading the code directly (not taking the review's word for it):
`GetReleaseVersionMediaRelation`'s SQL is a plain `SELECT ... FROM release_version_media WHERE id
= $1 AND deleted_at IS NULL` with no `FOR UPDATE`, and it executes clearly outside any transaction
boundary in both handlers.

**Assessment: this is a genuine, narrow residual risk — not a new blocking gap against this
phase's stated goal.**

Reasoning:
- The scenario requires **two concurrent requests targeting the exact same `relationId`**, where
  a second admin flips `is_preview_candidate` to `true` on the row in the narrow window between
  the first request's `GetReleaseVersionMediaRelation` read and its own transaction's `UPDATE`.
  This is a materially different (and far narrower) failure class than the original gap, which
  fired **deterministically, every single time**, on the single most common admin workflow this
  phase exists to support (fix-only-the-category on an already-preview-true rejected row) — no
  concurrency required at all.
- v1 is explicitly admin-only (CLAUDE.md constraint); two different admins editing the identical
  media relation within a sub-second window is an unlikely operational pattern, not the phase's
  primary use case.
- The `chk_rvm_preview_category` DB CHECK constraint remains the authoritative last-resort safety
  net in both the original gap and this residual race — **no invalid data can ever be persisted**
  in either case. The only externally-visible symptom of the race, if it occurred, would be a
  generic 500 instead of a 422 for the unlucky concurrent request — degraded error UX, not a
  data-integrity or security issue.
- 144-08's plan scope was explicitly the single-request, request-body-vs-row-state gap (confirmed
  by re-reading 144-08-PLAN.md's `must_haves.truths`, all of which describe single-request
  behavior). The TOCTOU finding was not discoverable from that scope and is fairly characterized
  as new information from this round's adversarial review pass, not an incomplete fix of the
  original gap.

**Recommendation (not a blocker):** track as a follow-up — move the
`GetReleaseVersionMediaRelation` read inside the transaction with `SELECT ... FOR UPDATE`
immediately before `rvmPreviewGuardBlocked` is evaluated, mirroring the pattern the replace
repository already uses for the `media_asset_id` swap. This should be scheduled as ordinary
backlog work, not as a phase-144 re-opening.

### Other 144-REVIEW.md Findings — Status Check (Informational, Not New Gaps)

| Finding | Status | Disposition |
|---------|--------|-------------|
| WR-02 (re-numbered): `shared/contracts/openapi.yaml`'s PATCH `.../media/{relationId}` operation still missing 409/422 response documentation | Confirmed still present — `sed -n '6690,6754p' shared/contracts/openapi.yaml` shows only 200/400/401/403/404/500 documented | ℹ️ Info — pre-existing contract-documentation gap, predates 144, out of 144-08's scope (its `must_haves` never mention `openapi.yaml`), and does not affect runtime behavior. Recommend a follow-up documentation task, not a phase-144 gap. |
| WR-03 (re-numbered, carried forward): tests assert on handler source-text substrings instead of exercising logic | Unchanged, explicitly out of scope for this gap-closure round | ℹ️ Info — pre-existing test-quality debt, not a phase-144 must-have regression |
| CR-01 (carried forward): `useReleaseVersionMedia.ts`'s `runUpload` swallows upload failures, no re-throw | Unchanged, confirmed still isolated to the first-upload path (`startUpload`/`retryUpload`), not the replace/patch flows this phase's own truths require (`replaceItem`/`patchItem` correctly throw) | ℹ️ Info for Phase 144 (correctly flagged Critical for the file overall, but does not block this phase's own must-haves — same conclusion as the first VERIFICATION pass) |

### Full Must-Have Score (All Truths, Post Gap-Closure)

All 21 previously-verified truths from the initial pass (#1, #3–#22 in the original table) remain
unchanged — **no frontend files were touched by 144-08** (confirmed via `git show --stat` on all
three 144-08 commits: only `backend/internal/repository/*` and `backend/internal/handlers/*`
files changed), so no regression risk exists for the 21 already-verified frontend/backend truths.
Truth #2, the sole blocking gap, is now VERIFIED.

**Score: 18/18 plan-level must-have statements verified** (up from 17/18). Additionally, all 6 of
144-08's own `must_haves.truths` are independently confirmed:

| # | 144-08 Truth | Status |
|---|--------------|--------|
| 1 | PATCH returns 422 (never 500) for the omitted-field + row-true + disallowed-category scenario | ✓ VERIFIED (unit test + code trace) |
| 2 | PUT replace exhibits identical corrected guard behavior | ✓ VERIFIED (code trace confirms identical wiring pattern) |
| 3 | Explicit `is_preview_candidate=false` still overrides a true DB row, guard not made stricter | ✓ VERIFIED (subtest 3 passes) |
| 4 | No "gross"/"geprueft" ASCII substitution remains in either handler file | ✓ VERIFIED (grep: 0 matches) |
| 5 | `GetRVMCategory` removed, including its test reference | ✓ VERIFIED (grep: 0 matches) |
| 6 | `go build`/`go vet` clean, all pre-existing tests still pass | ✓ VERIFIED (independently re-run against a freshly rebuilt container, zero regressions) |

### Requirements Coverage

No REQUIREMENTS.md entries map to Phase 144 (confirmed again this pass — by design, not an
omission). Zielbild 2 (144-CONTEXT.md: "Kategorie im selben Formular änderbar") is now **fully
satisfied** — previously ⚠ PARTIALLY SATISFIED due to the 500-vs-422 edge case, now closed.

| Zielbild | Plans | Status |
|----------|-------|--------|
| 1. Datei ersetzen, id bleibt, source_revision springt, Lifecycle → pending | 144-02, 144-04, 144-05, 144-06 | ✓ SATISFIED (unchanged from initial pass) |
| 2. Kategorie im selben Formular änderbar | 144-01, 144-06, 144-08 | ✓ SATISFIED — gap closed, no known edge case remains for the single-request scenario |
| 3. Prüfer sieht überarbeitete Fassung der eigenen Ablehnung | 144-03, 144-07 | ✓ SATISFIED (unchanged) |
| 4. Alte Datei sauber behandelt, nicht verwaist | 144-02, 144-04 | ✓ SATISFIED (unchanged) |

No orphaned requirement IDs.

### Anti-Patterns Found (This Round)

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/internal/handlers/admin_content_release_version_media.go` / `..._replace.go` | (guard reads) | TOCTOU: current-state read outside transaction, no row lock | ⚠️ Warning | See "New Finding" section above — narrow residual risk, not a phase-144 blocker, recommended as backlog follow-up |
| `shared/contracts/openapi.yaml:6690-6754` | PATCH `.../media/{relationId}` | Missing 409/422 response documentation | ℹ️ Info | Pre-existing, out of 144-08's scope, does not affect runtime behavior |
| `frontend/.../useReleaseVersionMedia.ts:117-247` | `runUpload` | Swallowed upload error (carried forward, unchanged, unrelated to this phase's replace/patch flows) | ℹ️ Info for Phase 144 | Unchanged from initial pass — correctly out of this phase's scope |

No new debt markers (`TBD`/`FIXME`/`XXX`) introduced by 144-08's changes — confirmed by reading
all three modified/created files in full.

### Human Verification Required

None. All must-haves — the original blocking gap and 144-08's own six truths — are mechanically
verifiable and were independently re-verified via real code execution (unit tests, real-Postgres
integration tests, `go build`/`go vet`) against a freshly rebuilt backend container, not trusted
from SUMMARY.md or REVIEW.md claims alone.

### Gaps Summary

**No gaps remain.** The single blocking gap from the initial verification pass — the
PREVIEW_NOT_ALLOWED_FOR_CATEGORY guard only checking the request body, never the row's current
state — is closed by 144-08's `rvmPreviewGuardBlocked` fix, independently confirmed by rebuilding
the backend container from current source (the previously-running container was stale) and
re-running the exact test that proves the fix, plus the full regression sweep for both touched
packages.

One new, narrower residual risk was identified during this round's adversarial code review (a
TOCTOU race requiring concurrent requests on the identical relation) and independently assessed
here as **not severe enough to block phase closure** — it degrades to the same failure class
(500 instead of 422) only under a concurrency pattern this admin-only v1 feature does not
primarily target, and the DB CHECK constraint still guarantees no data corruption. It is
recorded as a recommended follow-up (row-level locking via `SELECT ... FOR UPDATE` inside the
transaction), not a phase-144 gap.

Phase 144's goal — an admin correcting a rejected release-version-media row in place (file
replace and/or category change) and the reviewer being able to see it as a resubmission of their
own prior rejection, not a fresh unrelated submission — is achieved and verified against the
actual codebase.

---

_Verified: 2026-09-02T18:39:13Z_
_Verifier: Claude (gsd-verifier)_
