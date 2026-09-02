---
phase: 144
slug: berarbeitungs-kreislauf-f-r-release-medien-vervollst-ndigen
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-09-02
---

# Phase 144 — Validation Strategy

> Authored directly from 144-CONTEXT.md's "Zielbild" (4 numbered goals) and 144-UI-SPEC.md's three
> interaction surfaces, plus direct code inspection of the existing media/review/points code this
> phase touches — no researcher spawn. Phase 144 has no requirement IDs yet (ROADMAP.md lists
> `Requirements: TBD`); this is feature work, not a bug fix — three design decisions are explicitly
> open in CONTEXT.md ("Offene Entscheidungen für die Planung") and the plans must resolve them, not
> skip past them. Each block below cites the Zielbild point number instead of REQ-XX.
>
> **Grounding facts found in code (not restated in CONTEXT.md, load-bearing for the plans):**
> - `PatchReleaseVersionMedia` (`backend/internal/handlers/admin_content_release_version_media.go:789`)
>   already calls `ReleaseReviewLifecycleRepository.SubmitMedia` on every metadata patch — the
>   source-revision-bump + lifecycle-reset-to-pending pattern Zielbild 1 asks for **already exists**
>   for caption/preview-candidate changes. The gap is specifically: (a) no route replaces the file
>   itself, and (b) category is explicitly rejected — see next point.
> - The same handler (line ~851) **currently hard-blocks** category changes: `if _, hasCategory :=
>   rawBody["category"]; hasCategory { ... "error_code": "CATEGORY_CHANGE_NOT_ALLOWED" }`. Zielbild 2
>   requires removing/replacing this block, not adding new plumbing from scratch.
> - Permission model to reuse (open decision "Wer darf ersetzen?" in CONTEXT.md is **answered by
>   existing code**): `permissions.ActionReleaseVersionMediaUpdate` +
>   `canMutateReleaseVersionMediaRelation` (`admin_content_release_version_media.go:629`), which
>   checks platform-admin OR active fansub-group membership via
>   `ListReleaseVersionMediaContributorGroupIDs`. No new action code is needed unless the plan finds a
>   concrete reason the existing one is wrong for file replacement specifically.
> - Points/credit call sites: `creditReleaseReviewContribution` is invoked from exactly two places,
>   both in `backend/internal/services/release_review_adapters.go` (lines 126 and 228), both inside an
>   `if decision == ReviewDecisionConfirm` branch. `SubmitMedia`/`SubmitNote` never call it. The
>   archivist counter (`loadContribArchivistCount`,
>   `backend/internal/repository/member_profile_contribution_badges_repository.go:156-170`) filters on
>   `ma.status = 'ready'`, `v.name = 'public'`, `rs.code = 'approved'`, `rvm.deleted_at IS NULL`. The
>   replace path must not add a third call site and must not change what that query matches.
> - `admin_content_release_version_media.go` is already 1148 lines; `release_version_media_repository.go`
>   is 680. Per CLAUDE.md's 450-line cap, new replace-file logic belongs in new files, not appended to
>   either.
> - No existing "resubmission" / "Überarbeitet" indicator exists anywhere in
>   `frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx` today (`grep` for
>   `source_revision|Überarbeitet|revision` only matches the existing `expected_revision:
>   detail.source_revision` conflict-guard at line 152). UI-SPEC surface 3 is a genuinely new element,
>   not a rename of something present.

---

## Test Infrastructure

Identical to Phase 143 (same repo, same day — re-measure only if a later phase changes this).

| Property | Value |
|----------|-------|
| **Frontend framework** | vitest 3.x, config `frontend/vitest.config.ts` |
| **Frontend quick run** | `docker compose exec team4sv30-frontend npx vitest run <path>` |
| **Frontend full suite** | `docker compose exec team4sv30-frontend npx vitest run` |
| **Frontend lint** | `docker compose exec team4sv30-frontend npx eslint .` (base severity `error`, frozen legacy-file exemption list in `frontend/eslint.config.mjs`. **Correction (post plan-checker, 2026-09-02):** `ReleaseVersionMediaSection.tsx` **is** on `LEGACY_NO_RESTRICTED_SYNTAX_FILES` (`frontend/eslint.config.mjs:81`, severity `warn`) — it already has 3 pre-existing native-`<input>` findings (checkboxes + file-picker; `@/components/ui` has no `Checkbox`/`FileInput` primitive) that are structurally permanent, not simple migration debt. This phase's new file-replace drop-zone adds a 4th native `<input type="file">`, mirroring the existing upload drop-zone. Gate for this file: no *new violation category* (`<select>`/`<textarea>`) is introduced — do NOT require "zero `no-restricted-syntax` findings" for it. The reviewer detail page (`.../reviews/[reviewId]/page.tsx`) is genuinely not on the legacy list and must stay at zero findings.) |
| **Backend framework** | `go test`, no separate config file |
| **Backend quick run** | `docker compose exec team4sv30-backend go test ./internal/<pkg>/... -run <Test>` |
| **Backend full suite gate** | **Not usable unqualified** — see "Backend Gate Qualification" (carried over from 143-VALIDATION.md, still true against current HEAD). |
| **Backend DSN-gated run** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -v team4s-phase143-go-mod:/go/pkg/mod -v team4s-phase143-go-build:/root/.cache/go-build -w /workspace/backend -e TEAM4S_PHASE128_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase128_test?sslmode=disable' golang:1.25-alpine go test <package(s)> -run <Test> -count=1` |
| **Estimated runtime** | ~90s frontend full suite; scoped/`-run`-filtered backend commands are seconds each |

### Backend Gate Qualification (replaces "full backend suite")

Same two reasons as Phase 143: `internal/repository` and `internal/migrations` `Fatal` (not `Skip`)
on missing DSN env vars, and even with the DSN supplied both packages carry pre-existing failures
unrelated to any phase's own work. **Pass condition for this phase:** `go build ./...` succeeds AND
every criterion below names a `-run`-filtered `go test` invocation covering only its own new/changed
tests — never a bare `./internal/repository/...` or `./internal/migrations/...`.

---

## Sampling Rate

- **After every task commit:** run the vitest/go test scope touching the changed file(s) only
- **After every plan wave:** full frontend suite (`npx vitest run`) + `go build ./...` + the wave's own
  `-run`-filtered backend test set + `npx eslint .`
- **Before `/gsd:verify-work`:** frontend full suite green; backend `go build ./...` succeeds and every
  criterion's named `-run` filter passes; `no-restricted-syntax` at `error` with zero violations in
  `.../reviews/[reviewId]/page.tsx`; `ReleaseVersionMediaSection.tsx` must introduce no *new violation
  category* (still legacy-listed at `warn` for its existing checkbox/file-input findings — see Test
  Infrastructure table)
- **Max feedback latency:** ~90s (frontend full suite dominates)

---

## Per-Goal Validation Strategy

### Zielbild 1 — Datei ersetzen: `id` bleibt, `source_revision` springt, Lifecycle → `pending`

- **Measurement:** integration test that replaces the file on an existing `release_version_media` row
  whose lifecycle is `rejected`, then asserts three things in one fixture, not three separate
  inspections: (a) `release_version_media.id` is byte-identical before/after, (b)
  `release_version_media_review_lifecycle.source_revision` increased by exactly 1 (not "increased",
  exactly +1 — guards against double-submission bugs), (c) `review_state` is `pending` after the
  replace, having been `rejected` before.
- **Pass condition:** all three assertions hold in the same test run against a single fixture row —
  this is the whole point of the phase, per CONTEXT.md, so a test that only checks one of the three
  is insufficient.
- **Reference pattern to mirror:** `ReleaseReviewLifecycleRepository.SubmitMedia`
  (`backend/internal/repository/release_review_lifecycle_repository.go:119-170`) already does the
  revision-bump + pending-reset for metadata-only patches — the new replace path must call the same
  method (or an equivalent that produces the identical lifecycle side effect), not a parallel
  implementation.
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/repository/... -run TestReleaseVersionMediaReplaceFilePreservesIdentityAndResetsLifecycle -v` (exact test name is a
  naming contract for the plan — the executor must produce a test whose name makes this assertion
  discoverable by name, not just by reading the body).

### Zielbild 2 — Kategorie im selben Formular änderbar

- **Measurement:** test that PATCHes (or whatever verb the plan settles on for the combined
  metadata+category change) an existing relation's `category` field and asserts the row's category
  changed, with no `CATEGORY_CHANGE_NOT_ALLOWED` rejection.
- **Pass condition:** the specific hard-block at `admin_content_release_version_media.go:851-858`
  (`if _, hasCategory := rawBody["category"]; hasCategory { ...422 CATEGORY_CHANGE_NOT_ALLOWED }`) no
  longer fires for this operation. A regression test must exist proving the old 422 does NOT occur
  for a category-only change once the plan ships (a positive assertion, not just "the code was
  deleted" — deletions get silently reverted by later merges more often than assertions do).
- **Interaction with preview-candidate rule:** if category changes to something outside
  `rvmPreviewAllowedCategories` (`admin_content_release_version_media.go:55-58`,
  `screenshot`/`typesetting_karaoke` only) while `is_preview_candidate` is true on the row, the test
  must assert the existing `PREVIEW_NOT_ALLOWED_FOR_CATEGORY` guard still fires — category-change
  must not silently bypass it.
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/handlers/... -run TestPatchReleaseVersionMediaAllowsCategoryChange -v`

### Zielbild 3 — Prüfer sieht Überarbeitung, nicht fremde neue Einreichung

- **Measurement:** frontend rendering test on the reviewer detail page
  (`frontend/src/app/admin/fansubs/[id]/reviews/[reviewId]/page.tsx`) asserting that when
  `source_revision > 1` (or equivalently the lifecycle carries a prior `decided_at`/rejection), a
  "Überarbeitet" badge/indicator renders together with the **prior rejection reason** — not just a
  bare "resubmitted" label without context of what was rejected.
- **Module-reuse assertion:** the badge's label/variant must come from a function added to
  `frontend/src/app/admin/fansubs/releaseReviewPresentation.ts` (which already owns
  `releaseReviewQueueStatus`/`releaseReviewDetailStatus`), not a second ad-hoc status-formatting
  block inside the page component. Verify with `grep -c "case 'rejected'" frontend/src/app/admin/fansubs/**/*.tsx` outside `releaseReviewPresentation.ts` staying at its pre-phase count (0 today) — no
  second switch/case duplicating the status vocabulary.
- **Pass condition:** rendering test green; grep assertion holds; no new status-label literal strings
  duplicated outside the presentation module.
- **Automated command:** `docker compose exec team4sv30-frontend npx vitest run src/app/admin/fansubs`

### Zielbild 4 — Alte Datei sauber behandelt, nicht verwaist

- **Measurement:** depends on which branch of CONTEXT.md's open decision ("Alte Datei behalten oder
  verwerfen?") the plan resolves — the strategy names both, the plan picks one and the acceptance
  criteria must say which:
  - **If discarded:** assert the old `media_asset_id`/`media_file_id` is enqueued into
    `release_review_file_delete_jobs` (the existing outbox table, `database/migrations/0135_release_review_lifecycle.up.sql:124-157`) exactly once per replace, OR is deleted through whatever the
    existing single-delete path already uses — either way, prove via query that no
    `media_files`/`media_assets` row referencing the pre-replace file remains reachable from the
    `release_version_media` row after the replace, and that no duplicate delete-job row is created if
    the same relation is replaced twice.
  - **If retained:** assert the retention is queryable (e.g. a prior-file-history table/column, not a
    silently orphaned row with no FK back to the relation) and that a cleanup rule exists and is
    tested — "kept because we didn't write the delete" is not an acceptable pass condition.
- **Pass condition:** the plan's PLAN.md states explicitly which branch was chosen and why (this must
  be visible in the plan, not left implicit); the corresponding test above is green.
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/repository/... -run TestReleaseVersionMediaReplaceFileHandlesPriorFile -v`

---

## Cross-Cutting Invariants (apply across all four Zielbild goals)

### Permission — reuse, do not invent

- **Measurement:** authorization test asserting a user who has `ActionReleaseVersionMediaUpdate` for
  the relation's fansub group (via the existing `canMutateReleaseVersionMediaRelation` path) CAN
  replace the file, and a user who only has `ActionReleaseVersionMediaUpload` (upload-only, e.g. a new
  contributor without update rights) is denied with the same 403 shape the existing PATCH path uses.
- **Pass condition:** no new `permissions.Action*` constant is added for this feature unless the test
  suite demonstrates the existing `ActionReleaseVersionMediaUpdate` genuinely cannot express the
  required check (expected: it can — CONTEXT.md's "Wer darf ersetzen?" question resolves to reusing
  it plus ownership, matching Patch's existing gate at `admin_content_release_version_media.go:810`).
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/handlers/... -run TestReplaceReleaseVersionMediaFileRequiresUpdatePermission -v`

### Points invariant — replace must NOT credit or move the archivist counter

- **Measurement:** end-to-end test that replaces a file on a `rejected` relation and asserts (a)
  `creditReleaseReviewContribution` is not invoked (spy/call-count on the adapter, or equivalently: no
  row is written/changed in whatever table that function credits into), and (b)
  `loadContribArchivistCount` for the submitting member returns the same value before and after the
  replace, since the row is not `approved`+`public` at that point in its lifecycle.
- **Why this needs a real assertion and not a design-review sign-off:** CONTEXT.md itself flags this
  exact risk ("Löschen und neu hochladen kostet also keine Punkte" — the new replace path must
  preserve that property; wiring credit into `SubmitMedia`'s call path by accident, e.g. by routing
  the replace through the confirm-decision code path instead of the submit path, is the single most
  likely and most expensive mistake in this phase).
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/repository/... -run TestReleaseVersionMediaReplaceFileDoesNotCreditPoints -v` and
  `docker compose exec team4sv30-backend go test ./internal/repository/... -run TestReleaseVersionMediaReplaceFileArchivistCountUnchanged -v`

### File-size discipline (CLAUDE.md 450-line cap)

- **Measurement:** `wc -l` on every file touched or created for this phase.
- **Pass condition:** `admin_content_release_version_media.go` (already 1148 lines) and
  `release_version_media_repository.go` (already 680 lines) do not grow — new replace-file logic
  lives in new files. New files individually stay ≤450 lines.
- **Automated command:** `wc -l backend/internal/handlers/admin_content_release_version_media.go backend/internal/repository/release_version_media_repository.go` — line counts must not exceed
  their pre-phase baseline (1148 / 680).

---

## Wave 0 Requirements

*None. Existing infrastructure (vitest, go test, eslint) covers all phase goals — no new test
framework, config, or shared fixture setup is needed.*

---

## Manual-Only Verifications

| Behavior | Zielbild | Why Manual | Test Instructions |
|----------|----------|------------|--------------------|
| Full reviewer-facing live UAT walkthrough (upload → reject → replace file → resubmit → reviewer sees "Überarbeitet" with prior reason) | 1, 3 | CONTEXT.md notes the current DB only has confirmed media — no rejected fixture exists yet; the automated tests above cover each mechanism in isolation, but the end-to-end operator experience (does the resubmission genuinely read as "the same thing, fixed" to a human reviewer, not just pass assertions) needs a live pass through `http://127.0.0.1:3300` | Upload an image via the admin UI, reject it as a reviewer, replace the file from the submitter side, resubmit, confirm the reviewer detail page shows the "Überarbeitet" badge with the original rejection reason before deciding again |

---

## Validation Sign-Off

- [ ] All Zielbild goals (1-4) and both cross-cutting invariants have an automated verify command
- [ ] Sampling continuity: every criterion maps to a runnable command, no gaps
- [ ] Wave 0: none required — existing infrastructure suffices
- [ ] No watch-mode flags used anywhere above (`vitest run`, not `vitest watch`)
- [ ] Feedback latency ~90s, within budget
- [ ] `nyquist_compliant: true` — to be set once gsd-plan-checker confirms every task in every plan
      carries one of the automated verify commands above (or an equivalent it introduces with the
      same assertion strength)

**Approval:** pending
