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
| **Backend full suite** | **UNATTAINABLE as an unqualified gate — see "Backend Gate Qualification" below.** There is no single `go test ./...` (or bare `./internal/repository/...`) invocation that returns green, with or without a DSN. |
| **Backend DSN-gated run** | `docker run --rm --network team4s_default -v /home/d1sk/team4s:/workspace -v team4s-phase143-go-mod:/go/pkg/mod -v team4s-phase143-go-build:/root/.cache/go-build -w /workspace/backend -e TEAM4S_PHASE128_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase128_test?sslmode=disable' golang:1.25-alpine go test <package(s)> -run <Test> -count=1` — documented project pattern (see `.planning/phases/130-.../130-02-PLAN.md`, `129-VERIFICATION.md`, `142-UAT.md`): ephemeral `golang:1.25-alpine` container joined to the `team4s_default` compose network, DSN derived from the backend container's own `DATABASE_URL` (`postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_v2?sslmode=disable`) with the database name swapped for the throwaway fixture `team4s_phase128_test`. |
| **Measured baseline (2026-09-01, HEAD)** | Frontend: 58 failed, 2088 passed, 1 skipped, 3 todo, 11 uncaught errors (2150 total) across the 17 files named in CONTEXT.md Kriterium 1. Backend `./internal/repository/...`: 36 failures without any DSN — 35 of them are `t.Fatalf("%s is required for Phase-128 PostgreSQL tests", ...)` from `backend/internal/testsupport/phase128_postgres.go:27` (the DSN-gate calls `t.Fatal`, not `t.Skip`, so it fails hard rather than skipping), the 36th (`TestEvaluateMemberMutationConflictBlocksLastActiveManager`) is an unrelated pre-existing logic failure. Supplying `TEAM4S_PHASE128_TEST_DSN` clears the 35 Fatal-DSN failures but does not turn the package green — 20 further pre-existing failures remain, unrelated to this phase: `TestEvaluateMemberMutationConflictBlocksLastActiveManager` (1), `TestLoadContributionBadgesPostgres*` (4), `TestGetOwnDashboardPostgres*` (5), `TestLoadRoleVolumeBadgesPostgres*` (2), `TestPhase134Matrix*` (8, require a live server + Keycloak reachable at the tunnel address, unreachable from an isolated test container). `backend/internal/migrations/...` has its own, separate DSN-Fatal set (`TEAM4S_PHASE134_MIGRATION_DSN` for `TestPhase134MigrationFreshUpDownProof`, which additionally must point at the `postgres` maintenance database, not the throwaway DB itself; plus 4 more `TestPhase128Migration*` tests gated on `TEAM4S_PHASE128_TEST_DSN`). None of this baseline is Phase-143 regression — all measured directly against HEAD before this phase's execution. |
| **Estimated runtime** | ~90s frontend full suite; backend package-scoped/`-run`-filtered commands are seconds each |

---

## Backend Gate Qualification (replaces "full backend suite")

A bare `go test ./...` or bare `go test ./internal/repository/...` can never be used as a wave/pre-verify
gate for this phase, for two independent reasons, both measured against HEAD before any Phase-143 change:

1. **DSN-Fatal, not DSN-Skip.** `backend/internal/testsupport/phase128_postgres.go` calls `t.Fatalf`
   when `TEAM4S_PHASE128_TEST_DSN` is unset (35 tests in `internal/repository`, 4 more in
   `internal/migrations`), and `backend/internal/migrations/fresh_proof_test.go` does the same for
   `TEAM4S_PHASE134_MIGRATION_DSN`. Rewriting these to `t.Skip` is out of scope for this phase — the
   fix here is procedural: supply the DSN via the **Backend DSN-gated run** command above wherever a
   gate specifically needs to exercise that test set.
2. **DSN alone does not turn the package green.** Even with `TEAM4S_PHASE128_TEST_DSN` supplied,
   `internal/repository` still has 20 further pre-existing failures unrelated to Phase 143 (listed in
   the Measured Baseline row above), and `internal/migrations` needs a second, differently-shaped DSN
   pointed at a maintenance database. These are knowingly excluded from this phase's gates — not chased,
   not waived as "phase debt," simply pre-existing and out of scope.

**Backend pass condition for this phase (replaces "full suite green"):** for every backend criterion
(2, 3, 4, 5, 7), the gate is `go build ./...` succeeds AND a `-run`-filtered `go test` invocation naming
only this phase's own new/changed tests passes (exact filters are already present in each plan's
task-level `<automated>` commands and restated at each plan's wave-end `<verification>` block). This is
the same idiom Plans 143-01/143-02 already use for their own non-DSN-affected packages ("passes with the
same pass/fail set as before this plan") — applied here explicitly because the DSN-gated package cannot
support a literal before/after full-package diff.

---

## Sampling Rate

- **After every task commit:** run the vitest/go test scope touching the changed file(s) only
- **After every plan wave:** full frontend suite (`npx vitest run`) + `go build ./...` + the wave's own
  `-run`-filtered backend test set (see "Backend Gate Qualification" — no bare full-package backend run)
  + `npx eslint .`
- **Before `/gsd:verify-work`:** frontend full suite green per the Criterion 1 pass condition below;
  backend: `go build ./...` succeeds and every criterion's named `-run` filter passes; `no-restricted-syntax`
  at `error` with zero violations
- **Max feedback latency:** ~90s (frontend full suite dominates)

---

## Per-Criterion Validation Strategy

### Criterion 1 — Testsuite-Triage (17 rote Dateien, 59 Tests, 11 Errors)

- **Measurement:** full `npx vitest run`. Record exact before/after counts (failed files, failed tests,
  uncaught errors, total). Measured baseline above is the "before."
- **Pass condition:** every one of the 17 files from CONTEXT.md Kriterium 1 is green, OR is named
  explicitly in the phase SUMMARY.md with a stated reason it stays red. No file may go from green to
  red as a side effect. Note: `TestPhase136NarrowRoleDefaultsSeedToHandlerContract` was flagged in
  CONTEXT.md as an allowed pre-existing exception (migration-path mismatch); that is stale — it was
  fixed same-day in commit `fa023325` (quick task 260901-la2, renamed `phase136RepositoryRoot` to
  `phase136BackendRoot` and added `phase136RepoRoot` for the migration read) and is confirmed green
  as of this validation strategy. It is no longer an allowed exception; nothing in this phase may
  regress it.
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
- **Automated command:** `docker compose exec team4sv30-backend go test ./internal/migrations/... -run TestPhase143RoleCapabilityDefaultsResetIdempotentAndReversible -v`
  — not a bare `./internal/migrations/...` (see "Backend Gate Qualification" above: that package
  Fatal-errors without `TEAM4S_PHASE134_MIGRATION_DSN`/`TEAM4S_PHASE128_TEST_DSN` on tests unrelated
  to this criterion). The test itself forces real re-execution of 0159's raw SQL by deleting its
  `schema_migrations` tracking row between the two `Up()` calls (a bare second `Runner.Up()` call is
  a guaranteed no-op regardless of SQL content, since the runner skips already-tracked versions).

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
- **Automated command:** `go build ./...` succeeds, plus
  `docker compose exec team4sv30-backend go test ./internal/repository/... -run "TestReleaseReviewQueryRepository|TestMemberClaimsRepositoryListPendingClaimAttentionCandidates"`
  and `docker compose exec team4sv30-backend go test ./internal/handlers/... -run "TestDashboardMeHandler|TestGetOwnDashboard"`
  — not a bare `./internal/repository/...` (see "Backend Gate Qualification" above: that package
  Fatal-errors on 35 unrelated pre-existing tests without `TEAM4S_PHASE128_TEST_DSN`, and has 20 more
  pre-existing failures unrelated to this phase even with the DSN supplied).

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
- **Automated command:** `go build ./...` succeeds, plus
  `docker compose exec team4sv30-backend go test ./internal/services/... -run TestReleaseMetadataCreditServiceAwardIfCompleted -v`,
  `docker compose exec team4sv30-backend go test ./internal/repository/... -run TestUpdateAnimeFansubProjectTimelineRejectsEndBeforeCompletedRelease -v`,
  and `docker compose exec team4sv30-backend go test ./internal/handlers/... -run TestUpdateAnimeFansubProjectTimelineDeniesQualityChecker -v`
  — the `internal/repository` filter avoids the same DSN-Fatal/pre-existing-failure set noted under
  Criterion 3.

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
- **Automated command:** `go build ./...` succeeds, plus
  `docker compose exec team4sv30-backend go test ./internal/repository/... -run "TestAnimeContributionsMemberProject|TestGetMemberProjectDetail" -v` +
  `docker compose exec team4sv30-frontend npx vitest run src/app/me/projects` — not a bare
  `./internal/repository/...` (see "Backend Gate Qualification" above).

### Criterion 6 — Design-System statt nativer Elemente / Inline-Styles / roher Hex-Werte

**CORRECTED 2026-09-01 (Plan 143-12, Task 3, post-checkpoint):** the original strategy below
assumed only "~17 Altfaelle ausserhalb components/ui" existed, based on a stale code comment in
`frontend/eslint.config.mjs`. A real repo-wide measurement
(`docker compose exec team4sv30-frontend npx eslint . --rule '{"no-restricted-syntax":"error"}'
--quiet`, run 2026-09-01) found **264 violations across 67 files** (60 production files + 7 test
files, `src/components/ui/**` excluded via its own existing carve-out) still using native
`<input>`/`<select>`/`<textarea>` outside this plan's two target files. Naively flipping the base
rule to `'error'` repo-wide would have broken the lint gate for all 67 of those pre-existing files,
none of which this plan touches.

Per user decision (checkpoint, 2026-09-01, Option A): `no-restricted-syntax`'s base severity is
`'error'`, with a new **frozen, explicit, shrink-only exemption list**
(`LEGACY_NO_RESTRICTED_SYNTAX_FILES` in `frontend/eslint.config.mjs`) pinning exactly those 67
files back to `'warn'`. The list uses literal file paths, not directory globs, so a new or renamed
file is never silently exempted — only a deliberate deletion from the list (when a file is
migrated) shrinks it; nothing is ever added back. Full migration of the remaining 67 files is
tracked as a backlog item:
`.planning/todos/pending/2026-09-01-no-restricted-syntax-legacy-datei-migration.md`.

- **Measurement:** `docker compose exec team4sv30-frontend npx eslint .` (project config, respects
  the scoped ratchet override) — must report zero `no-restricted-syntax` **errors** (warnings from
  the frozen legacy list are expected and out of scope; currently the repo has 11 pre-existing
  errors from other rules, unaffected by this criterion).
  Note: the plan's originally-specified acceptance command
  (`npx eslint . --rule '{"no-restricted-syntax":"error"}' --quiet`) is **not** a valid measurement
  of the final scoped state — the `--rule` CLI flag forces a rule's severity globally and bypasses
  all `files`-scoped config overrides (including both the pre-existing `src/components/ui/**`
  carve-out and the new ratchet override), so it will always report all 264 legacy violations
  regardless of the ratchet's `'warn'` downgrade. Use `npx eslint .` (no `--rule` override) to
  observe the real, scoped-config severity.
- **Grep proof (belt-and-suspenders on top of eslint):**
  `grep -nE "<input|<select|<textarea|<button" frontend/src/app/admin/episode-versions/[versionId]/edit/ReleaseVersionMetadataFields.tsx frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx`
  must return no matches (both files must use `Input`/`Select`/`Textarea`/`Button` from
  `@/components/ui` instead).
- **Hex/inline-style proof:** `grep -nE "#[0-9a-fA-F]{3,6}|style=\{\{" frontend/src/app/me/releases/[versionId]/workspace/workspace.module.css frontend/src/app/admin/fansubs/[id]/edit/AnimeProjectTimelineSection.tsx`
  must return no matches (`.metadataError`/`.metadataSuccess` must use design tokens; the three
  inline-`style` blocks in `AnimeProjectTimelineSection.tsx` must move to CSS module classes).
- **Ratchet-scope proof:** the two files this plan retrofitted must NOT appear in
  `LEGACY_NO_RESTRICTED_SYNTAX_FILES` and must pass `npx eslint` individually with zero
  `no-restricted-syntax` findings at `'error'` severity.
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
- **Automated command:** `go build ./...` succeeds, plus
  `docker compose exec team4sv30-backend go test ./internal/repository/... -run TestReleaseReviewQueryRepositoryPendingOwnNoteRevisionAttention -v`,
  `docker compose exec team4sv30-backend go test ./internal/handlers/... -run "TestDashboardMeHandler|TestGetOwnDashboard"`, and
  `docker compose exec team4sv30-frontend npx vitest run src/app/me/dashboard` — not a bare
  `./internal/repository/...` (see "Backend Gate Qualification" above).

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
