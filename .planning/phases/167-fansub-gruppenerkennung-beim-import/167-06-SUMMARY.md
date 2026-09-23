---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 06
subsystem: api
tags: [go, postgres, pgx, repository, fansub-alias-learning, apply-transaction]

# Dependency graph
requires: ["167-01", "167-02", "167-05"]
provides:
  - "resolveImportFansubSelection no longer derives+upserts a fansub_groups row from a filename fallback (D-03/REQ-167-10) -- an unresolved mapping row now simply resolves to zero member groups"
  - "maybeLearnFansubGroupAlias(ctx, tx, groupID, rawCandidate) in episode_import_repository_release_helpers.go -- race-safe, conflict-respecting alias-learn write reusing Plan 02's resolveFansubGroupMatches inside the same open apply transaction (D-01/D-02)"
  - "learnFansubGroupAliasesForExplicitSelection -- cross-references mapping.FansubGroups[i].ID against resolved member groups so only an EXPLICIT existing-group selection ever triggers a learn attempt, never a brand-new group created via the untouched free-text path"
  - "EpisodeImportApplyResult.LearnedFansubAliases (json:\"-\") threaded from applyReleaseNative through upsertImportReleaseGraph/upsertReleaseVersionGroup"
  - "writeLearnedFansubAliasAudit(c, auditLogRepo, learned) in admin_episode_import_fansub_match.go -- fansub_group_alias.learned audit entries via the same in-context identity lookup h.requireAdmin already uses (no second DB round trip, no extra line budget consumed)"
  - "phase167_fansub_learn_apply_test.go -- real-Postgres proof of no-auto-create, idempotent alias-learn, and no-silent-reassignment (D-10)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Alias-learn write and its pre-insert uniqueness check (resolveFansubGroupMatches) run inside the SAME open apply transaction, making the 'already known anywhere?' gate and the INSERT ... ON CONFLICT DO NOTHING RETURNING id transactionally consistent instead of check-then-act across two connections"
    - "Audit-attribution helper reads identity from the gin.Context in-memory lookup (middleware.CommentAuthIdentityFromContext) instead of threading a captured identity value through the handler, keeping the file-size-ceiling-constrained call site to exactly one line"

key-files:
  created:
    - backend/internal/repository/phase167_fansub_learn_apply_test.go
  modified:
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - backend/internal/repository/episode_import_repository_apply.go
    - backend/internal/models/episode_import.go
    - backend/internal/handlers/admin_episode_import_fansub_match.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/repository/episode_import_repository_release_helpers_test.go
    - backend/internal/repository/episode_import_repository_autoassign_test.go
    - backend/internal/repository/theme_segment_assignment_slots_integration_test.go

key-decisions:
  - "writeLearnedFansubAliasAudit takes *gin.Context (not a captured actorAppUserID) and derives identity internally via middleware.CommentAuthIdentityFromContext -- the plan's action assumed identity was 'already captured at the top of this handler', which the actual code (a discarded '_, ok := h.requireAdmin(c)') contradicted. Capturing identity as a new top-level variable would have cost a second line (Go's if-with-init scoping does not leak the variable past the if block, and gofmt provably splits any single-line semicolon workaround back into two statements -- verified empirically). Deriving it inside the audit helper via the same in-context lookup h.requireAdmin already performs keeps ApplyEpisodeImport's net growth to exactly the one mandated call-site line."
  - "Three pre-existing tests (a source-inspection substring assertion plus two direct callers of upsertReleaseVersionGroup/upsertImportReleaseGraph) needed their call sites updated for the additive *[]models.LearnedFansubAlias parameter -- Rule 3 blocking-issue auto-fixes, minimal and mechanical, not a rewrite of the source-inspection test's style (out of this plan's scope per Teststil Altlast note)."
  - "learnFansubGroupAliasesForExplicitSelection cross-references mapping.FansubGroups[i].ID (the admin's raw selection input) against the resolved memberGroups list by ID, rather than treating every resolved group as a learn target -- this is what keeps a brand-new group created via the still-supported explicit free-text path (episode_import_repository_fansub_helpers.go, untouched) from being mistaken for an 'explicit existing-group selection' and having its own just-created name learned as a redundant alias of itself."

requirements-completed: [REQ-167-10, REQ-167-13, REQ-167-14, REQ-167-15, REQ-167-17, REQ-167-19, REQ-167-20, REQ-167-21, REQ-167-22, REQ-167-23]

# Metrics
duration: ~55min
completed: 2026-09-23
---

# Phase 167 Plan 06: Fansub-Alias-Lernen beim Apply Summary

**Removed the filename auto-create fallback in `resolveImportFansubSelection` (an unresolved mapping row now stays unresolved -- D-03's core fix) and added a race-safe `maybeLearnFansubGroupAlias` write path that learns a new kürzel as an alias of an explicitly-selected existing group exactly once, audited, and never silently reassigns a kürzel that already belongs to a different group -- all three behaviors proven against a real Postgres database, not fakes.**

## Performance

- **Duration:** ~55 min (context loading + 3 task commits + verification)
- **Started:** 2026-09-23 (after 167-05 completion)
- **Completed:** 2026-09-23
- **Tasks:** 3/3 completed
- **Files modified:** 8 (7 modified, 1 created)

## Accomplishments

- `resolveImportFansubSelection`'s filename fallback (`name := ...; if name == "" { name = deriveFansubGroupName(media) }` followed by an implicit `upsertImportFansubGroup`) is gone entirely -- a mapping row with no explicit `FansubGroups`/`FansubGroupID` selection now resolves to `nil, nil`, matching Plan 05's "empty stays empty" preview contract end to end from preview through apply (D-03/REQ-167-10). Proven with real filename evidence (`[BDnP] NIGHT HEAD 2041 - 01 [1080p].mkv`) that a pre-167-06 build would have turned into a brand-new `fansub_groups` row.
- New `maybeLearnFansubGroupAlias(ctx, tx, groupID, rawCandidate)`: re-checks `resolveFansubGroupMatches` (Plan 02, same open apply transaction) before inserting, so a kürzel already known for ANY group -- this same one or a different one -- is never touched; `INSERT ... ON CONFLICT (normalized_alias) DO NOTHING RETURNING id` handles the remaining benign concurrent-writer race as a no-op rather than surfacing an error (D-01/D-02/T-167-03).
- New `learnFansubGroupAliasesForExplicitSelection` gates the learn attempt on the admin's mapping actually carrying an EXPLICIT existing-group selection (`mapping.FansubGroups[i].ID` cross-referenced by ID against the resolved member groups) -- a brand-new group created via the separate, untouched free-text path (`episode_import_repository_fansub_helpers.go`) is never mistaken for a learn target.
- `EpisodeImportApplyResult.LearnedFansubAliases` (`json:"-"`) is threaded from `applyReleaseNative`'s per-mapping loop through `upsertImportReleaseGraph`/`upsertReleaseVersionGroup`, accumulating every alias learned across the whole apply batch.
- `writeLearnedFansubAliasAudit` writes one `fansub_group_alias.learned` audit entry per learned alias (payload: `alias`, `source: "episode_import"`), attributed to the acting admin via the same in-context identity lookup `h.requireAdmin` already performs internally -- no second DB round trip, and `ApplyEpisodeImport` grows by exactly the one mandated call-site line (776 -> 777, honoring the operator's tight combined-growth budget together with Plan 05's prior +1 from a pre-phase baseline of 775).
- `episode_import_repository_fansub_helpers.go` is completely untouched -- `grep -c upsertImportFansubGroup episode_import_repository_release_helpers.go` is 0, confirming the shared manual episode-version-creation upsert path was never modified.
- Three real-Postgres integration tests (`phase167_fansub_learn_apply_test.go`) prove the hard D-10 requirement: no group auto-create, idempotent single alias-learn, and no silent reassignment -- all against the real `team4s_phase167_test_1` database and its live `UNIQUE(normalized_alias)` constraint.

## Task Commits

1. **Task 1: Remove filename auto-create fallback; add maybeLearnFansubGroupAlias** -- `a9b051ba` (feat): `episode_import_repository_release_helpers.go` rewritten (fallback removed, `maybeLearnFansubGroupAlias`/`learnFansubGroupAliasesForExplicitSelection` added, `upsertReleaseVersionGroup`/`upsertImportReleaseGraph` signatures extended with an additive `*[]models.LearnedFansubAlias` parameter). Three pre-existing test call sites updated for the new parameter (Rule 3 auto-fixes). `go build ./internal/repository/...` clean; all acceptance-criteria greps confirmed (fallback replaced with `return nil, nil`, `deriveFansubGroupName(media)` call count = 1, `upsertImportFansubGroup` count = 0 in this file).
2. **Task 2: Thread learned-alias accumulator to EpisodeImportApplyResult; audit in handler** -- `30c4c38d` (feat): `models.EpisodeImportApplyResult.LearnedFansubAliases` added; `applyReleaseNative` accumulates and attaches it; `writeLearnedFansubAliasAudit` added to `admin_episode_import_fansub_match.go`; `ApplyEpisodeImport` gains exactly one call-site line. `go build ./...` clean; `admin_episode_import.go` confirmed at 777 lines (776 baseline + 1); `grep -c "fansub_group_alias.learned" admin_episode_import_fansub_match.go` = 1.
3. **Task 3: Real-DB proof + REQ-167-21 documentation** -- `6bdb8ec4` (test): `phase167_fansub_learn_apply_test.go` with `TestApplyDoesNotAutoCreateFansubGroup`, `TestApplyLearnsNewAliasForExplicitGroup`, `TestApplyDoesNotReassignConflictingAlias`, all PASS against the real `team4s_phase167_test_1` database (see Real Postgres Commands Run below) and SKIP cleanly with no DSN set.

## Files Created/Modified

- `backend/internal/repository/episode_import_repository_release_helpers.go` (now 515 lines, was 428) -- fallback removed from `resolveImportFansubSelection`; `learnFansubGroupAliasesForExplicitSelection`/`maybeLearnFansubGroupAlias` added; `upsertReleaseVersionGroup`/`upsertImportReleaseGraph` signatures extended additively.
- `backend/internal/repository/episode_import_repository_apply.go` -- `learned` accumulator declared, threaded into the `upsertImportReleaseGraph` call, attached to `result.LearnedFansubAliases` after the per-mapping loop.
- `backend/internal/models/episode_import.go` -- `EpisodeImportApplyResult.LearnedFansubAliases []LearnedFansubAlias \`json:"-"\`` added.
- `backend/internal/handlers/admin_episode_import_fansub_match.go` (now 165 lines, was 123) -- new `writeLearnedFansubAliasAudit(c *gin.Context, auditLogRepo auditLogWriter, learned []models.LearnedFansubAlias)`.
- `backend/internal/handlers/admin_episode_import.go` (777 lines, was 776) -- exactly one line added: `writeLearnedFansubAliasAudit(c, h.auditLogRepo, result.LearnedFansubAliases)`.
- `backend/internal/repository/episode_import_repository_release_helpers_test.go` -- source-inspection substring updated to match the new `upsertReleaseVersionGroup` call signature (Rule 3).
- `backend/internal/repository/episode_import_repository_autoassign_test.go` -- direct `upsertReleaseVersionGroup` test caller updated with a trailing `nil` for the new accumulator parameter (Rule 3).
- `backend/internal/repository/theme_segment_assignment_slots_integration_test.go` -- direct `upsertImportReleaseGraph` test caller updated with a trailing `nil` for the new accumulator parameter (Rule 3).
- `backend/internal/repository/phase167_fansub_learn_apply_test.go` (144 lines, new) -- the three D-10 real-Postgres integration tests.

All files well under the CLAUDE.md 450-line ceiling except `episode_import_repository_release_helpers.go` (515 lines) and `admin_episode_import.go` (777 lines), both of which were already over the ceiling before this plan (per the operator's explicit pre-existing-file-size instructions for this run) and grew only by the amounts this plan's own acceptance criteria specify.

## admin_episode_import.go line-count verification (operator constraint)

- Baseline before this plan (post-Plan-05, per operator instructions): **776 lines**.
- After this plan's Task 2 edit: **777 lines** (verified via `wc -l`).
- Net growth this plan: **+1 line** (the single `writeLearnedFansubAliasAudit` call-site line).
- Combined growth across Plan 05 + this plan: 775 -> 777 = **+2 lines**, exactly matching the plan's own acceptance criteria ("combined growth stays at 2 lines over the pre-phase baseline of 775").

## Real Postgres Commands Run

Build/vet (scratch container, backend bind-mounted from host):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine \
  sh -c "gofmt -l . ; go build ./... && go vet ./..."
```
Result: `go build`/`go vet` clean (gofmt flags a large number of pre-existing, unrelated files repo-wide; every file this plan touched is individually gofmt-clean, verified separately).

Real-Postgres integration run (the hard D-10 requirement, exact command per the operator's instructions):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default \
  -e TEAM4S_PHASE167_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase167_test_1?sslmode=disable' \
  golang:1.25-alpine \
  go test ./internal/repository/... -run "TestApplyDoesNotAutoCreateFansubGroup|TestApplyLearnsNewAliasForExplicitGroup|TestApplyDoesNotReassignConflictingAlias" -v
```
Result:
```
=== RUN   TestApplyDoesNotAutoCreateFansubGroup
--- PASS: TestApplyDoesNotAutoCreateFansubGroup (0.04s)
=== RUN   TestApplyLearnsNewAliasForExplicitGroup
--- PASS: TestApplyLearnsNewAliasForExplicitGroup (0.04s)
=== RUN   TestApplyDoesNotReassignConflictingAlias
--- PASS: TestApplyDoesNotReassignConflictingAlias (0.04s)
PASS
ok  	team4s.v3/backend/internal/repository	0.165s
```

Unit tier, no DSN set (must skip cleanly, never fail):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine \
  go test ./internal/repository/... -run "TestApplyDoesNotAutoCreateFansubGroup|TestApplyLearnsNewAliasForExplicitGroup|TestApplyDoesNotReassignConflictingAlias" -v
```
Result: all three tests report `SKIP` (`TEAM4S_PHASE167_TEST_DSN is not set; skipping PostgreSQL integration test`), exit 0.

Full regression + REQ-167-21 companion test, real DSN set:
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default \
  -e TEAM4S_PHASE167_TEST_DSN='postgres://team4s:team4s_dev_password@team4sv30-db:5432/team4s_phase167_test_1?sslmode=disable' \
  golang:1.25-alpine \
  sh -c "go vet ./... && go test ./internal/repository/... -run 'Phase167|EpisodeImport|FansubGroupMatch|TestReleaseCreationCrewHook|TestBuildAnimeFansubLinkGroupIDs|TestApply' -v"
```
Result: `go vet` clean; every listed test either `PASS`es or `SKIP`s for an unrelated, DSN-gated fixture (`TEAM4S_PHASE117_TEST_DSN` not set) -- no `FAIL` in the filtered run.

```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine \
  go test ./internal/handlers/... -run TestPreviewEpisodeImport_ExpandsFilenameEpisodeRangesAcrossSeasonOffsets -v
```
Result: `PASS` -- the existing double-episode/range-expansion regression test (REQ-167-21's companion evidence, see below) is unaffected by this phase's changes.

`go test ./internal/handlers/... ./internal/models/...` (full packages, no filter): both `ok`, no failures.

## REQ-167-21 Doppelfolgen-Befund

Traced the actual double-episode (`Naruto_026-027`-style) targeting code path end to end, independently of the plan's speculative note (which the plan itself explicitly flagged as needing re-verification):

1. **Where it lives:** `TargetEpisodeNumbers` for a mapping row is computed exclusively in `backend/internal/handlers/admin_episode_import.go`'s `resolveEpisodeImportSuggestedTargets`/`episodeImportEvidenceEpisodeNumber`/`parseEpisodeImportFilenameRangeEnd`, called once per media candidate from `buildEpisodeImportPreview`. This entire code path is untouched by Phase 167 -- neither this plan (Task 1/2, `episode_import_repository_release_helpers.go`/`episode_import_repository_apply.go`) nor Plan 01/05 (`DeriveFansubGroupName`/`DeriveReleaseVersion`/`enrichEpisodeImportPreviewFansubData`) writes to `TargetEpisodeNumbers`, `TargetEpisodeNumbers[0]`, or any of the functions above -- confirmed by grepping every write site of `TargetEpisodeNumbers` across `internal/handlers`/`internal/repository` (production code, not tests): only `admin_episode_import.go:444` (preview assembly) and the pre-existing read-only consumers in `episode_import_repository_apply.go`/`episode_import_repository_release_helpers.go` (which only iterate the already-resolved slice to write `release_variant_episodes` coverage rows) appear.
2. **How it actually works (traced, not assumed):** the STARTING episode number is primarily `media.JellyfinEpisodeNumber` (Jellyfin-index-derived) with a filename-regex fallback (`episodeImportFilenameSeasonEpisodePattern`/`episodeImportFilenameEpisodePattern`). The RANGE END, however, IS filename-regex-derived: `episodeImportFilenameRangePattern = (?i)e(\d{1,4})-(\d{1,4})` is matched directly against `media.FileName` in `parseEpisodeImportFilenameRangeEnd`, and if it finds a range whose end exceeds the start, `resolveEpisodeImportSuggestedTargets` expands `targets` to every episode number in between. This is a real regex applied to the filename, not purely Jellyfin-index-derived as the plan's un-verified note speculated -- confirmed empirically by direct regex execution against test strings.
3. **The specific deferred example (`Naruto_026-027`) does NOT currently expand:** the range pattern requires a literal `e`/`E` immediately before the digit-dash-digit range (e.g. `E026-027` or `S03E12-13`). Tested directly: `"Naruto_026-027.mkv"` and `"[Group] Naruto - 26-27 [1080p].mkv"` produce NO regex match (underscore/space-only separators, no `E` prefix), while `"Naruto.S03E12-13-N!kKrew.avi"` and `"Naruto.E026-027.mkv"` DO match. This means the exact `Naruto_026-027` filename style from `167-CONTEXT.md`'s Deferred Ideas list would currently resolve to only the START episode number, not the full range -- a real, pre-existing gap, unrelated to and unaffected by any Phase 167 change, and explicitly out of this phase's scope per the CONTEXT ("Doppelfolgen in einer Datei -- in dieser Phase nur prüfen und dokumentieren").
4. **Existing regression coverage confirmed still green:** `TestPreviewEpisodeImport_ExpandsFilenameEpisodeRangesAcrossSeasonOffsets` (`admin_episode_import_test.go`) already exercises the WORKING `E12-13`-style range expansion (fixture: `Naruto.S03E12-13-N!kKrew.avi` -> episodes 12,13,14) across season offsets, end to end through `buildEpisodeImportPreview`. Re-ran it standalone after all three of this plan's tasks: `PASS`, unaffected.

**Conclusion:** Phase 167's parser/matching changes (this plan and Plans 01/02/05) only ever touch `FansubGroupName`/`FansubGroups`/`FansubGroupID`/`ReleaseVersion` fields on a mapping row -- they never read or write `TargetEpisodeNumbers`. Double-episode targeting for the `E##-##` style already works and is unregressed; the bare-digit `Naruto_026-027` style (no `E` prefix) is a separate, pre-existing, still-open gap correctly left for a future phase per the Deferred Ideas list.

## Decisions Made

See `key-decisions` in the frontmatter above (audit-helper context-derived identity to preserve the one-line budget; Rule 3 test-call-site fixes; explicit-selection cross-reference by ID).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Plan's identity-capture assumption did not match the actual handler code**
- **Found during:** Task 2, before writing the `ApplyEpisodeImport` edit.
- **Issue:** The plan's `<action>` said to reuse "the identity already captured from `h.requireAdmin(c)` at the top of this handler" and add exactly one line. The actual code discarded the identity (`if _, ok := h.requireAdmin(c); !ok {`). Capturing it as a new top-level variable requires splitting that one line into two (`identity, ok := h.requireAdmin(c)` / `if !ok {`) because Go's if-with-init scoping does not leak the declared variable past the `if` block -- verified this is unavoidable (a semicolon-joined single-line workaround is syntactically legal but gofmt provably reformats it back into two statements, confirmed by an isolated gofmt test run). Doing both the two-line split AND the one-line audit call would have grown the file by 2 lines, exceeding the operator's hard 1-line/777-line ceiling.
- **Fix:** `writeLearnedFansubAliasAudit` now accepts `*gin.Context` and derives the identity itself via `middleware.CommentAuthIdentityFromContext(c)` -- the same in-memory context lookup `requirePlatformAdminIdentity`/`h.requireAdmin` already performs internally, so no second DB round trip is introduced. `ApplyEpisodeImport`'s `requireAdmin` check line is left completely unchanged (0 net growth from that line); only the mandated single audit call-site line is added.
- **Files modified:** `backend/internal/handlers/admin_episode_import_fansub_match.go`, `backend/internal/handlers/admin_episode_import.go`.
- **Commit:** `30c4c38d`.

**2. [Rule 3 - Blocking issue] Three pre-existing tests broke against the extended `upsertReleaseVersionGroup`/`upsertImportReleaseGraph` signatures**
- **Found during:** Task 1, `go build ./internal/repository/...` after adding the `*[]models.LearnedFansubAlias` parameter.
- **Issue:** `episode_import_repository_release_helpers_test.go` (a source-inspection test asserting the literal call-site substring `upsertReleaseVersionGroup(ctx, tx, releaseVersionID, mapping, media)`), `episode_import_repository_autoassign_test.go` (`callUpsertReleaseVersionGroup` test helper), and `theme_segment_assignment_slots_integration_test.go` (a direct `upsertImportReleaseGraph` call in a cross-anime-lock-ordering test) all call the two functions with the pre-Task-1 argument count.
- **Fix:** Updated the substring literal and both call sites to pass the additive parameter (`learned`/`nil` as appropriate) -- minimal, mechanical fixes; the source-inspection test's underlying pattern (reading the `.go` file and checking a substring) was left as-is per CLAUDE.md's Teststil Altlast note (out of this plan's scope to rewrite pre-existing tests of that style).
- **Files modified:** `backend/internal/repository/episode_import_repository_release_helpers_test.go`, `backend/internal/repository/episode_import_repository_autoassign_test.go`, `backend/internal/repository/theme_segment_assignment_slots_integration_test.go`.
- **Commit:** `a9b051ba`.

## Issues Encountered

- Running `gofmt -l .` across the full `backend/` tree (not filtered to this plan's files) reports a large number of pre-existing, unrelated files as not gofmt-clean -- almost certainly a Go toolchain-version formatting drift between whatever produced the repo's current state and the `golang:1.25-alpine` container used for this headless run, not something introduced by this plan. Verified every file this plan actually touched is individually gofmt-clean (`gofmt -l` on the explicit file list returns nothing). Not fixed (SCOPE BOUNDARY -- pre-existing, unrelated to this plan's task).
- Same class of DSN-gated (`TEAM4S_PHASE117_TEST_DSN`, `TEAM4S_PHASE128_TEST_DSN`) and live-backend-dependent (`TestPhase134Matrix*`) pre-existing test failures documented in Plans 01/02/05's SUMMARYs recur when running the unfiltered `./internal/repository/...` suite; none are related to Phase 167 and none were touched.

## User Setup Required

None — no external service configuration required. The isolated `team4s_phase167_test_1` Postgres database (created in Plan 02, left in place per the operator's instructions) was reused as-is; no schema changes were needed since this plan only writes to the already-present `fansub_group_aliases` table.

## Next Phase Readiness

This is the final plan of Phase 167. `resolveImportFansubSelection`'s auto-create removal and the alias-learning write path close D-01/D-02/D-03 end to end (preview-time auto-select from Plan 05, apply-time learn-and-audit from this plan). REQ-167-21 is documented with a concrete traced finding, not deferred assumption. No blockers for phase closure. One pre-existing, out-of-scope gap remains visible for a future phase: the bare-digit `Naruto_026-027` (no `E` prefix) double-episode filename style is not expanded by `parseEpisodeImportFilenameRangeEnd`'s current regex -- explicitly out of Phase 167's scope per `167-CONTEXT.md`'s Deferred Ideas.

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 8 created/modified files verified present on disk; all 3 task commit hashes
(`a9b051ba`, `30c4c38d`, `6bdb8ec4`) verified present in `git log`.
