---
phase: 139-scalable-user-admin-projections
plan: 01
subsystem: api
tags: [go, postgres, migrations, testsupport, dto, pgx]

# Dependency graph
requires:
  - phase: 137-central-effective-rights-resolver-overrides
    provides: EffectiveRightState/ResolveGroupRights foundation the F-01 rights-summary DTOs build against
  - phase: 138-effective-rights-administration-impact-ux
    provides: existing admin_users.go DTO family (AdminUserContributionsResult/AdminMediaItemSummary) this plan extends additively
provides:
  - "New grouped/paginated Go DTOs (AdminUserContributionsPage/AdminUserMediaPage/AdminUserRightsSummaryPage and their nested types) that every later Phase-139 backend plan (139-03 contributions, 139-04 media, 139-05 rights-summary) implements against, locking envelope/field names before any SQL is written"
  - "testsupport.OpenPhase139Postgres(t) — disposable per-test Postgres harness applying the COMPLETE real migration chain (151 pairs), not hand-assembled stand-in tables, so later plans' integration tests seed real anime_contributions/release_crew_snapshots/episodes/release_version_media rows against production-shaped schema"
affects: [139-03-contributions-grouping, 139-04-media-projection, 139-05-rights-summary, 139-06-quality-gates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "AdminListMeta{Total,Limit,Offset} named shared envelope type, reused across three new paginated response DTOs (first named — vs. anonymous inline — meta struct in this file)"
    - "Full real migration chain (migrations.NewRunner(pool, migrationsDir).Up(ctx)) as a testsupport harness's prerequisite step, instead of hand-assembled stand-in CREATE TABLE SQL — first phaseNNN_postgres.go file in this codebase to do so"

key-files:
  created:
    - backend/internal/testsupport/phase139_postgres.go
  modified:
    - backend/internal/models/admin_users.go
    - database/migrations/0057_drop_release_version_groups_fansubgroup_id.up.sql
    - database/migrations/0057_drop_release_version_groups_fansubgroup_id.down.sql
    - database/migrations/0071_drop_fansub_legacy_text_fields.up.sql
    - backend/internal/migrations/fresh_proof_test.go
    - backend/internal/migrations/phase106_member_points_test.go
    - backend/internal/migrations/phase107_review_foundation_test.go
    - backend/internal/migrations/phase108_contribution_sources_test.go
    - backend/internal/migrations/phase108_project_note_lifecycle_test.go
    - backend/internal/migrations/phase109_member_point_totals_test.go
    - backend/internal/migrations/phase128_public_identity_test.go
    - backend/internal/migrations/phase136_capability_policy_catalog_test.go
    - backend/internal/migrations/phase136_role_catalog_palette_correction_test.go
    - backend/internal/migrations/phase136_role_catalog_uat_corrections_test.go
    - backend/internal/migrations/phase137_effective_rights_overrides_test.go
    - backend/internal/migrations/phase137_fansub_group_media_view_test.go
    - backend/internal/migrations/release_review_contribution_rule_test.go
    - backend/internal/migrations/release_review_lifecycle_test.go

key-decisions:
  - "Used the real, complete migration chain (migrations.NewRunner.Up) inside the new test harness rather than hand-assembling ~15+ stand-in tables, per the plan's explicit resolution of RESEARCH.md Assumption A2"
  - "Fixed migrations 0057/0071's hardcoded `public.`-qualified references (the only two migration files, out of 151, that broke under a non-public search_path) by switching to current_schemas(false)-relative checks — zero behavior change against team4s_v2, since both are already applied there"
  - "Moved 14 internal `package migrations` test files to the external `migrations_test` package to break a genuine import cycle (migrations-test -> testsupport -> migrations) introduced by testsupport now importing migrations directly — mechanical rename only, verified beforehand that none of the 14 files reference unexported migrations-package symbols or identifiers owned by files outside that set"

requirements-completed: [UADM-02, UADM-03, UADM-04, UADM-05, UADM-06, UADM-08, QUAL-06]

# Metrics
duration: 55min
completed: 2026-08-24
---

# Phase 139 Plan 01: Interface-First Foundation Summary

**New Phase-139 grouped/paginated Go DTOs land additively in admin_users.go, and a real-migration-chain disposable Postgres test harness (testsupport.OpenPhase139Postgres) now exists — unblocked from a previously-invisible schema-portability bug in two migration files and an import cycle the new harness's own dependency on the migrations package exposed.**

## Performance

- **Duration:** 55 min
- **Started:** 2026-08-24T17:18:01Z (approx, per STATE.md pre-execution timestamp)
- **Completed:** 2026-08-24
- **Tasks:** 2/2 completed
- **Files modified:** 18 (1 new, 17 modified: 1 model file, 3 migration SQL files, 13 migrations-package test files)

## Accomplishments
- Locked the exact DTO shapes (`AdminUserContributionsPage`, `AdminUserMediaPage`, `AdminUserRightsSummaryPage`, and their nested types) every downstream Phase-139 backend plan builds against, additive alongside all existing production DTOs (zero renames/removals)
- Built `testsupport.OpenPhase139Postgres(t)` — the first disposable-DB test harness in this codebase to apply the COMPLETE real migration chain (151 pairs) instead of hand-assembled stand-in tables, smoke-verified end-to-end against a real disposable database
- Found and fixed a genuine, previously-dormant schema-portability bug in migrations 0057/0071 (hardcoded `public.` schema references), and a real import cycle the new harness's `migrations` import exposed in 14 pre-existing test files — both were invisible until this plan attempted the first-ever full-chain run inside an isolated non-public schema

## Task Commits

Each task was committed atomically:

1. **Task 1: Define new grouped/paginated Go DTOs in admin_users.go** - `c0f7614c` (feat)
2. **Task 2: Create the Phase-139 disposable Postgres test harness (full real migration chain)** - `8d24ba44` (feat)

**Plan metadata:** (pending — this SUMMARY's own commit)

## Files Created/Modified
- `backend/internal/models/admin_users.go` - added `AdminListMeta`/`AdminFilterOption`/`AdminContributionStandardSummary`/`AdminContributionRangeEntry`/`AdminContributionProjectBlock`/`AdminContributionFilterOptions`/`AdminUserContributionsPage`/`AdminMediaItem`/`AdminMediaReleaseBlock`/`AdminMediaFilterOptions`/`AdminUserMediaPage`/`AdminHeadlineCapabilityState`/`AdminUserGroupRightsSummaryItem`/`AdminUserRightsSummaryPage`, all additive
- `backend/internal/testsupport/phase139_postgres.go` - new `OpenPhase139Postgres(t)` harness applying the full real migration chain via `migrations.NewRunner(pool, migrationsDir).Up(ctx)`
- `database/migrations/0057_drop_release_version_groups_fansubgroup_id.{up,down}.sql` - removed hardcoded `public.` schema qualifiers, replaced `table_schema = 'public'` with `table_schema = ANY (current_schemas(false))`
- `database/migrations/0071_drop_fansub_legacy_text_fields.up.sql` - same `table_schema = ANY (current_schemas(false))` fix
- 13 `backend/internal/migrations/*_test.go` files - moved from `package migrations` to `package migrations_test` (mechanical, to break the new import cycle)

## Decisions Made
- Used the real, complete migration chain (not hand-assembled stand-in tables) for the new test harness, per the plan's own explicit resolution of RESEARCH.md's Assumption A2 — the FK surface (anime_contributions/episodes/release_crew_snapshots/release_version_media) was judged too deep/wide to safely hand-assemble without risking silent divergence from real constraints.
- Fixed migrations 0057/0071 rather than working around them in the harness, since both are genuine, previously-undetected bugs (hardcoded `public.` schema qualifiers break under any non-public search_path) with zero effect on team4s_v2 (both already applied there, so the edit is inert in production and only changes future/test-environment behavior).
- Moved 14 internal migrations-package test files to the external `migrations_test` package rather than avoiding the `testsupport -> migrations` import (which the plan explicitly required), since the mechanical rename carried verified zero risk (no unexported-symbol or cross-file-outside-the-set references) and is the standard, idiomatic Go fix for this exact import-cycle shape.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Migrations 0057/0071 hardcoded `public.`-qualified references broke the full migration chain under an isolated non-public schema**
- **Found during:** Task 2 (smoke-verifying `OpenPhase139Postgres` against a real disposable database)
- **Issue:** `0057_drop_release_version_groups_fansubgroup_id.{up,down}.sql` and `0071_drop_fansub_legacy_text_fields.up.sql` are the only 2 of 151 migration file pairs that hardcode `public.`-schema-qualified table references and `table_schema = 'public'` guard checks. Every other migration relies on `search_path`. Running the full chain inside the isolated `phase139_xxx` schema this harness requires made migration 0071's safety guard raise `RAISE EXCEPTION` (columns "didn't exist" per its `table_schema = 'public'` check, even though they existed in the isolated schema), and would have made 0057's `ALTER TABLE public.release_version_groups ...` fail outright (table only exists in the isolated schema, not literally in `public`).
- **Fix:** Removed the explicit `public.` qualifiers (all objects created without an explicit schema already resolve via search_path, matching every other migration's convention) and replaced the two `table_schema = 'public'` checks with `table_schema = ANY (current_schemas(false))`, which resolves to the same result under a normal deployment's default search_path (`public`) and also works correctly inside an isolated test schema.
- **Files modified:** `database/migrations/0057_drop_release_version_groups_fansubgroup_id.up.sql`, `database/migrations/0057_drop_release_version_groups_fansubgroup_id.down.sql`, `database/migrations/0071_drop_fansub_legacy_text_fields.up.sql`
- **Verification:** Smoke-ran the full 151-pair migration chain against a genuinely disposable database (`team4s_phase139_test_smoke`, created and dropped for this verification only) via `OpenPhase139Postgres` — succeeded end-to-end after the fix; failed with the exact reported errors before it.
- **Committed in:** `8d24ba44` (part of Task 2 commit)

**2. [Rule 3 - Blocking issue] `testsupport` importing `internal/migrations` created a genuine import cycle with 14 pre-existing internal migrations-package test files**
- **Found during:** Task 2 (`go build ./...`/`go vet ./...` after adding `phase139_postgres.go`)
- **Issue:** `backend/internal/testsupport/phase139_postgres.go` (as the plan required) imports `team4s.v3/backend/internal/migrations` to call `migrations.NewRunner(...).Up(...)`. Fourteen pre-existing test files inside `package migrations` (internal test files, not `migrations_test`) already imported `testsupport` (e.g., `fresh_proof_test.go`'s Phase-134 fresh/up/down proof, several PhaseNNN migration-contract tests). Since Go merges a package's internal test files into that same package identity for compilation, this created a true cycle: `migrations` (test-augmented) → `testsupport` → `migrations`.
- **Fix:** Moved all 14 affected files from `package migrations` to the external `package migrations_test`, adding an explicit `"team4s.v3/backend/internal/migrations"` import and qualifying the two calls (`NewRunner`/`ResolveMigrationsDir`) that needed it in `fresh_proof_test.go` (the only one of the 14 that referenced migrations-package symbols directly). Verified beforehand, via cross-file identifier search, that none of the other 13 files reference unexported `migrations`-package symbols or package-level identifiers owned by test files outside this 14-file set — the rename was purely mechanical for those 13.
- **Files modified:** `backend/internal/migrations/fresh_proof_test.go`, `phase106_member_points_test.go`, `phase107_review_foundation_test.go`, `phase108_contribution_sources_test.go`, `phase108_project_note_lifecycle_test.go`, `phase109_member_point_totals_test.go`, `phase128_public_identity_test.go`, `phase136_capability_policy_catalog_test.go`, `phase136_role_catalog_palette_correction_test.go`, `phase136_role_catalog_uat_corrections_test.go`, `phase137_effective_rights_overrides_test.go`, `phase137_fansub_group_media_view_test.go`, `release_review_contribution_rule_test.go`, `release_review_lifecycle_test.go`
- **Verification:** `go build ./...`/`go vet ./...` clean across the whole module; `go test ./...` FAIL-line count unchanged at exactly 65 (matches 139-RESEARCH.md's documented pre-existing baseline: 24 handlers + 5 migrations + 36 repository), confirming zero regressions from the rename.
- **Committed in:** `8d24ba44` (part of Task 2 commit)

## Known Stubs

None — this plan adds only Go type definitions and test infrastructure; no UI or data-wiring stubs are introduced.

## Threat Flags

None — no new network endpoints, auth paths, or trust-boundary-crossing surface. New DTOs are pure data-shape definitions (T-139-02, accept disposition per this plan's own threat model). The test harness only ever targets a regex-guarded disposable database/schema (T-139-01, mitigate disposition, unchanged from the plan's threat register).

## Self-Check: PASSED

- FOUND: `backend/internal/models/admin_users.go` (modified, contains `AdminUserContributionsPage`)
- FOUND: `backend/internal/testsupport/phase139_postgres.go` (created)
- FOUND: commit `c0f7614c` in `git log`
- FOUND: commit `8d24ba44` in `git log`
- FOUND: `go build ./...` / `go vet ./...` clean
- FOUND: `go test ./...` FAIL count = 65, matches documented baseline
