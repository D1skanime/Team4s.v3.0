---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "08"
subsystem: public-release
tags: [jellyfin, media-source, postgres, public-metadata, playback, cache, regression]
requires:
  - phase: 161-07
    provides: Shared selected variant/source SQL and source-aware playback/cache
provides:
  - Public scalar and track projection from one selected source SQL snapshot
  - Audio-only Japanese display default without changing nullable raw language
  - Guarded playback/public coherence, bounded-query and persisted cache isolation evidence
  - Credential-free Jellyfin URL projection through the existing release DTO mapper
affects: [161-09]
tech-stack:
  added: []
  patterns:
    - Same SQL snapshot for source binding and technical scalar fields
    - Snapshot tracks are authoritative including empty and unknown values
    - Shared guarded fixture and test-only bridge for public/playback integration
key-files:
  created:
    - backend/internal/repository/release_detail_public_source_integration_test.go
  modified:
    - backend/internal/repository/release_variant_source_repository.go
    - backend/internal/repository/release_detail_public_repository_helpers.go
    - backend/internal/repository/theme_segment_playback_resolution_integration_test.go
    - backend/internal/testsupport/phase117_postgres.go
    - backend/internal/repository/episode_import_source_integration_test.go
    - backend/internal/repository/episode_version_public_integration_test.go
    - backend/internal/handlers/episode_version_source_hydration_test.go
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.tsx
    - frontend/src/app/anime/[id]/group/[groupId]/releases/[releaseVersionId]/ReleaseDetailHero.test.tsx
    - backend/internal/jellyfin/request.go
    - backend/internal/jellyfin/request_test.go
    - backend/internal/repository/episode_version_repository_read_helpers.go
    - backend/internal/repository/episode_version_stream_identity_test.go
    - shared/contracts/openapi.yaml
    - shared/contracts/episode-versions.yaml
key-decisions:
  - Extend the exact selected variant/source statement; never reread scalar fields after selecting its binding.
  - Selected audio codec/language use one selected audio index; source subtitle codec and flags remain factual.
  - No-snapshot fallback is limited to the selected variant and never requests Jellyfin.
  - Only unknown audio display defaults to Japanisch; API, database and subtitle languages remain unchanged.
  - Sanitize stored Jellyfin URLs during shared DTO projection without rewriting stored rows.
requirements-completed: [P161-SOURCE, P161-METADATA, P161-REGRESSION]
duration: 11min
completed: 2026-09-15
---

# Phase 161 Plan 08: Coherent public technical facts Summary

**Public container, selected audio and subtitle facts share one source snapshot with playback, while unknown audio alone displays Japanisch without changing raw data.**

## Performance and Ownership

- Tasks: 3/3; 16 implementation/contract/test files plus this summary.
- Recorded task span begins at first RED 2026-09-15T15:28:48Z; approximately 11 minutes through final verification/summary.
- Canonical checkout: /home/d1sk/team4s through SSH team4s-linux, existing Compose only.
- Executor owned backend Tasks1/3 and summary. Root owned Task2 frontend. Root delegated a bounded live URL-output correction to the Plan07 executor.
- Root owns STATE/ROADMAP/REQUIREMENTS/DECISIONS and audit evidence; those files were not staged by this executor.

## Accomplishments

- Extended the exact Plan07 `selectedReleaseVariantSourceSQL` and record with duration/resolution/container/codecs/subtitle classification plus legacy language projection. Scalar values and private source binding are read in the same PostgreSQL statement. Default/explicit ownership and stream preference remain unchanged.
- `loadReleaseTechnical` now uses that shared selector instead of first-variant scalar selection followed by all-variant subtitle aggregation. The chosen audio index supplies both codec and nullable language. Every snapshot subtitle projects its real codec, default/forced flags and display title; absent title falls back to explicit known language, then neutral `Untertitel <index>`.
- A present snapshot is authoritative: complete-empty means no tracks, unknown language remains null, and stale scalar/legacy language values cannot fill snapshot gaps. Absent-snapshot fallback is restricted to the chosen variant. Legacy subtitle classification is not presented as a codec; absent codec remains null.
- Public reads expose only existing technical DTO fields and require no provider calls. The same query is used by release and theme consumers, so a concurrent relink cannot pair a separately read old binding with new scalars.
- Root changed only the existing Audio-Sprache fact: null, trimmed-empty or case-insensitive und displays Japanisch; de/Deutsch and ja/Japanisch retain their existing known-language representation. Subtitle formatting, layout, flags and raw DTO values remain unchanged.
- Required real-DB acceptance reuses the public fixture and proves default/explicit source ownership, sibling isolation, no-snapshot read-only behavior, one-query hydration for every consumer even with 201 tracks, and distinct persisted A/B source fingerprints/cache keys under the same genuine item. Existing request-level worker tests still reject source drift before FFmpeg and prevent cached A from satisfying B.

## Task Commits

| Work | RED | GREEN / acceptance |
| --- | --- | --- |
| Task1: Coherent public projection | `b8421cc7` | `46c6867e` |
| Task2: Audio display default (root) | `9b0e54ec` | `25303b7d` |
| Task3: Final DB/public/playback/cache acceptance | Existing completed behavior | `2f5f01ed` |
| Bounded live URL-output fix | `47b04894` | `a4be0224` |

Task1 RED exposed two independent SQL reads and sibling subtitle mixing. Task2 RED had 7 failures/10 passes before the two-line UI change. The URL-output RED reproduced credential-bearing stored values escaping through the existing DTO mapper.

## Verification

All required PostgreSQL tests actually executed against unique schemas in `team4s_phase117_test_161`. No required case was skipped. Credentials were inspected in memory, URL-escaped and supplied only to a subprocess environment passed with `docker exec -e TEAM4S_PHASE117_TEST_DSN`; no key or DSN was printed/persisted.

- Task1: `go test ./internal/repository -run 'TestPublicReleaseTechnicalSource' -count=1 -v` — 3 top-level tests and 4 subtests passed.
- Task3: `go test ./internal/repository -run 'Test.*(ThemeSegmentPlaybackResolution|PublicReleaseTechnicalSource|SourceIdentity|JellyfinSourceRepository)' -count=1 -v` — 9 top-level tests and 13 subtests passed, zero skips. Includes existing source namespace/retention, rejected incomplete/new/stale binding rollback and locked-writer tests.
- Final combined: `go test ./internal/repository ./internal/handlers ./internal/services -run 'Test.*(PublicReleaseTechnicalSource|ThemeSegmentPlaybackResolution|JellyfinSourceRepository|ReleaseStreamIdentity|SegmentSourceIdentity|SegmentRenderWorker|SegmentSubtitle|EpisodeVersionSource|EpisodeImportSource|EpisodeImportApply|11eyes)' -count=1 -json` — repository 22 top-level +25 subtests, handlers 27+57, services 1+0; total 50 top-level +82 subtests, zero skips/failures.
- The combined handler gate preserves actual source-order selection, worker drift-before-FFmpeg, same-source subtitle/video execution, source-aware cached grants, zero-provider metadata saves and import/11eyes request budgets.
- `go vet` and `go build` for `./internal/repository ./internal/handlers ./internal/services ./internal/models ./internal/testsupport` — passed with the final URL-sanitization source already copied.
- Task2: the existing ReleaseDetailHero Vitest file — 17/17 passed. Cases cover null/blank/und variants, known German/Japanese values, unknown ASS subtitle/flags, unchanged DTO and no private-source output. Scoped ESLint for its two files: zero issues.
- URL-output correction: `go test ./internal/jellyfin ./internal/repository -run 'Test(SanitizeURL|Request|IsConfiguredOrigin|EpisodeVersionStreamURLProjection)' -count=1 -v` — 11 top-level tests/26 pass events, zero skips. Jellyfin: 9 top-level +8 subtests; repository: 2+7. Six credential-name variants and five malformed URL loop assertions are covered, plus seven provider/projection scenarios and actual Create/Update projection. Its scoped vet/build also passed. This separate gate is not included in the 50/82 combined count above.
- OpenAPI parsed successfully. The focused episode-versions DSL has an existing YAML parse issue at its unquoted `min: 1, max: 30` field declaration near line474; confirmed present before this plan's URL description edit. The scoped description change did not introduce it.
- Changed Go files formatted in Compose; `git diff --check` passed.

### Exact SQL and request budgets

- Public technical projection: one SQL statement/one returned row for 0, 1 and 201 subtitle tracks.
- In the shared final fixture, release playback, theme playback and public technical projection each perform exactly one SQL statement/one row for selected-snapshot, no-snapshot and 201-track cases. No per-track queries or second scalar selection were added.
- Missing variant is one query and returns empty tracks with nullable facts.
- The existing 201-item binding batch still executes one statement returning 201 rows.
- Public/DB source projection makes zero Jellyfin requests; it has no upstream enrichment path.
- URL DTO sanitization adds zero SQL statements and zero HTTP calls. Fixture SQL confirms source rows remain unchanged.

## Deviations from Plan

1. **[Rule3 - Fixture blocker] Shared real technical schema.** Extending the common playback selector requires real scalar/language columns in the guarded Phase117 base fixture. Added those columns and the languages table in `testsupport/phase117_postgres.go`; adjusted existing column declarations in episode-import-source, episode-version-public and handler source-hydration fixtures to avoid duplicate definitions. These are disposable schema fixtures only; no runtime schema probing, compatibility expressions, migration or backfill was added. Committed in `46c6867e`.

2. **[Rule2 - Test reuse] Test-only public fixture/projection bridge.** The external repository test package imports services, which already imports repository. Two exported helpers located only in the public `_test.go` file let its theme integration reuse the exact fixture and `loadReleaseTechnical` seam without an import cycle, duplicate fixture or new production API. Committed in `2f5f01ed`.

3. **[Rule1 - Live credential disclosure] Existing stored URL projection.** Root's signed-in editor check found credentials from a stored Jellyfin URL visible in the existing editor. The bounded fix extends the central URL sanitizer and existing shared EpisodeVersion row mapper, covering Get/List/editor/Create/Update output. Jellyfin credential query variants are removed; malformed Jellyfin URLs are omitted; other providers retain their existing values. Source database rows are untouched. Existing stream_url descriptions were updated in both contract surfaces. Root authorized this phase-DoD correction; commits `47b04894`/`a4be0224`. No actual stored URL or credential is reproduced here.

## TDD Gate Compliance

Task1 and Task2 have real RED/GREEN commits. Task3 is marked TDD in the plan but owns only acceptance test files over already completed Plan07 and Task1 behavior. Its first executable integration run passed after verifying those seams already implement the required behavior. It therefore has a test-only acceptance commit, with no artificial failure or unnecessary production change. This bounded workflow deviation was reported to root.

## Evidence Limits and Next Readiness

- No new public endpoint, authentication scheme, language registry, UI layout, dependency or production schema was introduced. No application rows, Jellyfin media, runtime environment or services were recreated.
- Backend /app is image-copied. Coherent changed Go/test sets were copied before gates; production Go copies can trigger Air rebuild/restart. Frontend /app is bind mounted.
- The A/B drift integration mutates only guarded fixture rows to model an independently changed binding and verifies persisted cached-A evidence remains A. Actual request/worker rejection is covered separately by the retained Plan07 handler tests.
- Broad final gates, current live browser evidence and app-row comparisons remain root-owned Plan09 work. Earlier global baseline failures are not represented as passing by this summary.
- No implementation stubs block this plan. No unknown raw language was replaced with ja and no Japanese subtitle fallback was introduced.
- Plan161-09 can perform final integrated verification against completed source import, editing, playback and public projection.

## Self-Check: PASSED

All 16 listed implementation/contract/test files and this summary exist. All seven recorded task/deviation commits resolve in canonical Git. Required focused PostgreSQL gates executed without skips. Parent-owned evidence and central planning files were left untouched.
