---
phase: 159-public-anime-detail-konsolidierung
plan: "01"
subsystem: api
tags: [anime, episodes, postgres, keyset, contracts, assignments]
requires:
  - phase: 158-public-anime-detail-reparatur
    provides: Verified public anime baseline and reusable ExistsVisible guard
provides:
  - Opt-in bounded public episode projection with stable episode identity and explicit variant/version IDs
  - Assignment-authoritative full segment metadata without removing admin fields
  - Canonical OpenAPI and compatible typed central API overload
  - Pre-change consumer matrix and isolated SQL/contract regression evidence
affects: [159-02, 159-03, 159-05]
tech-stack:
  added: []
  patterns: [atomic variant-or-neutral keyset rows, pre-limit window counts, existing authorizedFetch overload]
key-files:
  created:
    - backend/internal/repository/episode_version_public_query.go
    - backend/internal/repository/episode_version_public_integration_test.go
    - backend/internal/handlers/episode_version_public_test.go
    - frontend/src/lib/api.episode-versions.test.ts
    - frontend/src/types/__tests__/episode-version-contract.test.ts
    - .planning/phases/159-public-anime-detail-konsolidierung/159-01-CONSUMERS.md
  modified:
    - backend/internal/models/episode_version.go
    - backend/internal/handlers/episode_version_reads.go
    - backend/internal/repository/episode_version_repository.go
    - backend/internal/repository/episode_version_repository_read_helpers.go
    - backend/internal/repository/episode_version_repository_read_helpers_test.go
    - frontend/src/types/episodeVersion.ts
    - frontend/src/lib/api.ts
    - shared/contracts/openapi.yaml
key-decisions:
  - Keep full/default grouping and five production callers; public is an explicit options overload.
  - Reuse ExistsVisible, 24/100 cursor constants and trimCursorPage; public cursor validation is strictly anime-scoped.
  - Public count/default describe the complete episode; default is its smallest variant ID, stable across partial pages.
  - Full and public id remain variant aliases; canonical release_version_id is separate; playback collision resolution belongs to 159-02.
requirements-completed: [P159-05]
requirements-addressed: [P159-06, P159-07]
duration: 25min
completed: 2026-09-13
---

# Phase 159 Plan 01: Bounded public episodes and authoritative full contracts

**The existing episode endpoint now offers bounded public pages while preserving the complete admin response and deriving segment metadata from actual version assignments.**

## Performance and commits

- Implementation evidence window began with the pre-change matrix at `2026-09-13T21:54:15Z`; read-only preflight preceded it. Three tasks completed; 16 source/test/matrix files changed before this summary/evidence commit.
- Task 1 RED and consumer baseline: `819dac53`.
- Task 2 GREEN, repository/handler/DTO: `35a2da10`.
- Task 3 API RED: `52eec789`; contracts/API/typed consumer GREEN: `53f49e76`.
- Starting HEAD `7ced885e`; Phase-158 technical gate `c3bfcb23781addca1ccd3931592535416f706787`. No tracked file deletion, push or global tracking edit.

## Changes and consumer preservation

The [consumer matrix](159-01-CONSUMERS.md) was committed before product changes. It records all five production `getGroupedEpisodes` caller files and indirect admin lists, VersionRow, bulk, editor/workspace and neighbor consumers against every field. Calls without options retain their full return type and exact URL. The public page is not switched in this plan; that is 159-03.

`projection=public` uses one atomic row per variant, or one neutral row when an episode has no variant. `episode_id` keeps equal-number episodes distinct. Counts and the smallest-variant default are computed before seeking/LIMIT; a page may contain only some variants of an episode. Groups aggregate after the bounded page and cannot fan out its rows. Defaults are 24/max 100 plus one sentinel. Empty results and neutral `versions` serialize as arrays; `next_cursor` is explicitly null at the end. Cursor format/version/anime scope and malformed/conflicting options reject with 400 before SQL. The public visibility check reuses `ExistsVisible` from 158.

Both full SELECT/scanner paths now hydrate `variant_id` and canonical `release_version_id`; `id` remains a variant alias and `release_version` remains a label. Provider, item, coverage, CRC, production/release timing, duration, stream, segment and timestamp fields remain. Segment count/asset flags use `theme_segment_assignments.release_version_id=rev.id`, including when groups are omitted, and retain the existing nonblank release-asset source-ref meaning. Counts-only full responses deliberately normalize `versions:null` to `[]`, with optional default ID.

OpenAPI documents the actual plural `fansub_groups`, missing existing full fields, identities, options and public response. `anyOf` describes the response choice because empty neutral responses can satisfy both structural shapes; projection selects behavior. Public TS types derive only display/identity fields. `getGroupedEpisodes` forwards options and AbortSignal through existing `authorizedFetch`; it never loops through pages. Only two existing typed admin testfixtures needed additive ID/segment fields.

## Verification and measured budgets

[Evidence manifest](../../../docs/audits/2026-09-13-public-anime-detail/phase159/159-01/verification.json) and logs are in `docs/audits/2026-09-13-public-anime-detail/phase159/159-01/`.

| Check | Result |
|---|---|
| Real isolated PostgreSQL + handler regression | 8 top-level tests PASS, plus paging/invalid-input subcases |
| SQL per successful public page | Exactly 2 statements: 1 existence row plus at most limit+1 returned inventory rows |
| 125 variants + neutral, limit 1 | 126 pages, 126 unique rows, 72,082 total serialized bytes |
| Same inventory, limit 24 | 6 pages, 126 unique rows, 39,456 bytes |
| Same inventory, limit 100 | 2 pages, 126 unique rows, 38,362 bytes; maximum 101 inventory rows |
| Mixed fixture | 1,449 bytes; same-number episode IDs separate, no group/stream fanout |
| Full grouped/detail/Create/Patch/counts-only | PASS, including all preserved fields and assignment/range divergence |
| Frontend focused regression | 63 tests across 5 files PASS, including Admin consumers and missing/expired access with valid refresh |
| Typecheck / scoped lint | 0 errors / 0 errors and 0 warnings |
| Go vet / Go build | PASS in isolated scratch source |
| Canonical OpenAPI parse / diff check | PASS |

Tracer values are actual returned SQL rows, including metadata; they do not claim PostgreSQL scans only those physical rows internally. Byte totals are measured fixtures, not a universal cap. The pre-existing AnimeDetail neutral fallback is outside this grouped-projection budget.

Root completed the final live sync in one tarstream: all five source hashes match, PID 1/container remained unchanged, and Air replaced old child 4048 with the sole current child 4408 (`/app/tmp/air/server`, not deleted). Read-only `GET /api/v1/anime/1/episodes?projection=public&limit=1` returned 200/610 bytes, `episode_id=27`, explicit variant/version IDs, `has_more=true`, a cursor and `row_limit=1`. Root-owned evidence is `docs/audits/2026-09-13-public-anime-detail/phase159/root-runtime-sync-15901.json`.

## Deviations and issues

- **[Rule 3 - Blocking typed consumers]** Required runtime ID/segment fields exposed two incomplete admin testfixtures in `episodeNeighborNavigation.test.ts` and `episodeVersionEditorUtils.test.ts`. Added actual contract fields without product changes; both tests and full typecheck PASS in `53f49e76`.
- Initial isolated setup copied migrations one directory too deep; corrected the scratch-only path before the authoritative repository RED run. Initial aggregate failure is retained separately, not counted as SQL verification. The revised SQL guard tests assignment authority; authentic integration tests supply behavioral proof.
- No schema/product data migration, auth seam, route, endpoint or media registry was introduced. No goal-blocking stubs found. Threat mitigations T-159-01/02/03 are covered by strict parameter/cursor cases, actual bounded rows and identity/assignment fixtures.

## Cleanup and readiness

The only test PostgreSQL container, exact ID `59097488dd4d39da34bf7ae4c95b80b0ef733a7295e7df23859022f53bd08080`, was stopped and auto-removed. Its storage was tmpfs, with no host ports. The resolved owned `/app/tmp/phase15901` scratch directory was removed and absence verified. No live `.env`, media, volumes or database contents changed. `frontend/scripts/shot2.mjs` and root-owned evidence remain untouched by this plan's commits.

P159-06/P159-07 are addressed here at the contract/repository boundary; cross-plan completion remains partial until the stream chain/UI adoption and 159-05 verification.

159-02 can now consume explicit identities and prove playback selector ownership. Existing ambiguous OR-ID/default playback behavior is intentionally not claimed fixed here. 159-03 owns UI paging adoption; 159-05 owns full production/browser gates. The known unrelated full Next build export issue and baseline global lint/CSS-guard failures were not modified or reclassified. Human UAT 156/157/158 stays OPEN. Root owns STATE/ROADMAP/REQUIREMENTS updates.

## Self-Check: PASSED

All new source/test/matrix/evidence files and all four task commits exist. The final live response and five matching source hashes were inspected. No task commit deletes tracked files; owned test resources are absent. Global tracking and root-owned runtime/media evidence remain with the orchestrator.
