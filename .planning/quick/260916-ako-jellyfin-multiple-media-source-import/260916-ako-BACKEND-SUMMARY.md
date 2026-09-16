---
phase: quick
plan: 260916-ako
task: 1
subsystem: jellyfin-import
status: complete
completed: 2026-09-16
requires: [phase-161-selected-source-snapshot]
provides: [complete-physical-source-enumeration, pair-scoped-import, source-unique-persistence]
affects: [episode-import, episode-version-editor, stream-source-selection]
commits: [48e31cf9, c61459bc]
---

# Quick 260916-ako Task 1: Backend execution summary

Every corroborated Jellyfin physical source is independently importable through a genuine Item/MediaSource pair, while aliases reuse one source row and source-specific metadata stays attached to the selected stream.

## Scope and commits

Task 1 only; frontend/contracts and integration/GSD state remain owned by the other executors. Canonical repository: /home/d1sk/team4s. Starting commit: 44268512. No push and no live backend/database activation performed by this executor.

- RED: 48e31cf9 — test(quick-260916-ako): reproduce lost Jellyfin sibling sources.
- GREEN: c61459bcf8f8ab89270518160b2408170443b504 — feat(quick-260916-ako): import every verified Jellyfin media source.
- No tracked file deletions. This summary deliberately remains uncommitted for the root integration/docs commit.

## RED evidence

1. TestEpisodeImport11eyesEnumeratesEveryPhysicalSource used the actual provider fixture: 27 Items, 52 nested representations, 38 distinct physical MediaSources. The old implementation returned 27 candidates and omitted the eleven real sibling source IDs. The new assertion checks the complete source set, not only the total, including three named files each for episodes 2 and 3.
2. TestEpisodeImportSourceSiblingPersistence executed in guarded real PostgreSQL. Before implementation, two sources under one Item were rejected with duplicate media_item_id before persistence.
3. Final review additionally reproduced TestEpisodeVersionSourceMultiStreamRelinkKeepsSelectedSource as RED: an earlier external stream made the edit path return conflict although the read path correctly selected Jellyfin. Matching write ordering made this GREEN.

## Implemented behavior

- Shared enumeration validates every MediaSource and retains genuine Item IDs. Import preview and editor folder scan share this seam.
- Exact pair keys distinguish siblings throughout request validation, batch hydration, stored snapshot lookup and apply planning.
- Physical aliases collapse only when source ID, normalized full path and episode/season/series context agree. A real standalone owner is preferred, then a deterministic Item ordering. Equal paths with different Source IDs remain distinct.
- Preview coverage suppresses only an already linked physical source. Previously unresolved rows require unique filename evidence under a corroborated Item/alias; ambiguity is an explicit conflict.
- Trusted filename uniqueness is computed from current provider membership and transported solely through json:"-" fields. A contract regression proves JSON cannot supply that evidence.
- Apply fetches distinct genuine Item IDs in existing bounded batches; no source ID is used as a fake Item. Server rehydration replaces browser technical fields.
- Sorted physical-source advisory locks precede graph writes. A selected-source unique index, row locking and same-anime ownership checks prevent alias/concurrent duplicate graphs.
- Existing aliases retain their persisted genuine owner and stream URL; release_streams.jellyfin_item_id follows that owner.
- GetByID decodes the snapshot from the same SQL result as the selected provider/Item/URL. Read and edit selectors follow existing Jellyfin-first, then stream-ID precedence. Metadata-only patches preserve sibling-specific tracks.
- Incomplete metadata can retain only the already bound physical source's tracks. A changed Source ID or contradictory path cannot borrow another source's snapshot.
- Existing shared decodeSelectedJellyfinSource is reused; no second media registry, auth flow or network endpoint was added.

## Schema

Migration 0166 is additive in behavior and does not rewrite row data. It replaces the old provider/Item uniqueness constraint with:
- partial provider/Item uniqueness for non-Jellyfin and unresolved Jellyfin rows, retaining NULLS NOT DISTINCT;
- selected Jellyfin physical Source-ID uniqueness within the currently configured server scope;
- a selected snapshot shape/version/source-ID check.

Before replacing protection, migration up refuses malformed selected snapshots and duplicate Source IDs. Down refuses provider/Item collisions introduced by siblings, rather than deleting or merging rows. Tests execute the real migration files against isolated schemas, including successful up/down, invalid existing-data refusal, safe failed rollback, malformed future writes and unchanged non-Jellyfin/unresolved NULL uniqueness.

No tables, playback contracts, NAS/provider files or provider configuration were introduced/changed. Multiple Jellyfin-server identity is explicitly outside this task.

## Verification

All commands ran inside isolated Docker containers with canonical backend bind mount and Go 1.25, the existing module/build cache, and the explicitly guarded database team4s_phase117_test_161. Application DATABASE_URL was not used. Fixtures allocate private schemas and normal cleanup is schema-scoped.

- Final relevant slice: **348 passed, 0 failed, 0 skipped**, measured from the complete final Go JSON output. Includes EpisodeImport, 11eyes, JellyfinSource, EpisodeVersion, ReleaseStream, ReleaseDetail and ThemeSegmentPlayback tests.
- Final complete handlers/repository/models: **1,970 passed, 224 skipped, 60 failed**. The entire failure set exactly equals the independently frozen 44268512 baseline: no new failures, no removed failures. The existing 60 failures are not repaired in this task.
- Frozen baseline: 1,944 passed, 224 skipped, same 60 failures.
- go build ./...: PASS.
- go vet ./...: PASS.
- git diff --check and staged diff check: PASS.
- No skips occurred in the required source/migration/persistence tests. Global skipped tests remain explicitly reported.

Commands, with TEAM4S_PHASE117_TEST_DSN set securely by the runner:

    go test ./internal/handlers ./internal/repository ./internal/models -count=1 -timeout 120s -json
    go test ./internal/handlers ./internal/repository ./internal/models -run 'Test.*(EpisodeImport|11eyes|JellyfinSource|EpisodeVersion|ReleaseStream|ReleaseDetail|ThemeSegmentPlayback)' -count=1
    go test ./internal/repository -run 'TestJellyfinSourceMigration' -count=1
    go build ./...
    go vet ./...
    git diff --check

Evidence:
- 260916-ako-BACKEND-BASELINE.json (root-owned frozen baseline).
- 260916-ako-BACKEND-FINAL-CHECKS.json (exact final failure set and zero delta).
- 260916-ako-BACKEND-BUILD.json (build/vet output).
- /tmp/team4s-ako-final-backend-tests.jsonl (raw final Go output on VM, transient).

## Request and query comparison

- Preview retains the existing provider collection requests; all returned nested MediaSources are projected locally. It does not issue a new request per source.
- Two sibling source selections under one Item: regression proves one exact Item batch request and one stored-binding batch call.
- 201 genuine Items: stored binding retrieval is verified as one SQL query, now preserving all returned source pairs.
- GetByID removes its former separate Item-global binding lookup; selected binding arrives with the existing primary row query.
- Writes deliberately add sorted advisory locking per confirmed physical source and selected-source/unresolved-row evidence queries. No unmeasured latency improvement is claimed.

## Files

Handlers: admin_episode_import.go, admin_episode_import_validation.go, admin_content_handler.go, admin_content_episode_version_editor_scan.go, episode_version_source_hydration.go, jellyfin_media_source.go.

Models: episode_import.go, jellyfin_source.go.

Repositories: episode_import_repository.go, episode_import_repository_apply.go, episode_import_repository_release_helpers.go, jellyfin_source_repository.go, episode_version_repository.go, episode_version_repository_read_helpers.go, episode_version_repository_write_helpers.go, release_stream_repository_helpers.go.

Tests: admin_episode_import_test.go, jellyfin_multisource_test.go, episode_version_source_hydration_test.go, admin_content_episode_version_editor_context_test.go, jellyfin_source_contract_test.go, episode_import_repository_test.go, episode_import_source_integration_test.go, episode_version_public_integration_test.go, episode_version_source_integration_test.go, jellyfin_source_fixture_test.go, jellyfin_source_migration_test.go.

Schema: database/migrations/0166_jellyfin_source_identity.{up,down}.sql.

## Deviations and remaining limits

- [Rule 1 — bug] Source selection on GetByID and its write path was made deterministic and matched to the existing shared selector after review exposed a possible mixed-stream mismatch. Added actual multi-stream read and relink regressions.
- Existing test fixtures were updated where they previously represented different physical files with the same Source ID, carried a contradictory old path after a changed selector, or lacked existing production metadata columns. No unrelated application behavior was changed to accommodate tests.
- Selection identity is Source ID within one configured Jellyfin server. A provider identity/path change is a review conflict/new source, never an automatic merge based on path alone.
- The old default source resolver remains available for existing unselected compatibility consumers. Confirmed import commands always require the explicit reviewed selector.
- One earlier failed fixture run was interrupted after a test fatal left an open transaction and blocked cleanup. The isolated test process was stopped; no live process or schema was touched. Follow-up checked retained task artifacts and backend test logs for the exact randomly generated private schema identifier; none was recorded. Therefore its continued existence and ownership cannot be conclusively established. No unidentified schema was removed, no database cleanup command was issued, and team4s_v2 was not accessed for this cleanup check. This bounded cleanup uncertainty remains.
- Live UI/import/playback confirmation belongs to root integration and the user. This summary makes no Human-UAT sign-off claim.

## Runtime activation handoff

Root must recheck the live migration runner and row preflight, expecting only 0166 pending, before coherent activation. The agreed runtime flow is a complete backend image build and service recreation; startup applies migration through the existing runner before Air starts. Do not copy partial Go files into the live backend. Root's current preflight reports 16 source rows, 4 selected snapshots, zero malformed snapshots and zero duplicate physical Source IDs. Recheck because runtime data may change.

The source code is committed and ready for activation at c61459bc. Required source and migration checks passed in isolated PostgreSQL. The root owns the separately authorized bounded live import and must clearly distinguish it from these fixture writes.

## Self-Check: PASSED

Verified RED and GREEN commits exist, both migration files and new tests exist, the staged diff contained only Task 1-owned files, no tracked file deletion was committed, final Go failure names match the baseline exactly, and build/vet succeeded after the final selector fix.
