---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "05"
subsystem: api
tags: [jellyfin, postgres, import, transactions, mediasource]
requires:
  - phase: "161-02"
    provides: Typed source snapshot, deterministic resolver and bounded item hydration
  - phase: "161-04"
    provides: Reviewed source selectors and shared import contracts
provides:
  - Server-revalidated source-coherent preview and import apply
  - Shared locked stream-source snapshot persistence and one-query binding reads
  - Guarded PostgreSQL import idempotency and rollback fixtures
affects: ["161-06", "161-07", "161-08", "161-09"]
tech-stack:
  added: []
  patterns: [private JSONB namespace, source row locking before ownership lookup, bounded provider batch]
key-files:
  created:
    - backend/internal/repository/jellyfin_source_repository.go
    - backend/internal/repository/jellyfin_source_fixture_test.go
    - backend/internal/repository/episode_import_source_integration_test.go
  modified:
    - backend/internal/repository/episode_import_repository.go
    - backend/internal/repository/episode_import_repository_release_helpers.go
    - backend/internal/repository/episode_import_repository_test.go
    - backend/internal/repository/episode_version_repository_write_helpers.go
    - backend/internal/handlers/admin_content_handler.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_episode_import_validation.go
    - backend/internal/handlers/admin_episode_import_test.go
key-decisions:
  - "Lock the provider/item source row before graph ownership lookup to serialize concurrent imports into different anime."
  - "Apply reads canonical context without title-based provider discovery; confirmed IDs are the only hydration requests."
  - "A complete empty stream projection clears stream-derived columns; omitted streams retain complete tracks only on the same resolved binding."
patterns-established:
  - "upsertStreamSourceSnapshot owns stream_sources identity and only metadata.jellyfin_source; source IDs never become external_id."
  - "GetJellyfinSourceBindings performs one ANY-array query independent of track count."
requirements-completed: [P161-SOURCE, P161-METADATA, P161-ITEMS, P161-REGRESSION]
duration: approximately 25min
completed: 2026-09-15
---

# Phase 161 Plan 05: Source-coherent episode import Summary

**Reviewed Jellyfin item/source pairs are rehydrated before mutation, then stored with technical columns and tracks in the existing atomic release graph.**

## Accomplishments

- Shared source persistence updates provider/item/key-free URL and only the private `jellyfin_source` JSONB namespace. Unrelated JSON keys survive. Existing `ensureStreamSourceID` delegates to this seam; the duplicated import upsert was removed.
- One source row lock serializes binding checks with graph ownership lookup and metadata writes. Exact stored source IDs or permitted same-path recovery remain valid; different complete or incomplete bindings conflict. Missing streams on a new item cannot inherit another item's tracks.
- Both new and existing imports persist chosen-source filename, container, duration, codecs, tracks and normalized stream linkage. Complete empty streams clear previous codecs/quality; incomplete same-binding responses preserve the existing complete tracks.
- Confirmed mappings require exactly one matching candidate and reviewed source ID. Duplicate/missing candidates and conflicting selectors no longer overwrite map entries or synthesize item-only candidates.
- Apply hydrates only confirmed item IDs through the existing 100-item batch helper. It checks exact returned identity, Episode type, canonical series and folder membership, including the selected source's folder. Browser technical metadata, paths and URLs are discarded.
- Preview uses the shared resolver and carries the reviewed source ID into each mapping; coverage filtering remains intact. Unknown audio/subtitle languages remain null in the source snapshot.

## Task Commits

| Task | RED | GREEN |
|---|---|---|
| 1: Shared snapshot persistence and guarded fixture | `26e80f15` | `5b886230` |
| 2: Atomic create and repeat import | `7ac0ae94` | `285db87c` |
| 3: Rehydrate reviewed items before writes | `5c3afcbf` | `c3fa6cd4` |
| Review correction: complete empty versus omitted streams | `ce7967b4` | `080df3fe` |

Every RED gate failed before implementation. The first/third gates failed on missing symbols; the second and review gates exposed executable incorrect behavior in real PostgreSQL.

## Verification

All commands ran in the existing Linux Compose backend after synchronizing the changed source/test files into its image-copied `/app`. Repository files were edited only through SSH in `/home/d1sk/team4s`.

- `go test ./internal/repository -run 'TestJellyfinSourceRepository' -count=1`: passed.
- `go test ./internal/repository -run 'Test.*(EpisodeImport|JellyfinSourceRepository)' -count=1 -v`: passed, including all real database scenarios.
- `go test ./internal/handlers -run 'Test.*(EpisodeImport|11eyes)' -count=1 -v`: passed, including real database context loading for HTTP apply tests.
- `go test ./internal/testsupport -run TestPhase117 -count=1`: passed; dedicated DSN selection, database-name guard and schema guard remain enforced.
- `go build ./...`, `go vet ./...` and `git diff --check`: passed.

Required DB cases executed with `TEAM4S_PHASE117_TEST_DSN` targeting only `team4s_phase117_test_161`. The host read Compose credentials into memory, URL-escaped them, and passed the DSN only via subprocess environment. No secrets were printed or persisted. Fixtures reused `testsupport.OpenPhase117Postgres`, created unique guarded schemas, and cleaned only those schemas. No required test was counted as passing through a skip.

### Measured request and row counts

| Scenario | Assertion |
|---|---|
| 11eyes preview | 1 collection request, unchanged; 27 actual-item candidates from 38 distinct nested sources, including 11 source IDs that are not actual item IDs |
| Coverage filtering | 26 candidates after excluding one persisted actual item |
| Apply hydration | 0/1/1/2/3 provider requests for 0/1/100/101/201 confirmed items respectively |
| Apply binding lookup | 0 calls for no confirmed rows; exactly 1 batch for every nonempty selection |
| Real 201-item binding read | Exactly 1 traced SQL statement, 201 returned rows; unrequested item 201 excluded |
| Create/repeat graph | Exactly 1 row each in episodes, episode_titles, fansub_releases, release_versions, release_variants, release_streams, stream_sources, release_variant_episodes, release_version_groups, anime_fansub_groups and the fixture crew-seeding table |
| Rejected apply | 0 repository Apply calls for malformed/tampered selector, foreign series/folder/source path, missing/extra/duplicate returned IDs, stale source, incomplete new source and unavailable provider |
| Transaction rollback | All 11 graph tables, including timestamps and snapshots, unchanged after seven repository rejection scenarios |

Apply intentionally adds `ceil(N/100)` provider requests compared with the previous zero revalidation requests, plus one binding query. Canonical context reads and existing graph SQL remain; the complete transaction's statement total is not claimed. No source/track fan-out or nested-alternative import expansion was added.

## Files Created/Modified

- `jellyfin_source_repository.go`: shared source identity, namespace write, locked binding checks and batch reads.
- `jellyfin_source_fixture_test.go`: guarded source fixture, retention/conflict/concurrency assertions and traced 201-item query budget.
- `episode_import_source_integration_test.go`: reusable canonical apply fixture, technical-column assertions, graph counts, crew-seed invocation, rollback and known-empty stream semantics.
- `episode_import_repository.go`: strict confirmed candidate and source selector validation.
- `episode_import_repository_release_helpers.go`: locked source seam in both branches, source container and coherent technical updates, normalized stream idempotency.
- `episode_version_repository_write_helpers.go`: existing source upsert delegates to the shared helper without changing its current non-snapshot callers.
- `episode_import_repository_test.go`: existing tests updated to provide reviewed source candidates and inspect the moved shared SQL.
- `admin_content_handler.go`: batch binding method in the import repository interface.
- `admin_episode_import.go`: shared preview projection and server-side apply rehydration, canonical context without extra discovery, distinct 409/502 handling.
- `admin_episode_import_validation.go`: malformed/duplicate/missing selector guards and correct German UI text.
- `admin_episode_import_test.go`: 15 HTTP apply scenarios, batch budgets and sanitized 27-item preview regression.

## Deviations from Plan

1. **[Rule 1 - Bug] Existing test fixtures needed the now-required reviewed candidates.** Updated `episode_import_repository_test.go`, outside the plan's explicit file list but directly affected by the changed validation and moved SQL. No production scope expansion; verified in `285db87c`.
2. **[Rule 1 - Bug] Existing complete-empty refresh retained stale codecs through COALESCE.** Added a failing database regression and clear stream-derived fields when the provider reports a complete projection. Incomplete same-binding retention remains explicit. RED `ce7967b4`, fix `080df3fe`.
3. **[Rule 3 - Tooling] The repository's installed GSD wrapper uses direct command arguments.** `query` is unsupported; initialization/state reads used `./scripts/gsd-linux.sh init execute-phase 161` and `state load`. Root planning metadata updates are owned by the orchestrator and deliberately excluded from this executor's commits.

## Evidence Limits and Remaining Work

- Shared API contracts were already updated in Plan 04 and were inspected; this implementation uses those fields and documented 400/409/502 branches.
- Browser refresh-session behavior is unchanged here; the frontend contract/refresh checks belong to Plan 04 and integrated verification.
- Crew regression proves the import invokes its seeder once, after canonical group linkage; it does not rerun every real crew-service path.
- No live import, application-row mutation, provider rescan, migration, DB reset, service recreation, dependency installation, worktree or push occurred.
- Frontend typecheck/lint/build were not rerun for this backend-only plan. Existing broad Go failures remain outside scope in the phase baseline artifacts; no full-suite-green claim is made.
- Plan 06 must consume the shared source seam in create/patch writers. Plan 09 owns integrated live and broad gates.

## Known Stubs

None. Empty arrays in the rehydration path are intentional representations of zero confirmed items or known-empty streams.

## Threat Review

T161-05-1 is covered by untrusted-payload HTTP tests and canonical item/series/folder checks. T161-05-2 is covered by locked source binding tests and atomic graph rollback tests. T161-05-3 reuses the dedicated-database and unique-schema fixture guard. No additional endpoint, authentication path or production schema boundary was introduced.

## Self-Check: PASSED

All 11 created/modified source/test files exist. All eight task/review commits listed above exist. Focused tests executed against guarded schemas, build/vet passed, and the scoped working tree was clean before this summary.
