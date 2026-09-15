---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "06"
subsystem: release-editor
tags: [jellyfin, media-source, postgres, authorization, react, regression]
requires:
  - phase: 161-04
    provides: Optional source selectors and server-only hydration contracts
  - phase: 161-05
    provides: Locked source snapshot namespace and batch binding reader
provides:
  - Technical filename/container survive ordinary release metadata edits
  - Authorized explicit Jellyfin relinks validate ownership and update atomically
  - Source-aware folder scan and explicit editor selection preserve reviewed bindings
affects: [161-07, 161-08, 161-09]
tech-stack:
  added: []
  patterns:
    - Shared item/anime/source ownership validation across import and editor
    - Anime then source then variant lock ordering
    - Metadata patches omit unchanged source selectors
key-files:
  created:
    - backend/internal/repository/episode_version_source_integration_test.go
    - backend/internal/handlers/episode_version_source_hydration.go
    - backend/internal/handlers/episode_version_source_hydration_test.go
  modified:
    - backend/internal/repository/episode_version_repository.go
    - backend/internal/repository/episode_version_repository_write_helpers.go
    - backend/internal/repository/episode_version_public_integration_test.go
    - backend/internal/handlers/episode_version_create.go
    - backend/internal/handlers/episode_version_update.go
    - backend/internal/handlers/episode_version_validation.go
    - backend/internal/handlers/admin_episode_import.go
    - backend/internal/handlers/admin_content_episode_version_editor_scan.go
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts
    - frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx
    - frontend/src/app/admin/episode-versions/[versionId]/edit/episodeVersionEditorUtils.ts
    - shared/contracts/openapi.yaml
    - shared/contracts/episode-versions.yaml
key-decisions:
  - Human titles never generate technical filenames or containers.
  - Complete source replacements clear missing technical values; incomplete projections retain data only for the same binding.
  - Source selectors remain admin-only and pass shared ownership validation before repository mutation.
  - Scan uses one batch binding read and never stats a provider path on the application filesystem.
  - Normal editor saves omit unchanged binding fields and unchanged groups.
requirements-completed: [P161-SOURCE, P161-METADATA, P161-REGRESSION]
duration: 18min
completed: 2026-09-15
---

# Phase 161 Plan 06: Source-safe release editing Summary

**Ordinary release edits preserve technical file identity; explicit Jellyfin file changes validate the actual item/source and replace its metadata atomically.**

## Performance

- Recorded task commit span: approximately 18 minutes, beginning with first RED commit at 2026-09-15T14:42:59Z; context loading preceded that commit.
- Tasks: 3/3.
- Implementation/contract/test files: 16; this summary is additional.
- Canonical checkout: /home/d1sk/team4s through SSH team4s-linux.
- Root completed the frontend portion of Task 3 in the same checkout with exclusive ownership of its three files. STATE/ROADMAP/REQUIREMENTS/DECISIONS remain root-owned.

## Accomplishments

- Repository metadata writes retain filename, container and binding snapshot. Create no longer derives filename/container from a human title. Verified complete A-to-B relinks set B's filename/container/codecs/quality/duration, including null values, inside the existing transaction. Incomplete new B fails; incomplete same A can retain complete A evidence. Existing shared sources cannot silently be rebound to a different nested source or attached across anime ownership.
- Existing create/update endpoints hydrate explicit Jellyfin changes after authorization, normalize provider spelling, validate source-selector shape, retrieve the exact genuine item, verify anime series/folder and selected-source ownership, and use server-built credential-free stream URLs. Posted technical fields cannot supply the private hydration DTO. Metadata-only saves make zero Jellyfin requests; redundant same-binding selectors are stripped for admins. Contributors cannot submit binding selectors.
- Folder scan reads stored bindings in one batch and resolves one own source per genuine item. Selected source ID, filename, path and quality all come from the same resolver. Alternative ordering cannot switch the source. Ambiguous, incomplete new or foreign sources return the documented conflict; existing item-folder filtering remains.
- Existing editor layout and API client remain. Explicit selection carries the reviewed item/source pair, preserves an operator title and shows conflicts. Merely scanning does not bind a source. Ordinary full-form saves omit unchanged source selectors and groups; metadata-only saves omit selectors. Navigation races and a later file choice during an earlier save retain correct local state.

## Task Commits

| Task | RED | GREEN |
| --- | --- | --- |
| 1: Technical metadata preservation and atomic relink | `1ae6b913` | `96f38a93` |
| 2: Authorized source hydration | `96222109` | `d317a6fd` |
| 3: Backend source-aware scan | `e42ce033` | `6654871d` |
| 3: Frontend reviewed selection (root) | `eccb4584` | `ada632e1` |

Final scoped formatting: `3094355f` (`episode_version_repository_write_helpers.go`, formatting only). All task RED gates actually failed before implementation. No TDD gate was replaced by a passing baseline.

## Verification

All commands ran in existing Compose containers. Guarded PostgreSQL tests actually executed against unique schemas in `team4s_phase117_test_161`; none of the required DB cases was skipped. The DSN was derived from inspected container credentials in memory, URL-escaped, and supplied only through a subprocess environment to `docker exec -e TEAM4S_PHASE117_TEST_DSN`. No credentials or DSN were printed or persisted.

- Repository gate: `go test ./internal/repository -run 'TestEpisodeVersion(Source|Date)' -count=1 -v` — passed, including real metadata writes, create, complete/empty/incomplete relinks, full graph rollback, unaffected variants/groups and concurrent date updates.
- Combined final gate: `go test ./internal/handlers ./internal/repository -run 'Test.*(EpisodeVersionSource|EpisodeVersionDate|EpisodeVersionEditorContext|ReleaseMetadataOnly|EpisodeImport|11eyes)' -count=1` — both packages passed.
- Handler source gate includes metadata-only and redundant same-binding zero-request saves, authorized relink/create, malicious URLs/private-field payloads, missing selector, incomplete B, foreign series/item/source, upstream failure, unconfigured provider and contributor rejection. Failed mutation cases retain graph snapshots. Existing degraded editor cases stay green.
- Scan gate: `TestEpisodeVersionSourceHydrationFolderScan` — nine guarded cases passed: own source, reversed alternatives, complete-empty, same-source incomplete, new-source incomplete, ambiguous, outside source, wrong series and outside item. Scan graph snapshots remain unchanged.
- Contract gate: `go test ./internal/models -run TestJellyfinSourceContract -count=1` — passed.
- `go vet ./internal/handlers ./internal/repository` and `go build ./internal/handlers ./internal/repository` — passed.
- Root frontend evidence: 15 hook tests, 32 auth-refresh tests, 9 token-boundary tests, 26 utility tests and 17 page tests — 99 distinct tests passed. Hook RED reproduced six actual failures across the initial 13 tests.
- Root intermediate broad Go comparison after Task3: 1,972 pass events and 277 skip events in the broad suite; exactly the same 50 top-level failure headings as the prior baseline, with none added or removed. Evidence: docs/audits/2026-09-15-jellyfin12/backend-after06.json. It overlapped only formatting commit 3094355f; this is intermediate evidence and does not replace required no-skip focused gates or the later final repeat.
- Root scoped ESLint for all three frontend files — zero issues. Frontend typecheck retains exactly the two known Next page errors; no new error.
- `git diff --check` passed. Changed Go files checked with gofmt; the final formatting-only commit completed the remaining helper formatting.

### Request and query budgets

- Metadata-only PATCH: zero Jellyfin calls and no source-hydration context lookup. Redundant unchanged binding PATCH: zero Jellyfin calls.
- Explicit Jellyfin create/relink: one exact-item request and one source-binding batch read, plus the existing anime/current-version context reads as applicable.
- GetByID adds one fixed follow-up binding query only for a Jellyfin version, forwarding to the shared reader and reading real `stream_sources.metadata`.
- Nonempty scan: one binding batch for all items. The guarded fixture performs one series context lookup plus one collection request, with zero per-item source calls; collection pagination remains the existing bounded mechanism.
- Plan05 import regression unchanged: source requests for 0/1/100/101/201 confirmed items are 0/1/1/2/3; binding batch counts are 0/1/1/1/1. The 11eyes preview remains one collection request, 27 actual items despite 38 nested sources, and 26 after existing coverage filtering.

## Deviations from Plan

1. **[Rule 2 - Correctness/reuse] Shared ownership validation extraction.** Task2 moved the existing import apply item/anime/source checks into `resolveReviewedJellyfinSource`, used by import, editor hydration and scan. `admin_episode_import.go` is an additional file. Root explicitly accepted this bounded extraction; import/11eyes regression and budgets passed unchanged in `d317a6fd`.

2. **[Rule 3 - Fixture blocker] Real metadata schema in existing repository fixture.** The public integration fixture needed its missing `stream_sources.metadata` column for the actual reader. Added only to the guarded fixture in `96f38a93`; no production migration or compatibility SQL was introduced.

3. **[Rule 2 - Contract consistency] Selector validation documentation.** Existing OpenAPI and focused episode-version contracts now document bounded nonblank, non-comma source selectors and explicit-null PATCH rejection. These are existing endpoints/DTOs, with no new runtime surface, in `d317a6fd`.

4. **[Rule 2 - Reuse] Existing frontend fallback carries source ID.** Root added one line in `buildFallbackMediaFile` to retain the existing optional version source field, avoiding duplicate fallback construction in the hook, in `ada632e1`.

The existing scan's `os.Stat(itemPath)` was removed while replacing its item-level projection. The typed provider response does not supply verified size/modified-time evidence; those optional fields remain absent. No local filesystem access based on a provider path was added. No new picker, layout, auth mechanism, dependencies or schema was introduced.

## Issues and Evidence Limits

- The create endpoint test initially lacked its concrete authz repository; the isolated fixture was completed with the real existing role reader and admin role row, then passed. No authentication or runtime setup change was needed.
- All source snapshot paths remain in private server fields or the existing authorized admin file DTO; no private snapshot was added to public ReleaseStreamSource JSON.
- Unknown audio/subtitle languages remain raw null values. This plan does not implement the later display-only Japanisch default.
- Backend /app is image-copied: coherent changed source/test files were copied before checks. Production Go copies can trigger Air rebuild/restart; no service was recreated. Frontend /app remains bind mounted.
- No application database rows, Jellyfin library contents, runtime environment, migrations or dependencies were changed.
- Broad gates/live UAT remain Plan09 work. Existing baseline artifacts under `docs/audits/2026-09-15-jellyfin12` still document the unrelated two Next type errors, 13 lint errors/328 warnings, two CSS test failures/three TODOs and the known production-build export failure. These were not repaired here.
- No known implementation stubs block this plan. Optional absent scan size/date are unavailable metadata, not fabricated values.

## Next Plan Readiness

Plan161-07 can proceed: verified source snapshots and stable editor source selection are available, while normal release edits preserve existing technical identity. Integrated live evidence and broad baseline comparison remain assigned to Plan161-09.

## Self-Check: PASSED

All 16 listed implementation/contract/test files and this summary exist. All nine recorded task/formatting commits resolve in canonical Git. Focused task gates passed; parent owns phase-level bookkeeping.
