---
phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring
plan: 05
subsystem: testing
tags: [go, postgres, pgx, testify, repository, role-catalog, teststil]

# Dependency graph
requires:
  - phase: 146 (Plans 01-03)
    provides: real-Postgres test fixture harnesses (testsupport.OpenPhase145Postgres, testsupport.OpenPhase137Postgres) and the membership_baseline_registry_test.go pattern this plan's rewrites follow
  - phase: 146 (Plan 04)
    provides: the frozen 20-file SecurityRelevantTestFiles list (backend/internal/testquality/security_relevant_test_files.go) defining Block-2 scope and the presence-vs-absence violation rule (D-09)
provides:
  - hist_group_member_roles_whitelist_test.go's catalog-context and neutral-invalid-code claims now proven via real HistGroupMemberRolesRepository.RoleCodeExistsForContext calls against a migrated Phase-145 Postgres schema
  - member_claims_repository_claim_activation_test.go's role_definitions JOIN/assignable/fansub_group-context catalog guard now proven via a real MemberClaimsRepository.ResolvePendingRolesToActive call against a seeded Phase-137 Postgres schema
affects: [146-06, 146-07, 146-08, 146-09, 146-10, 146-11, 146-12, 146-13]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Repository-layer Block-2 remediation: real Postgres call replaces os.ReadFile+strings.Contains presence assertion, sanctioned absence checks (static-authority/whitelist identifiers must never reappear) stay verbatim in the same function"
    - "Seed two role_definitions rows straddling the guard predicate (one satisfying it, one not) using already-migrated production seed rows (founder/translator, techadmin/translator) instead of inventing synthetic catalog rows, to prove the guard is genuinely parameterized rather than a blanket check"

key-files:
  created: []
  modified:
    - backend/internal/repository/hist_group_member_roles_whitelist_test.go
    - backend/internal/repository/member_claims_repository_claim_activation_test.go

key-decisions:
  - "Reused testsupport.OpenPhase137Postgres (not OpenPhase145Postgres) for the ResolvePendingRolesToActive test since it is the only existing fixture that already builds member_claims, hist_fansub_group_members, fansub_group_members, and fansub_group_member_roles together with the role_definitions catalog"
  - "Picked techadmin (assignable=true, contexts includes fansub_group per migration 0112) as the eligible seed role and translator (assignable=false default, contexts=['anime_contribution'] only per migration 0085) as the ineligible seed role, both already present in the migration chain, avoiding any new fixture/migration"

requirements-completed: ["Criterion 5", "Criterion 6"]

# Metrics
duration: 12min
completed: 2026-09-04
---

# Phase 146 Plan 05: Remediate hist_group_member_roles + member_claims claim-activation Block-2 tests Summary

**Replaced 5 source-substring presence assertions across 2 locked security-relevant repository test files with real Postgres calls into RoleCodeExistsForContext and ResolvePendingRolesToActive, keeping both files' sanctioned static-authority absence checks and the 3 pre-existing skipped stubs untouched.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-09-04T16:04:00Z (approx, first Read call)
- **Completed:** 2026-09-04T16:10:10Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `TestHistGroupMemberRolesUseCatalogContext` now proves `RoleCodeExistsForContext`'s context-parameterization behaviorally: `founder` (seeded with `group_history` in `contexts`) resolves `true`, `translator` (seeded without it) resolves `false` — a genuine context-scoped lookup, not a blanket code check.
- `TestHistGroupMemberRolesKeepNeutralInvalidBehavior` now proves blank and unknown role codes resolve `(false, nil)` via a real call, rather than asserting Go source text exists.
- `TestResolvePendingRolesToActiveUsesCanonicalCatalog` now seeds a full pending-claim-activation scenario (member, app users, fansub group, fansub_group_members, member_claims verified claim, hist_fansub_group_members, two pending hist_group_member_roles rows) and proves via a real `ResolvePendingRolesToActive` call plus a follow-up read that only the catalog-eligible role (`techadmin`: assignable + `fansub_group` context) activates while the ineligible role (`translator`: not assignable, wrong context) does not.

## Task Commits

Each task was committed atomically:

1. **Task 1: Remediate hist_group_member_roles_whitelist_test.go** - `99a3bd2f` (test)
2. **Task 2: Remediate member_claims_repository_claim_activation_test.go's presence assertions** - `760e7baa` (test)

**Plan metadata:** (this commit, see final_commit below)

## Files Created/Modified
- `backend/internal/repository/hist_group_member_roles_whitelist_test.go` - Replaced 4 source-substring presence assertions across both test functions with real `HistGroupMemberRolesRepository.RoleCodeExistsForContext` calls; kept the 3-item static-authority absence loop unchanged.
- `backend/internal/repository/member_claims_repository_claim_activation_test.go` - Replaced 3 source-substring presence assertions in `TestResolvePendingRolesToActiveUsesCanonicalCatalog` with a real seeded-Postgres `ResolvePendingRolesToActive` call and result verification; kept the static-authority absence check and the 3 pre-existing `t.Skip` stubs (`TestVerifyClaimActivatesRoles_*`) unchanged; `TestResolvePendingRolesToActive_ExistsOnRepository` (reflect-based signature check, not the forbidden pattern) also unchanged.

## Decisions Made
- Reused `testsupport.OpenPhase137Postgres` for Task 2 rather than building a new fixture: it is the only existing harness that already assembles `members`, `app_users`, `fansub_groups`, `fansub_group_members`, `hist_fansub_group_members`, `member_claims`, `fansub_group_member_roles`, and the migrated `role_definitions` catalog needed by `ResolvePendingRolesToActive`'s full multi-table query.
- Chose already-seeded production role codes (`founder`/`translator` for Task 1, `techadmin`/`translator` for Task 2) as the eligible/ineligible catalog pair instead of inserting synthetic test-only `role_definitions` rows, keeping both tests anchored to real migration-seeded data rather than inventing parallel fixtures.

## Deviations from Plan

None functionally — both production methods (`RoleCodeExistsForContext`, `ResolvePendingRolesToActive`) were used exactly as documented in the plan's `<interfaces>` section with no code changes to production files.

One acceptance-criteria clarification worth recording: Task 1's literal acceptance-criteria grep (`grep -A25 ... | grep -c "strings.Contains(source"` expected to return `0`) in fact returns `1` after remediation, because the sanctioned absence loop the plan's own `<behavior>` section explicitly requires keeping "unchanged" (`if strings.Contains(source, forbidden) { t.Fatalf(...) }`) itself contains the literal substring `strings.Contains(source` — the grep pattern cannot distinguish a kept absence check from a removed presence check by text alone. Verified precisely instead via `grep -n "!strings.Contains(source" hist_group_member_roles_whitelist_test.go` returning zero matches — confirming no negated/presence-style source-substring behavioral assertion remains in the function, consistent with `security_relevant_test_files.go`'s own presence-vs-absence violation rule (D-09) and CLAUDE.md's Teststil exception 1.

## Issues Encountered
- First draft of Task 2's seed inserted a `fansub_group_members` row without an explicit `id` and hit a NOT NULL violation (`fansub_group_members.id` is a plain `BIGINT PRIMARY KEY`, not a serial/identity column, per `testsupport/phase137_postgres.go`'s fixture schema). Fixed by supplying an explicit id (`801`) — no production code involved, pure test-fixture correction.

## User Setup Required

None - no external service configuration required. Both real-Postgres verification runs used the existing `team4s_phase145_test_146` and `team4s_phase137_test_1` fixture databases on the shared dev Postgres container (`team4sv30-db`, reached via `TEAM4S_PHASE145_TEST_DSN`/`TEAM4S_PHASE137_TEST_DSN` inside the Docker network) — no new provisioning was needed. No `go` binary is available on the host PATH; all `go build`/`go vet`/`go test`/`gofmt` verification commands were run via `docker exec team4sv30-backend`.

## Next Phase Readiness
Two of the 20 locked Block-2 security-relevant files are now fully remediated (2/20 file-level; overall Block-2 progress tracked across Plans 146-04 through 146-12). Plans 146-06 through 146-12 remain, touching a disjoint set of files, and can proceed independently. No blockers.

---
*Phase: 146-registry-selbstschutz-und-sanierung-der-quelltext-substring*
*Completed: 2026-09-04*
