---
phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion
plan: 21
subsystem: backend
tags: [go, postgres, permissions, segment-credits, gap-closure, tdd]

# Dependency graph
requires:
  - phase: 156-20
    provides: "permissions.SegmentCreditRoleCodes (8 codes, encoder/designer appended) and permissions.SegmentCreditPreselectionRoleCodes (6 codes, true subset)"
provides:
  - "ensureThemeSegmentContributorsPreselectedTx now reads the narrower SegmentCreditPreselectionRoleCodes -- encoder/designer never auto-preselected"
  - "Migration 0165 equivalence test compares against the correct, smaller SegmentCreditPreselectionRoleCodes list"
  - "Public segment-credit projection proven, against real Postgres, to show encoder (\"Karaoke-Encoding\")/designer (\"Logo\") only when explicitly selected; raw_provider proven permanently excluded"
  - "All stale 'encoder never public' doc comments and test-assertion messages corrected to the GAP-09 rule"
affects: [156-22, 156-UAT]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "raw_provider replaces encoder as the standing example of a permanently-excluded segment-credit role across all role-filter/projection tests, since encoder is no longer excluded post-GAP-09"

key-files:
  created: []
  modified:
    - backend/internal/repository/theme_segment_contributor_preselection.go
    - backend/internal/repository/theme_segment_contributor_preselection_migration_test.go
    - backend/internal/repository/theme_segment_contributor_preselection_test.go
    - backend/internal/repository/segment_credit_role_filter_test.go
    - backend/internal/repository/release_detail_public_repository_segment_credits_test.go
    - backend/internal/repository/release_detail_public_repository_segment_contributor_subset_test.go
    - backend/internal/repository/theme_segment_contributors.go
    - backend/internal/models/admin_anime_themes.go
    - backend/internal/repository/theme_segment_contributors_integration_test.go

key-decisions:
  - "Provisioned a throwaway team4s_phase117_test_p15621 Postgres database on team4sv30-db (matching the required regex, following the 156-17 precedent) instead of relying on any persistent env var, then dropped it after the full regression sweep"
  - "Fixed two subset-matrix cases (F, K_inherited_default_overridden_to_irrelevant_role) not called out in the plan's interfaces but confirmed, by actually running the test suite before editing this file, to already fail post-156-20 because they used 'encoder' as their 'non-segment-relevant role' example -- retargeted both to raw_provider (Rule 1: auto-fix bug, same pattern the plan already applied elsewhere in the same file)"
  - "Kept the theme_segment_contributor_preselection.go doc comment strictly to two occurrences of the qualified permissions.SegmentCreditPreselectionRoleCodes identifier (and zero occurrences of permissions.SegmentCreditRoleCodes) to satisfy the plan's exact grep-based acceptance criteria, describing the sibling list in prose instead of by qualified name where a third mention would otherwise have appeared"

patterns-established: []

requirements-completed: [GAP-09]

# Metrics
duration: ~50min
completed: 2026-09-15
---

# Phase 156 Plan 21: GAP-09 Segment-Domain Wiring und Testkorrektur Summary

**`ensureThemeSegmentContributorsPreselectedTx` now reads the narrower `SegmentCreditPreselectionRoleCodes` (never auto-preselecting encoder/designer), while the untouched public-projection code path is proven, against real Postgres, to surface encoder ("Karaoke-Encoding") and designer ("Logo") exactly when explicitly selected and never surface raw_provider.**

## Performance

- **Duration:** ~50 min
- **Completed:** 2026-09-15
- **Tasks:** 3 (all `type="auto" tdd="true"`/`type="auto"`)
- **Files modified:** 9

## Accomplishments

- `ensureThemeSegmentContributorsPreselectedTx` (`theme_segment_contributor_preselection.go`) now builds its `relevant` role map from `permissions.SegmentCreditPreselectionRoleCodes` instead of the now-8-code `permissions.SegmentCreditRoleCodes` -- the automatic preselection introduced by GAP-07 (Plan 156-18) keeps excluding encoder and designer, satisfying 156-UAT.md GAP-09 point 2 ("Vorauswahl unveraendert") even though both roles are now segment-relevant for public credit purposes. Proven with a new designer-only fixture added alongside the existing encoder-only one in the extended preselection subtest.
- `TestThemeSegmentContributorPreselectionMigrationRoleArrayMatchesGoSlice` now compares migration 0165's hardcoded SQL role array against `permissions.SegmentCreditPreselectionRoleCodes` (still exactly the original six codes) instead of the now-mismatched 8-code `SegmentCreditRoleCodes` -- migration 0165's own `up.sql`/`down.sql` files are byte-identical to before this plan (`git diff --stat` confirms no output).
- The public segment-credit projection (`release_detail_public_repository_segment_credits.go`, deliberately left source-unmodified -- it already reads `permissions.SegmentCreditRoleCodes` as a package var) is now proven, against real Postgres, to show an explicitly-selected encoder as `"Karaoke-Encoding"` and an explicitly-selected designer as `"Logo"`, while an explicitly-selected raw_provider never appears and unselected encoder/designer contributors on the Origin also never appear ("keine Auswahl = keine Credits" applies identically to the two new roles). The DB-free `TestSegmentCreditRoleFilter` unit test reflects the same rule, with `raw_provider` replacing `encoder` as the file's standing excluded-role example.
- `release_detail_public_repository_segment_contributor_subset_test.go`'s single `D_*` "encoder never appears" subtest is replaced by four independent subtests (`D`: encoder selected -> "Karaoke-Encoding"; `D2`: designer selected -> "Logo"; `D3`: both present on Origin but unselected -> empty; `D4`: raw_provider selected -> empty) -- extending, not deleting, the regression coverage per 156-UAT.md GAP-09 point 6.
- Two stale doc comments (`ListThemeSegmentContributorCandidates` in `theme_segment_contributors.go`, `AdminThemeSegmentContributorCandidate` in `admin_anime_themes.go`) and one stale test-assertion message (`theme_segment_contributors_integration_test.go` line 412) no longer claim an encoder-only contributor "never becomes a public segment credit" -- all three now note GAP-09 (2026-09-15) supersedes that premise, without changing any executable code, the `require.Len(t, before, 2, ...)` count, or any other assertion.

## Task Commits

Each task was committed atomically:

1. **Task 1: Repoint the preselection filter and its migration equivalence test** - `43a835e9` (fix)
2. **Task 2: Correct the public-projection and role-filter tests for GAP-09's new visibility rule** - `4b68a3f8` (test)
3. **Task 3: Correct the two stale "encoder never public" doc comments and the stale candidate-list test assertion** - `df4c4ca9` (docs)

_Note: Task 1 and Task 2 carry `tdd="true"` in the plan frontmatter, but since Plan 156-20 already landed the two package vars this plan wires up, no RED phase was needed or possible at the file level -- every test edited in this plan targeted an already-compiling, already-passing dependency; the only "RED" moment was verifying (before editing) that the yet-uncorrected assertions failed against the new 8-code role list, which is documented as an issue found rather than a formal RED commit._

## Files Created/Modified

- `backend/internal/repository/theme_segment_contributor_preselection.go` - `ensureThemeSegmentContributorsPreselectedTx` reads `permissions.SegmentCreditPreselectionRoleCodes`; doc comment explains why a separate, smaller list exists
- `backend/internal/repository/theme_segment_contributor_preselection_migration_test.go` - migration 0165 equivalence test's comparison target repointed to `SegmentCreditPreselectionRoleCodes`
- `backend/internal/repository/theme_segment_contributor_preselection_test.go` - added a `designerOnly` fixture to the preselection subtest, proving both encoder and designer stay excluded
- `backend/internal/repository/segment_credit_role_filter_test.go` - encoder/designer now expected `true`; `raw_provider` is the new standing excluded-role example
- `backend/internal/repository/release_detail_public_repository_segment_credits_test.go` - seeded `designer`/`raw_provider` role_definitions rows; Test3 retargeted to `raw_provider`; Test5 replaced by two GAP-09 subtests (Test5, Test5b)
- `backend/internal/repository/release_detail_public_repository_segment_contributor_subset_test.go` - case D replaced by D/D2/D3/D4; cases F and `K_inherited_default_overridden_to_irrelevant_role` retargeted from `encoder` to `raw_provider`
- `backend/internal/repository/theme_segment_contributors.go` - `ListThemeSegmentContributorCandidates` doc comment corrected
- `backend/internal/models/admin_anime_themes.go` - `AdminThemeSegmentContributorCandidate` doc comment corrected
- `backend/internal/repository/theme_segment_contributors_integration_test.go` - stale assertion message corrected, count/logic unchanged

## Decisions Made

- Provisioned an isolated `team4s_phase117_test_p15621` Postgres database on the running `team4sv30-db` container (matching `^team4s_phase117_test_[a-z0-9]+$`) for all `TEAM4S_PHASE117_TEST_DSN`-gated tests, following the exact precedent documented in `156-17-SUMMARY.md`; dropped it after the final regression sweep, leaving no persistent schema/data behind.
- Fixed two additional subset-matrix cases not named in the plan's `<interfaces>` section (`F_role_change_qc_to_encoder_removes_person_from_segment_credits`, `K_inherited_default_overridden_to_irrelevant_role`) after confirming, by running the unmodified test suite first, that both already failed once Plan 156-20 landed -- both used `encoder` as their "permanently non-segment-relevant role" example, which stopped being true. Retargeted both to `raw_provider`, the same standing example the plan already establishes everywhere else in this file. Renamed `F_role_change_qc_to_encoder_removes_person_from_segment_credits` to `F_role_change_qc_to_raw_provider_removes_person_from_segment_credits` for consistency.
- Kept `theme_segment_contributor_preselection.go`'s doc comment to exactly two occurrences of `permissions.SegmentCreditPreselectionRoleCodes` and zero occurrences of `permissions.SegmentCreditRoleCodes`, per the plan's literal grep-based acceptance criteria -- described the sibling list by its role (the "full credit-role list") rather than by qualified name in prose where a third/fourth mention would otherwise have appeared.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Retargeted two additional subset-matrix cases (F, K_inherited_default_overridden_to_irrelevant_role) from `encoder` to `raw_provider`**
- **Found during:** Task 2 (before editing `release_detail_public_repository_segment_contributor_subset_test.go`, ran the full unmodified `TestSegmentContributorSubsetMatrix` suite to confirm baseline state)
- **Issue:** Both cases used `encoder` as their "non-segment-relevant role" example to prove a person disappears from Participants after a role change/override. Since Plan 156-20 made encoder segment-relevant, both cases already failed with the pre-existing `encoder`-based assertions (confirmed via a live test run: `Should be empty, but was [{... encoder ... Karaoke-Encoding ...}]`), even though the plan's `<interfaces>`/`<behavior>` sections claimed all of A/B/C/E/F/G/H/I/J/K would "pass completely unmodified."
- **Fix:** Changed the role-change literal in both subtests from `'encoder'` to `'raw_provider'` (the same standing example the plan already introduces for exactly this purpose elsewhere in the same file), and renamed the `F_*` subtest accordingly.
- **Files modified:** backend/internal/repository/release_detail_public_repository_segment_contributor_subset_test.go
- **Verification:** `TestSegmentContributorSubsetMatrix` full suite green after the fix, including both retargeted subtests.
- **Committed in:** `4b68a3f8` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix, out-of-scope-but-adjacent test correction)
**Impact on plan:** Necessary for full-suite correctness -- without this fix, `TestSegmentContributorSubsetMatrix` would have stayed red after Task 2's commit, contradicting the plan's own "all pre-existing subtests pass unmodified" claim. No scope creep: the fix follows the exact `raw_provider`-substitution pattern the plan already mandates for the `D_*`/Test3/Test5 cases in the same/sibling files.

## Issues Encountered

- The plan's `<interfaces>`/`<behavior>` text for Task 2 asserted that subset-matrix cases F and `K_inherited_default_overridden_to_irrelevant_role` would pass "completely unmodified" alongside A/B/C/E/G/H/I/J/K_relevant. A live test run before editing the file showed both already failing post-156-20 for the reason above. Resolved via Rule 1 (see Deviations).

## User Setup Required

None - no external service configuration required.

## Verification

- `go build ./... && go vet ./...` (golang:1.25-alpine container) - clean after every task.
- Task 1: `go test ./internal/repository/... -run 'TestEnsureThemeSegmentContributorsPreselected|TestEnsureThemeSegmentOriginAndContributors|TestThemeSegmentContributorPreselectionMigration|TestThemeSegmentContributorPreselectionMigrationRoleArrayMatchesGoSlice|TestThemeSegmentContributorPreselectionSQLGoEquivalence' -v -count=1` against the isolated `team4s_phase117_test_p15621` database - all subtests PASS, including the new designer-exclusion assertion.
- `git diff --stat -- database/migrations/0165_theme_segment_contributor_preselection.up.sql database/migrations/0165_theme_segment_contributor_preselection.down.sql` - no output (byte-identical).
- `grep -n "permissions.SegmentCreditRoleCodes" backend/internal/repository/theme_segment_contributor_preselection.go` - no matches; `grep -c "permissions.SegmentCreditPreselectionRoleCodes" backend/internal/repository/theme_segment_contributor_preselection.go` - `2`.
- Task 2: `go test ./internal/repository/... -run TestSegmentCreditRoleFilter -v -count=1` - all 8 cases PASS including the new `raw_provider`-only and `designer`-only cases.
- `go test ./internal/repository/... -run 'TestReleaseDetailPublicSegmentOriginCredits|TestSegmentContributorSubsetMatrix' -v -count=1` against real Postgres - all subtests PASS, including Test5/Test5b and D/D2/D3/D4.
- `git diff --stat -- backend/internal/repository/release_detail_public_repository_segment_credits.go backend/internal/repository/release_detail_public_repository_helpers.go` - no output (byte-identical, confirming no source change was needed).
- `grep -c "encoder.*erscheint nie\|Encoder erscheint nie" backend/internal/repository/release_detail_public_repository_segment_credits_test.go` - `0`.
- Task 3: `grep -rn "nie oeffentlich als Segment-Credit erscheinen\|nie öffentlich als Segment-Credit erscheinen" backend/internal/repository/theme_segment_contributors.go backend/internal/models/admin_anime_themes.go` - no matches; `grep -c "nie oeffentlicher Segment-Credit\|nie öffentlicher Segment-Credit" backend/internal/repository/theme_segment_contributors_integration_test.go` - `0`.
- `git diff` on all three Task 3 files confirms comment-/message-string-only changes -- no executable-code line touched.
- `go test ./internal/repository/... -run 'TestListThemeSegmentContributorCandidates|TestSetThemeSegmentContributors' -v -count=1` - all subtests PASS unmodified.
- **Full regression sweep:** `go test ./internal/repository/... ./internal/permissions/... -count=1` (no `-run` filter) against the isolated Postgres database - `internal/permissions` fully green; `internal/repository` shows exactly 50 pre-existing, environment-dependent failures (missing `TEAM4S_PHASE128_TEST_DSN`, Phase-134 Keycloak/port-18093 dependency), the same count documented as the established baseline in prior 156-plan summaries (e.g. 156-17). 0 new failures introduced by this plan; none of the 50 failures relate to segment credits, preselection, or GAP-09.
- Throwaway database `team4s_phase117_test_p15621` dropped after the final regression sweep -- no persistent schema/data left behind.

## Known Stubs

None - this plan touches only Go source/test wiring and doc comments, no UI or data-flow stubs introduced.

## Threat Flags

None - this plan's threat model (T-156-42, T-156-43, T-156-SC) was pre-declared in the plan itself; T-156-42's disposition (`accept`) is confirmed unchanged by Task 2's `git diff --stat` proving the public/private visibility gate itself (`is_public_on_anime_page`/`visibility_id`/`member_slug`) was never touched. No new network endpoint, auth path, file access pattern, or schema change was introduced.

## Next Phase Readiness

- GAP-09's wiring and test-correction work is complete: every consumer of the central segment-credit role definitions (preselection, migration equivalence, public projection, role-filter unit test, admin candidate list) now consistently reflects the GAP-09 rule.
- Phase 156's overall Live-UAT-Checkpoint (156-UAT.md GAP-02) remains explicitly OPEN and is not affected by this plan -- it is a separate, still-outstanding Auftraggeber-Abnahmehandlung.

---
*Phase: 156-segment-domain-konsistenz-und-oeffentliche-release-projektion*
*Completed: 2026-09-15*

## Self-Check: PASSED

- FOUND: backend/internal/repository/theme_segment_contributor_preselection.go
- FOUND: backend/internal/repository/theme_segment_contributor_preselection_migration_test.go
- FOUND: backend/internal/repository/theme_segment_contributor_preselection_test.go
- FOUND: backend/internal/repository/segment_credit_role_filter_test.go
- FOUND: backend/internal/repository/release_detail_public_repository_segment_credits_test.go
- FOUND: backend/internal/repository/release_detail_public_repository_segment_contributor_subset_test.go
- FOUND: backend/internal/repository/theme_segment_contributors.go
- FOUND: backend/internal/models/admin_anime_themes.go
- FOUND: backend/internal/repository/theme_segment_contributors_integration_test.go
- FOUND commit 43a835e9 (fix, Task 1)
- FOUND commit 4b68a3f8 (test, Task 2)
- FOUND commit df4c4ca9 (docs, Task 3)
