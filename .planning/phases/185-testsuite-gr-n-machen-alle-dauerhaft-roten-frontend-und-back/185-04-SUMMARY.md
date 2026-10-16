---
phase: 185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back
plan: 04
subsystem: testing
tags: [go, httptest, jellyfin, backend, docker, golang-1.25]

# Dependency graph
requires:
  - phase: 185-03
    provides: migration-dir resolution fix groundwork for the same backend test suite
provides:
  - "Evidence-backed conclusion: the 3-test Jellyfin-preview-EOF cluster is a REAL product/test-fixture
    bug, not an Alpine/musl environment artifact (D-03a resolved as 'real bug' branch, not
    'Alpine-specific')"
  - "Both test files' mock Jellyfin servers now correctly distinguish hydrateJellyfinFolderDisplayNames's
    unconditional multi-folder batch /Items call from the GAP-07 folder-filter-path lookup"
  - "185-11's scripts/test-backend.sh image choice is UNCONSTRAINED by this plan -- either
    golang:1.25 or golang:1.25-alpine works for this cluster, since the bug (not the image) was
    the cause; 185-11 should pick whichever image best serves OTHER clusters (e.g. the vips-tools
    cluster noted in 185-CONTEXT.md needs Alpine-compatible packages or a Debian equivalent)"
affects: [185-11]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mock httptest Jellyfin servers that assert exact call counts on /Items must branch on the
      Ids query parameter when a handler's folder-hydration side effect (hydrateJellyfinFolderDisplayNames)
      can ALSO hit the same path -- distinguish by the comma-joined Ids value rather than assuming a
      single call shape."

key-files:
  created: []
  modified:
    - backend/internal/handlers/admin_episode_import_folder_filter_test.go
    - backend/internal/handlers/admin_episode_import_ownership_test.go

key-decisions:
  - "D-03a resolved via reproduction, not assumption: the cluster reproduces 100% deterministically
    (2/2 runs) on BOTH golang:1.25 (Debian) and golang:1.25-alpine -- ruling out Alpine/musl
    specificity. The symptom in the Ist-Stand analysis (EOF) was a side effect of require.Equal
    failing mid-handler for an unexpected /Items call shape, not of connection-reuse timing."
  - "Fixed in the test files, not production code: hydrateJellyfinFolderDisplayNames's unconditional
    multi-folder /Items batch call is itself correct, existing, intentional (fail-open) behavior
    (GAP-01, T-QUICK260924-B7S). The 3 tests' mock servers simply never accounted for it when it
    was added after these tests were written. Mock servers now answer the hydration batch call
    (Ids=series-401,series-402) without counting it toward the GAP-07-specific itemsRequests
    assertion."

patterns-established:
  - "When a httptest mock asserts call counts against a handler with fail-open background side
    effects, branch the mock's case on the request's distinguishing query parameter value rather
    than assuming one call shape per path."

requirements-completed: [D-03]

# Metrics
duration: 25min
completed: 2026-10-16
---

# Phase 185 Plan 04: Jellyfin-Preview-EOF-Cluster — Real Bug, Not Alpine Artifact Summary

**Reproduced the 3-test Jellyfin-EOF cluster twice on both golang:1.25 Debian and golang:1.25-alpine (4 runs total), found it 100% deterministic on both — proving it is a real test-fixture/product mismatch (hydrateJellyfinFolderDisplayNames's unconditional multi-folder batch call), then fixed it in the two test files by distinguishing the hydration call from the GAP-07 folder-filter-path lookup.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-10-16T20:05:00Z (approx)
- **Completed:** 2026-10-16T20:31:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Reproduced the exact 3-test cluster (`TestPreviewEpisodeImport_ExplicitAdditionalFolderReturnsThatFoldersEpisodes`,
  `TestPreviewEpisodeImport_MainFolderRegressionStaysUnchanged`,
  `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard`) under both `golang:1.25`
  (Debian) and `golang:1.25-alpine`, `-count=2` each (4 full runs total), via disposable
  `team4s_phase117_test_*` databases on the running `team4sv30-db` container, networked through
  `team4s_default`.
- Established the root cause with evidence: `hydrateJellyfinFolderDisplayNames`
  (`backend/internal/handlers/jellyfin_folder_display_names.go`) unconditionally issues ONE
  batched `/Items` call for ALL connected folders whenever `loadEpisodeImportContext` sees 2+
  folders — independent of, and in addition to, the GAP-07 folder-filter-path lookup that these
  three tests' mock servers were written to expect as the ONLY `/Items` call. This call is a
  pre-existing, intentional, fail-open feature (GAP-01, `T-QUICK260924-B7S`), not a new bug in
  production code.
- Concluded: **real bug (test-fixture mismatch), not Alpine-specific** — ruling out D-03a's
  "Alpine/musl" hypothesis with direct evidence (identical deterministic failure on Debian).
- Fixed both affected test files by having their mock Jellyfin servers branch on the `Ids` query
  parameter: the hydration batch call (`Ids=series-401,series-402`) is now answered without being
  counted toward the GAP-07-specific `itemsRequests` assertions, which remain scoped to the
  single-series folder-filter-path lookup they were originally written to verify.
- Re-ran the 3-test cluster twice on both images after the fix: **28/28 passing, 0 failures, on
  both `golang:1.25` and `golang:1.25-alpine`**, confirming the fix holds universally as required
  by the plan's acceptance criteria for the "real bug" branch.
- `go vet ./internal/handlers/...` clean after the fix.
- All three disposable `team4s_phase117_test_*` databases created for this investigation were
  dropped after verification; `team4s_v2` was never touched.

## Task Commits

Both tasks are captured in a single commit because Task 1 (reproduction) produced a conclusion
and evidence only — no file changes — and Task 2 (the fix) is the sole code-change commit:

1. **Task 1: Reproduce the 3-test cluster under golang:1.25 Debian** — no commit (investigation
   only; conclusion recorded here and informed Task 2's branch)
2. **Task 2: Apply the branch-dependent fix (real-bug branch)** - `e1f0beaa9` (fix)

**Plan metadata:** (this commit, created alongside STATE.md/ROADMAP.md update)

## Files Created/Modified

- `backend/internal/handlers/admin_episode_import_folder_filter_test.go` — both multi-folder tests'
  mock Jellyfin servers now distinguish `hydrateJellyfinFolderDisplayNames`'s batch `/Items` call
  (`Ids=series-401,series-402`) from the GAP-07 single-series lookup; `itemsRequests` counts only
  the latter.
- `backend/internal/handlers/admin_episode_import_ownership_test.go` — same fix applied to
  `TestPreviewEpisodeImport_MultiFolderRequestedSeriesIDPassesGuard`'s mock server.

## Decisions Made

- **D-03a resolved as "real bug", not "Alpine-specific"**: both Debian and Alpine runs failed
  identically and deterministically (2/2 each), so the documented backend test-runner image
  choice for Plan 185-11's `scripts/test-backend.sh` is **not constrained by this cluster** —
  either image works equally well/poorly for this specific cluster now that it's fixed. Plan
  185-11 should base its image choice on other clusters in 185-CONTEXT.md (e.g. the
  `vips-tools`/`ffmpeg` media-handler cluster, which per the Ist-Stand analysis needs
  Alpine-specific `apk` packages matching the production `backend/Dockerfile`, or an equivalent
  Debian toolchain).
- **Test-only fix preferred over product-code change**: per the plan's explicit guidance, since
  the newly-discovered extra call is existing, intentional, fail-open production behavior
  (`hydrateJellyfinFolderDisplayNames`, GAP-01), the fix lives entirely in the two test files' mock
  server logic — zero production code was touched.

## Deviations from Plan

None — plan executed exactly as written. The plan explicitly anticipated both branches (D-03a
Alpine-specific vs. real bug) and instructed the real-bug branch's exact remediation strategy
(test-side mock-server fix, re-verify on both images twice). That branch applied, and was
followed precisely.

## Issues Encountered

- The disposable Postgres fixture databases (`team4s_phase117_test_*`) required for
  `openEVECFixture` had to be created manually on the running `team4sv30-db` container and the
  test containers run with `--network team4s_default` plus `TEAM4S_PHASE117_TEST_DSN` pointed at
  the service name `team4sv30-db:5432` — without this the Postgres-backed subset of
  `TestPreviewEpisodeImport_*` would `t.Skip()` rather than exercise the real bug. Used a local Go
  module/build cache bind-mount (`/tmp/gomodcache185`, `/tmp/gocache185`) across all four runs to
  avoid re-downloading dependencies on every `docker run` invocation.
- The symptom actually observed (an `Ids` query-parameter mismatch plus a downstream `EOF`
  propagated from the handler's early-return branch of `require.Equal`) looked superficially
  different from the Ist-Stand analysis's terse "EOF statt Antwort" description, but is the exact
  same root cause: an extra, previously-unaccounted-for `/Items` call hitting a mock switch-case
  written to expect only one shape of that call.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- D-03a is fully resolved with evidence; Plan 185-11 (D-07, `scripts/test-backend.sh`) can proceed
  without being forced into a Debian image by this cluster specifically — the image-choice
  decision there should be driven by the OTHER backend clusters noted in 185-CONTEXT.md.
- No blockers introduced for subsequent plans in this phase.

## Self-Check: PASSED

- FOUND: backend/internal/handlers/admin_episode_import_folder_filter_test.go
- FOUND: backend/internal/handlers/admin_episode_import_ownership_test.go
- FOUND: commit e1f0beaa9
- FOUND: .planning/phases/185-testsuite-gr-n-machen-alle-dauerhaft-roten-frontend-und-back/185-04-SUMMARY.md
