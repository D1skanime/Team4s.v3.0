---
phase: 143
slug: phase-142-nacharbeit-und-dashboard-lane-f-r-abgelehnte-notiz
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-09-01
---

# Phase 143 — Validation Strategy

> Authored directly from the seven ROADMAP.md success criteria plus 143-CONTEXT.md's verified
> file paths, line numbers, SQL excerpts and failing-test names. No researcher spawn — this is a
> remediation phase against a code review whose findings are already located and quoted in
> CONTEXT.md. No requirement IDs exist for this phase (explicit — remediation, not v1.4 scope);
> the per-criterion map below cites the ROADMAP criterion number instead of REQ-XX.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Frontend framework** | vitest 3.x, config `frontend/vitest.config.ts` |
| **Frontend quick run** | `docker compose exec team4sv30-frontend npx vitest run <path>` |
| **Frontend full suite** | `docker compose exec team4sv30-frontend npx vitest run` |
| **Frontend lint** | `docker compose exec team4sv30-frontend npx eslint .` |
| **Backend framework** | `go test`, no separate config file |
| **Backend quick run** | `docker compose exec team4sv30-backend go test ./internal/<pkg>/... -run <Test>` |
| **Backend full suite** | `docker compose exec team4sv30-backend go test ./...` |
| **Measured baseline (2026-09-01, HEAD)** | Frontend: 58 failed, 2088 passed, 1 skipped, 3 todo, 11 uncaught errors (2150 total) across the 17 files named in CONTEXT.md Kriterium 1. Backend: `./internal/repository/...` currently FAILs (pre-existing, unrelated to this phase's new work — baseline to preserve/improve, not regress). |
| **Estimated runtime** | ~90s frontend full suite; backend package-scoped runs are faster, full `./...` not yet timed |

---

## Sampling Rate

- **After every task commit:** run the vitest/go test scope touching the changed file(s) only
- **After every plan wave:** full frontend suite (`npx vitest run`) + full backend suite (`go test ./...`) + `npx eslint .`
- **Before `/gsd:verify-work`:** both full suites green, per the exceptions named in Criterion 1 below; `no-restricted-syntax` at `error` with zero violations
- **Max feedback latency:** ~90s (frontend full suite dominates)

---

## Per-Criterion Validation Strategy

### Criterion 1 — Testsuite-Triage (17 rote Dateien, 59 Tests, 11 Errors)

- **Measurement:** full `npx vitest run`. Record exact before/after counts (failed files, failed tests,
  uncaught errors, total). Measured baseline above is the "before."
- **Pass condition:** every one of the 17 files from CONTEXT.md Kriterium 1 is green, OR is named
  explicitly in the phase SUMMARY.md with a stated reason it stays red (e.g. the pre-existing
  `TestPhase136NarrowRoleDefaultsSeedToHandlerContract` migration-path mismatch, which CONTEXT.md
  already flags as out-of-scope). No file may go from green to red as a side effect.
- **Specific sub-checks:**
  - Contract-drift: `shared/contracts/openapi.yaml` `PublicMemberBadge.next_tier` enum and
    `frontend/src/types/__tests__/v12-projection-contract.test.ts:276` expectation must agree
    (both list the same tier set — decide which side is correct, then align the other).
  - Missing provider: `FansubAppMembersOverview.tsx:154` consumers must resolve
    `useRoleCatalog` without throwing — test tree wraps with `RoleCatalogProvider`.
- **Automated command:** `docker compose exec team4sv30-frontend npx vitest run`

### Criterion 2 — Migration 0154 Ersatz

- **Measurement:** apply the new migration's `.up.sql` twice in sequence against a test/ephemeral
  database and assert the second application is a no-op (idempotent — no error, no row-count
  change). Then apply `.down.sql` and assert it reverses to the pre-migration state that resolves
  migration 0153 (not the current 0154 down, which is an empty `BEGIN;COMMIT;` and does nothing).
- **Pass condition:** `role_capabilities` row count is identical before the 1st and after the 2nd
  `up` application; after `down`, the techadmin capabilities inserted by 0153 remain present
  (they must NOT be deleted by the down, unlike current 0154 behavior which wipes and
  re-inserts everything including techadmin rows).
- **Concrete baseline:** live DB is at migration 158, `role_capabilities` has 259 rows.
- **Automated command:** run via `backend database/migrations` test harness (`testsupport` package
  already applies the full migration chain per-test-schema — reuse that path) or a targeted
  `go test` against the new migration pair.

### Criterion 3 — Roh-SQL im Handler → Repository-Layer

- **Measurement:** one test per moved method. `attachPendingClaimAttention` behavior already routes
  through `MemberClaimsRepository` — its move (if any) needs a repository-level test.
  `attachPendingGroupMediaReviewAttention` and `attachPendingReleaseReviewAttention` currently have
  zero tests (CONTEXT.md Kriterium 3) — each needs one after the move to
  `ReleaseReviewQueryRepository`.
- **Self-exclusion rule check:** after the move, the self-exclusion predicate (
  `lifecycle.submitter_app_user_id <> $1 AND NOT EXISTS (... member_claims own_claim ...)`,
  quoted verbatim in CONTEXT.md Kriterium 3) must exist in exactly one place in the codebase —
  `release_review_query_repository.go`. Verify with
  `grep -rn "submitter_app_user_id <>" backend/internal/` returning exactly one match location
  (ignoring test files), not one in the handler and one in the repository.
- **Permission check correction:** `attachPendingGroupMediaReviewAttention` must check a review
  action, not `permissions.ActionFansubGroupEdit` — test asserts a user with review rights but
  without group-edit rights still sees the attention item.
- **Memoization check:** test asserts the permission lookup is called once per distinct group/user
  pair, not once per row (N+1 check — e.g. via a call-counting fake/spy on the permission checker).
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/repository/... ./internal/handlers/...`

### Criterion 4 — Fokus-Tests für ungetestete neue Logik

- **`ReleaseMetadataCreditService.AwardIfCompleted`:** first test file for this service. Must cover
  the ambiguous lookup `FROM release_variants rv JOIN release_versions rev ON rev.id =
  rv.release_version_id WHERE rv.id = $1 OR rev.id = $1 ORDER BY rv.id LIMIT 1` — construct a
  fixture where a `release_variants.id` and a `release_versions.id` collide (or are adjacent in the
  same ID space) and assert which row is actually credited, documenting the resolved behavior
  (query does not need to change unless the test proves it silently picks the wrong row).
- **`FansubNotesRepository.UpdateAnimeFansubProjectTimeline` date validation:** test the "Ende nicht
  vor einem bereits abgeschlossenen Release" rule directly (not just the existing 403-only test
  `TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker`, which also hits the wrong route
  `/project-timeline` instead of `/timeline` — fix the route in that test too).
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/services/... ./internal/repository/...`

### Criterion 5 — `has_own_notes` zählt abgelehnte Notiz nicht als erledigt

- **Backend measurement:** repository test on
  `anime_contributions_member_project_repository.go:139-145` — fixture with a `release_version_notes`
  row whose lifecycle `review_state = 'rejected'`; assert `has_own_notes` is `false` for that
  release (current query has no review-state filter, so today it returns `true`).
- **Frontend measurement:** test on `isDone()` in
  `frontend/src/app/me/projects/[animeId]/group/[fansubGroupId]/page.tsx:53` — a release with only
  a rejected note (`has_own_notes` now `false` per the backend fix) must return `isDone() === false`,
  which also flips the "X offen · Y erledigt" counter and the "Offen" filter visibility.
- **No special-casing needed for `tombstoned`:** confirm via existing cleanup repository behavior
  (`release_review_cleanup_repository.go` sets `deleted_at`) that a tombstoned note is already
  excluded by the `deleted_at IS NULL` clause — add a test asserting this stays true, not new logic.
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/repository/...` +
  `docker compose exec team4sv30-frontend npx vitest run src/app/me/projects`

### Criterion 6 — Design-System statt nativer Elemente / Inline-Styles / roher Hex-Werte

- **Measurement:** `docker compose exec team4sv30-frontend npx eslint .` with `no-restricted-syntax`
  raised from `warn` to `error` in `frontend/eslint.config.mjs` — must exit 0 (currently the repo
  has 11 pre-existing errors and 333 warnings from other rules; this criterion is specifically
  about the `no-restricted-syntax` rule reaching zero violations, not the whole lint budget).
- **Grep proof (belt-and-suspenders on top of eslint):**
  `grep -nE "<input|<select|<textarea|<button" frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx`
  must return no matches (both files must use `Input`/`Select`/`Textarea`/`Button` from
  `@/components/ui` instead).
- **Hex/inline-style proof:** `grep -nE "#[0-9a-fA-F]{3,6}|style=\{\{" frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx`
  must return no matches (`.metadataError`/`.metadataSuccess` must use design tokens; the three
  inline-`style` blocks in `AnimeProjectTimelineSection.tsx` must move to CSS module classes).
- **Automated command:** `docker compose exec team4sv30-frontend npx eslint .`

### Criterion 7 — Dashboard-Lane für abgelehnte Notizen

- **Backend measurement:** aggregation test on the repository method(s) added under Criterion 3
  (`ReleaseReviewQueryRepository` extension, reusing `ListReleaseVersionNotesForMember`'s existing
  `ReviewState`/`RejectionCategory`/`RejectionReason` join) — fixture with rejected notes across two
  different anime projects and two different fansub groups; assert the result is grouped per
  anime-project + fansub-group, not one card per note.
- **No-new-query assertion:** `dashboard_me_handler.go` must not gain a new `h.db.Query(...)` call
  for this feature — verify by diff/grep that the handler only calls the Criterion-3 repository
  method(s); this directly restates ROADMAP Criterion 7's "ohne eigene Handler-Query" constraint as
  a checkable condition (`grep -c "h.db.Query" backend/internal/handlers/dashboard_me_handler.go`
  does not increase from its pre-phase count).
- **Frontend measurement:** rendering test asserting rejected notes appear under "Braucht deine
  Aufmerksamkeit", grouped per anime-project/fansub-group, each item showing episode/Folge,
  Notiztitel, and a link to `/me/releases/{versionId}/workspace?tab=notes`; only
  `review_state = 'rejected'` renders, never `tombstoned`.
- **Contract sync check:** backend DTO, frontend TypeScript type, and `shared/contracts/openapi.yaml`
  must describe the same shape — no field present in one but not the others.
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/repository/... ./internal/handlers/...` +
  `docker compose exec team4sv30-frontend npx vitest run src/app/me/dashboard`

---

## Wave 0 Requirements

*None. Existing infrastructure (vitest, go test, eslint) covers all phase criteria — no new test
framework, config, or shared fixture setup is needed.*

---

## Manual-Only Verifications

*None. All seven criteria have automated verification (test command, eslint command, or grep
assertion) as detailed above.*

---

## Validation Sign-Off

- [x] All criteria have an automated verify command
- [x] Sampling continuity: every criterion maps to a runnable command, no gaps
- [x] Wave 0: none required — existing infrastructure suffices
- [x] No watch-mode flags used anywhere above (`vitest run`, not `vitest watch`)
- [x] Feedback latency ~90s, within budget
- [x] `nyquist_compliant: true` — confirmed by gsd-plan-checker's re-verification pass: every task
      in all 14 plans carries an automated verify command, no watch-mode flags, no Wave-0 MISSING
      markers

**Approval:** approved 2026-09-01
