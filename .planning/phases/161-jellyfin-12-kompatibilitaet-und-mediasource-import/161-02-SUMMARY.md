---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "02"
subsystem: api
tags: [jellyfin, mediasource, batch, go]
requires:
  - phase: 161-01
    provides: Shared origin-bound request transport
provides:
  - Typed private source snapshot and deterministic source resolution
  - Bounded exact item hydration shared by AdminContentHandler and FansubHandler
  - Source-coherent duration and complete episode collection checks
affects: [161-04, 161-05, 161-06, 161-07, 161-08, 161-09]
tech-stack:
  added: []
  patterns: [Private source snapshot, exact item batching, pure source resolver]
key-files:
  created:
    - backend/internal/models/jellyfin_source.go
    - backend/internal/models/jellyfin_source_test.go
    - backend/internal/handlers/jellyfin_media_source.go
    - backend/internal/handlers/jellyfin_media_source_test.go
    - backend/internal/handlers/jellyfin_source_batch.go
    - backend/internal/handlers/jellyfin_source_batch_test.go
  modified:
    - backend/internal/handlers/jellyfin_client.go
    - backend/internal/handlers/admin_content_test.go
key-decisions:
  - Reuse existing jellyfinEpisodeItem DTO, rather than introducing another upstream model.
  - Unknown audio and subtitle languages remain null; D-16 is a subsequent UI display policy.
  - A missing stored source cannot fall through to a different file.
requirements-completed: [P161-SOURCE, P161-API, P161-ITEMS, P161-METADATA]
completed: 2026-09-15
---

# Phase 161 Plan 02: Source snapshot and bounded hydration

The resolver selects one coherent MediaSource and projects only that source's technical values. Exact item hydration is shared between existing handlers and performs at most one metadata request per 100 unique requested item IDs.

## Completed tasks

1. Typed `models.JellyfinSourceSnapshot`, extended nested upstream DTOs and a pure resolver. Stored source ID takes priority, a unique full path can recover a changed ID, and lost/ambiguous binding fails. New binding uses unique own path or the sole source. It never borrows top-level streams. Representative audio is selected deterministically from the chosen source. Language parsing reuses installed x/text; unknown remains null.
2. Bounded exact-ID hydration through the existing JSON transport, now extracted for both handler owners. Empty input requests nothing. Missing/extra/duplicate IDs and inconsistent totals fail without returning a partial set. Episode collections retain totals and continue only when further results are promised. Duration uses the same source resolver and no wrong-first-item fallback.

## Commits

- `2bdfc470` — task 1 regression tests.
- `3fb37cd1` — typed snapshot and resolver.
- `0dc46200` — scoped formatting.
- `52c402db` — task 2 batch/duration regression tests.
- `a72737f4` — bounded hydration and shared JSON extraction.

## Verification

- Both task-specific planned Go gates passed in the backend container after owned source/test synchronization.
- Executor's expanded gate initially passed 171 tests with three dedicated DB fixtures skipped because that invocation lacked the explicit DSN. The coordinator reran the complete expanded gate with the guarded dedicated test database: **174 passes, zero failures, zero skips**. All three editor-context fixtures executed. Evidence: `docs/audits/2026-09-15-jellyfin12/plan02-checks.json`.
- Executor reported `go build ./...` and scoped `go vet` passing; eight owned files matched container SHA256 values.
- Source and diff review by coordinator confirmed shared transport reuse, isolated item/source identities and raw-null language policy.
- Full sanitized 11eyes fixture: 27 actual item candidates, 38 nested source identities, 11 alternatives without an item; 27 unique own-path selections. Episode 1 retains the three actual item candidates. Source order permutations do not change selected file metadata.
- Same binding with omitted MediaStreams can retain its previous tracks while marking the incoming projection incomplete. Explicit empty streams are complete and empty. Lost A binding cannot silently attach A tracks to B. Downstream persistence must enforce the same boundary.
- Request assertions include zero for empty input and ceil(unique IDs / 100) otherwise. No per-source or per-track discovery is introduced.

## Deviations and limits

- Actual existing upstream DTO name is `jellyfinEpisodeItem`; the plan's interface shorthand was adjusted to this existing seam.
- Updated one duration fixture in `admin_content_test.go` to include a coherent nested MediaSource. Its old top-level-only runtime cannot satisfy the newly required source selection.
- No application rows, provider library, migration, frontend file or runtime process changed. Snapshot persistence and duplicate-free DB import are still upcoming Plans 05/06; this plan proves source selection and exact request behavior only.
- Source is image-copied into backend `/app` for tests. The running application still requires the final controlled rebuild/restart.
- The executor reached its usage limit after committing implementation and running checks; the coordinator completed the dedicated DB rerun and this summary from committed evidence. No work was lost.
- Requirements above indicate this plan's coverage, not phase-wide completion. Global baseline failures remain separately recorded.

## Self-Check: PASSED

Both tasks are committed. All created files exist and the final source/JSON regression gate executed without skips. Root owns shared state updates.
