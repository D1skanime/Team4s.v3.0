---
phase: 167-fansub-gruppenerkennung-beim-import
plan: 05
subsystem: api
tags: [go, gin, fansub-matching, episode-import, preview-enrichment]

# Dependency graph
requires: ["167-01", "167-02"]
provides:
  - "enrichEpisodeImportPreviewFansubData(ctx, matchRepo, mappings) in backend/internal/handlers/admin_episode_import_fansub_match.go — wires Plan 01's DeriveReleaseVersion and Plan 02's ResolveFansubGroupMatches/SuggestSimilarFansubGroups into the actual PreviewEpisodeImport response"
  - "EpisodeImportFansubGroupMatchOrigin/EpisodeImportFansubGroupSuggestion additive display-only types plus FansubGroupMatchOrigin/FansubGroupSuggestions/ReleaseVersionSource fields on EpisodeImportMappingRow in backend/internal/models/episode_import.go"
  - "adminEpisodeImportRepository interface (admin_content_handler.go) extended with ResolveFansubGroupMatches/SuggestSimilarFansubGroups, satisfied structurally by *repository.EpisodeImportRepository (Plan 02)"
affects: [167-04, 167-07, 167-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "New handler-adjacent file (admin_episode_import_fansub_match.go) holds all new preview-enrichment logic; admin_episode_import.go gains exactly one call-site line to stay under the file-size ceiling"
    - "Single batch ResolveFansubGroupMatches call for the whole mappings slice (deduplicated candidates), with per-unresolved-row SuggestSimilarFansubGroups calls only when no exact match exists (D-08's constant-query-budget for the exact tier)"
    - "Reused the existing package-level stringPtr helper (group_assets_jellyfin.go) instead of declaring a duplicate"

key-files:
  created:
    - backend/internal/handlers/admin_episode_import_fansub_match.go
    - backend/internal/handlers/phase167_fansub_preview_enrich_test.go
  modified:
    - backend/internal/models/episode_import.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_episode_import_test.go

key-decisions:
  - "Task 2 was tagged tdd=\"true\" in the plan, but the plan itself explicitly deferred all test coverage to the separate Task 3 (<behavior> block says 'Covered by Task 3's table-driven unit test'). Followed the plan's explicit two-task structure literally (Task 2 = implementation, verified only via go build; Task 3 = tests, verified via go test) rather than forcing a RED-before-GREEN commit order within Task 2 alone. Net effect: the git log has feat(167-05) commits before the test(167-05) commit, not the canonical test-then-feat TDD order. See TDD Gate Compliance section below."
  - "Reused the pre-existing package-level stringPtr(value string) *string helper (backend/internal/handlers/group_assets_jellyfin.go:606) instead of the plan's suggested local duplicate, since Go forbids a second declaration in the same package — discovered as a build error immediately after writing the new file (Rule 3 auto-fix)."
  - "Extended the pre-existing episodeImportSourceRepoSpy test fake (admin_episode_import_test.go) with no-op ResolveFansubGroupMatches/SuggestSimilarFansubGroups methods so three unrelated existing tests (TestEpisodeImportSourceApplyRevalidatesBeforeWrite and two others) kept compiling against the now-larger adminEpisodeImportRepository interface (Rule 3 auto-fix — blocking compile error caused directly by this plan's interface extension)."

requirements-completed: [REQ-167-07, REQ-167-08, REQ-167-09, REQ-167-11, REQ-167-12, REQ-167-18, REQ-167-22]

# Metrics
duration: ~18min
completed: 2026-09-23
---

# Phase 167 Plan 05: Fansub-Vorschau-Verdrahtung Summary

**`enrichEpisodeImportPreviewFansubData` wires Plan 01's hardened filename parser and Plan 02's batch-matching repository into the real `PreviewEpisodeImport` response — one batch exact-match query plus bounded per-row suggestion queries, auto-selecting groups with a visible origin, never overwriting operator-confirmed rows or explicit release versions — while `admin_episode_import.go` grows by exactly the one required call-site line (775 → 776).**

## Performance

- **Duration:** ~18 min (including context loading; task commits span 2026-09-23T14:37:19Z–14:40:44Z)
- **Tasks:** 3/3 completed
- **Files modified:** 6 (4 modified, 2 created)

## Accomplishments

- `EpisodeImportMappingRow` carries three new additive, display-only fields (`fansub_group_match_origin`, `fansub_group_suggestions`, `release_version_source`) matching Plan 04's TypeScript contract byte-for-byte on JSON keys, plus the two new supporting Go types `EpisodeImportFansubGroupMatchOrigin`/`EpisodeImportFansubGroupSuggestion`.
- New `backend/internal/handlers/admin_episode_import_fansub_match.go` (123 lines) implements `enrichEpisodeImportPreviewFansubData`:
  1. Detects a v2/v3/v4 release version per row via `importutil.DeriveReleaseVersion` when `ReleaseVersion` is unset, never overwriting an explicit value.
  2. Collects distinct non-empty `FansubGroupName` candidates across the whole mappings slice and calls `ResolveFansubGroupMatches` exactly once (D-08's constant-query-budget for the exact tier).
  3. Applies exact matches (alias/name/slug) by setting `FansubGroupID`/`FansubGroups`/`FansubGroupMatchOrigin`, skipping any row already `status: confirmed` (never silently overwrite an operator-confirmed selection).
  4. For rows with no exact match, calls `SuggestSimilarFansubGroups` once per unresolved row (never for an empty candidate) and attaches up to 3 fuzzy suggestions, never auto-applying them (D-03/D-12).
- `admin_content_handler.go`'s `adminEpisodeImportRepository` interface gained the two Plan 02 methods (`ResolveFansubGroupMatches`/`SuggestSimilarFansubGroups`) — a structural, zero-runtime-behavior-change extension since `*repository.EpisodeImportRepository` already implements both.
- `admin_episode_import.go` gained exactly one line — `preview.Mappings = enrichEpisodeImportPreviewFansubData(...)` — between the existing `buildEpisodeImportPreview` call and the `c.JSON` response. Verified: 775 → 776 lines (+1).
- `phase167_fansub_preview_enrich_test.go` (214 lines, new) proves all 7 plan-mandated cases against a hand-rolled `fakeFansubGroupMatchResolver` (no DB, no gin/httptest): exact alias match, suggestion fallback, empty-candidate no-op (with an explicit assertion that `SuggestSimilarFansubGroups` is never called for an empty candidate), v3 detection, never-overwrite-explicit-version, single-batch-call budget across 2 rows sharing one candidate, and confirmed-row protection.

## Task Commits

1. **Task 1: Additive model fields** — `e5a9969d` (feat): `EpisodeImportFansubGroupMatchOrigin`/`EpisodeImportFansubGroupSuggestion` types and the three new fields on `EpisodeImportMappingRow`. `go build ./internal/models/...` clean; field-name grep count = 3 as required.
2. **Task 2: enrichEpisodeImportPreviewFansubData + minimal wiring** — `83bb8855` (feat): new file, interface extension, single call-site line. `go build ./...` clean; `admin_episode_import.go` confirmed at 776 lines (775 baseline + 1).
3. **Task 3: Unit tests** — `16003c0b` (test): 7 sub-tests, all passing, plus a required Rule-3 fix to the pre-existing `episodeImportSourceRepoSpy` fake (see Deviations).

## Files Created/Modified

- `backend/internal/models/episode_import.go` (193 lines, was ~164) — additive types/fields only, no existing struct field removed or renamed.
- `backend/internal/handlers/admin_episode_import_fansub_match.go` (123 lines, new) — `fansubGroupMatchResolver` interface, `enrichEpisodeImportPreviewFansubData`.
- `backend/internal/handlers/admin_content_handler.go` — `adminEpisodeImportRepository` interface extended by 2 methods.
- `backend/internal/handlers/admin_episode_import.go` (776 lines, was 775) — exactly one line inserted, nothing else touched.
- `backend/internal/handlers/phase167_fansub_preview_enrich_test.go` (214 lines, new) — `fakeFansubGroupMatchResolver`, `TestEnrichEpisodeImportPreviewFansubData` (7 sub-tests).
- `backend/internal/handlers/admin_episode_import_test.go` — pre-existing `episodeImportSourceRepoSpy` fake extended with 2 no-op methods (Rule 3 auto-fix, see Deviations).

All files well under the CLAUDE.md 450-line ceiling.

## Real Commands Run

Build/format (scratch container, backend bind-mounted from host):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine \
  sh -c "gofmt -l -w <files> && go build ./..."
```

Target unit test (per plan's success criteria):
```bash
docker run --rm -v /home/d1sk/team4s/backend:/app -w /app \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine \
  go test ./internal/handlers/... -run TestEnrichEpisodeImportPreviewFansubData -v
```
Result: all 7 named sub-tests PASS, exit 0.

Full-repo verification (mounting the whole repo root, not just `backend/`, to reach the `docs/audits/.../fixtures/*.json` files two unrelated pre-existing tests read from a relative path — see Issues Encountered):
```bash
docker run --rm -v /home/d1sk/team4s:/repo -w /repo/backend \
  -v gomodcache:/tmp/gomodcache -v gocache:/tmp/gocache \
  -e GOMODCACHE=/tmp/gomodcache -e GOCACHE=/tmp/gocache \
  --network team4s_default golang:1.25-alpine \
  sh -c "go build ./... && go vet ./... && go test ./internal/handlers/... ./internal/models/... ./internal/importutil/..."
```
Result: `ok` for all three packages, no failures, `go vet` clean.

## Decisions Made

See `key-decisions` in the frontmatter above (stringPtr reuse, episodeImportSourceRepoSpy extension, and the Task 2/Task 3 TDD-tag/task-structure note).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Duplicate `stringPtr` declaration**
- **Found during:** Task 2, first `go build ./...` after creating `admin_episode_import_fansub_match.go`.
- **Issue:** The plan's `<action>` suggested defining a tiny local `func stringPtr(s string) *string` in the new file if no equivalent existed. `backend/internal/handlers/group_assets_jellyfin.go` already declares a package-level `func stringPtr(value string) *string` with identical semantics (`return &value`), so my new declaration was a compile-blocking redeclaration in the same package.
- **Fix:** Removed the local declaration; reused the existing `stringPtr`.
- **Files modified:** `backend/internal/handlers/admin_episode_import_fansub_match.go`.
- **Commit:** `83bb8855`.

**2. [Rule 3 - Blocking issue] `adminEpisodeImportRepository` interface extension broke 3 pre-existing tests' compilation**
- **Found during:** Task 3, first `go build ./...`/`go test` run.
- **Issue:** `episodeImportSourceRepoSpy` (a pre-existing test fake used by `TestEpisodeImportSourceApplyRevalidatesBeforeWrite` in `admin_episode_import_test.go`, and referenced by `jellyfin_multisource_test.go`) no longer satisfied `adminEpisodeImportRepository` after Task 2 added the two new methods to that interface, causing a build failure across 3 unrelated test call sites.
- **Fix:** Added no-op `ResolveFansubGroupMatches`/`SuggestSimilarFansubGroups` methods (returning `nil, nil`) to `episodeImportSourceRepoSpy`, matching the same minimal-fake style already used for its other methods.
- **Files modified:** `backend/internal/handlers/admin_episode_import_test.go`.
- **Commit:** `16003c0b`.

## TDD Gate Compliance

Task 2 carried `tdd="true"` in the plan frontmatter, but the plan's own `<behavior>` block for Task 2 explicitly states the behavior is "Covered by Task 3's table-driven unit test" — i.e., the plan itself split what would normally be one RED/GREEN/REFACTOR cycle into two separately-committed, separately-verified tasks (Task 2 = implementation, gated only by `go build`; Task 3 = tests, gated by `go test`). Followed the plan's explicit task boundary literally rather than reinterpreting it into a single-task RED-then-GREEN cycle. Net effect in git log: `feat(167-05)` commits (`e5a9969d`, `83bb8855`) precede the `test(167-05)` commit (`16003c0b`), the reverse of the canonical TDD gate order (test-commit-before-feat-commit). No RED phase was ever entered for Task 2's own commit boundary — this is a plan-authored task-structure choice, not a shortcut taken by this executor, and every one of the 7 required test cases from the plan's Task 3 action list is present and passing.

## Issues Encountered

- **Test environment fixture path (pre-existing, unrelated to this plan):** Running `go test ./internal/handlers/...` unfiltered inside a scratch container with only `backend/` bind-mounted produces `open ../../../docs/audits/2026-09-15-jellyfin12/fixtures/11eyes-series.json: no such file or directory` for `TestEpisodeImport11eyesEnumeratesEveryPhysicalSource` and `TestJellyfinSourceBatch11eyes_OneCollectionNoAlternativeDiscovery` — both read a fixture via a relative path that resolves outside the `backend/` directory. Confirmed unrelated to this plan by re-running the same tests with the full repo root mounted (`-v /home/d1sk/team4s:/repo`), where both pass cleanly. This is the same class of test-environment mechanic documented in Plan 02's SUMMARY (migration-path-relative tests needing the full repo root), not a code regression from this plan.

## User Setup Required

None — no external service configuration required. Pure Go, no new dependencies.

## Next Phase Readiness

`enrichEpisodeImportPreviewFansubData` is live in `PreviewEpisodeImport`'s response path, so a fresh preview now returns `fansub_group_match_origin`/`fansub_group_suggestions`/`release_version_source` per row exactly as Plan 04's TypeScript contract expects (167-UI-SPEC.md's Datenvertrag table). Plan 07 (UI origin-hint/suggestion/conflict rendering) can consume these fields directly; `EpisodeImportFansubGroupMatchOrigin.AliasID` is populated whenever `MatchedVia == "alias"` and ready for Plan 07/08's `reassignFansubAlias` "Trotzdem umhängen" flow. No blockers. Note per 167-UI-SPEC.md: `fansub_alias_conflict` is intentionally NOT a server-populated field (client-side-derived, Plan 07's responsibility) and was correctly not added here.

---
*Phase: 167-fansub-gruppenerkennung-beim-import*
*Completed: 2026-09-23*

## Self-Check: PASSED

All 5 created/modified core files verified present on disk; all 3 task commit hashes
(`e5a9969d`, `83bb8855`, `16003c0b`) verified present in `git log`.
