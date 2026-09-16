---
phase: quick
plan: 260916-ako
subsystem: frontend-contracts
tags: [jellyfin, source-identity, import, regression]
requires: [260916-ako-ANALYSIS]
provides: [pair-scoped-import-controls, strict-confirmed-command-type, multi-source-editor-choices]
affects: [episode-import, episode-version-editor]
key-decisions:
  - Reuse one JSON-tuple key helper across import and editor; no path identity.
  - Confirmed apply commands have a required source selector; unresolved/skipped projections remain optional.
completed: 2026-09-16
---
# Quick 260916-ako Task 2: Frontend and contract summary

Import controls, pending state, React keys and single-row removal now use the reviewed Item/MediaSource pair; sibling files remain independently selectable and serializable.

## Commits
- RED `52e34e5b`: expose sibling source import UI collisions.
- GREEN `dfc548a5`: scope import actions to reviewed source pairs.

Task 2 only. Root owns final integration, production build, browser evidence, shared SUMMARY/STATE and final docs commit. No backend, database, provider or NAS writes performed by this executor.

## Changed behavior
- One collision-safe JSON-tuple helper, `frontend/src/lib/jellyfinSourceIdentity.ts`, serves import helper/hook/cards/page and editor file React keys. It never uses file paths.
- Every single-row target, release-version, group-chip, skip and apply operation matches its exact pair. Applied rows are removed by pair; same-Item siblings remain.
- Reviewed candidate lookup is exact-pair based. The existing stream-completeness guard remains; selector repair is still forbidden at apply.
- Confirmed duplicate pairs and physical-source aliases conflict before serialization. Different sources of the same Item are allowed. Skipped unresolved rows remain non-persistent.
- `EpisodeImportApplyMappingRow` represents confirmed commands with mandatory string `media_source_id`, or skipped rows; API transport still uses the central client.
- Unmapped counts use mapping rows, not diagnostic Item IDs.
- Editor scanning leaves an unresolved current Item unresolved when several sibling files exist. A unique scan candidate retains prior behavior; explicit file selection sends the exact chosen pair.
- OpenAPI and focused contracts document complete source enumeration, authoritative alias deduplication, source-level existing-import suppression, pair commands and exact error distinctions confirmed with backend owner: malformed/missing/mismatched/duplicate exact pair = 400; foreign/stale source, physical aliases across different pairs or ownership/evidence conflicts = 409.
- Existing card structure/controls preserved. Correct umlauts used in touched row action/search copy.

## Files
Frontend:
- frontend/src/lib/jellyfinSourceIdentity.ts
- frontend/src/types/episodeImport.ts
- frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
- frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
- frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.tsx
- frontend/src/app/admin/anime/[id]/episodes/import/page.tsx
- frontend/src/app/admin/episode-versions/[versionId]/edit/EpisodeVersionEditorPage.tsx
- frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.ts
Tests:
- frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
- frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.test.tsx (new)
- frontend/src/app/admin/anime/[id]/episodes/import/EpisodeImportMappingRow.test.tsx
- frontend/src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx
Contracts:
- shared/contracts/openapi.yaml
- shared/contracts/admin-content.yaml
- shared/contracts/episode-versions.yaml

## Verification
All frontend commands ran in the existing Linux Docker frontend, canonical repository; no host dependency installation.

RED: focused mapping/row/hook/editor run produced **8 expected failures, 73 passing tests** before implementation. Failures demonstrated same-Item review rejection, duplicate-pair acceptance, Item-only actions/counts, missing pending/single-row apply, and arbitrary editor source selection. Committed before production changes.

GREEN command:
`docker exec -w /app team4sv30-frontend npx vitest run 'src/app/admin/anime/[id]/episodes/import' 'src/app/admin/episode-versions/[versionId]/edit/useEpisodeVersionEditor.test.tsx' src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts`
Result: **6 files / 124 tests PASS**. Includes central refresh-only/expired-access session and no-token-boundary regressions, exact two-source bulk JSON, pair pending state/removal, alias rejection and JSON delimiter collision check.

`docker exec -w /app team4sv30-frontend npm run typecheck`: PASS (last run after final code edits).

Scoped ESLint across changed frontend owners/tests: **0 errors, 12 pre-existing native-control warnings**. No native controls were introduced. Global checks/build remain root integration responsibility.

`git diff --check`: PASS before GREEN commit. Commit deletion check: no deletions.

YAML validation: complete canonical OpenAPI parses. Both focused YAML documents already fail global PyYAML parsing on unchanged baseline `44268512`: admin-content.yaml line 1178 (`"uninitialized"` list item followed by unquoted text); episode-versions.yaml line 481 (unquoted colon). Same errors at same lines in working files. Changed import endpoint/type/identity subtrees and changed editor scan/source-contract subtrees parse successfully. Unrelated historical YAML errors were not modified.

## Deviations
- Small shared `lib/jellyfinSourceIdentity.ts` is an intentional addition to the plan file list. Using one helper for import and editor avoids duplicate key logic or making the editor depend on an import page module. No registry or new API.
- `useEpisodeVersionEditor.ts` required the matching guard alongside the planned editor page/test files; its existing first-match fallback was unsafe once scan returns sibling sources.

## Deferred / remaining
- Root must finish backend and perform integrated/live preview checks before reporting the whole quick complete.
- No Human-UAT approval claimed.
- Global focused-contract YAML syntax defects predate this task and remain out of scope.
- Root reported baseline Next production type validation fails at unrelated anime/create page export `buildCreateSuccessMessage`; frontend executor did not change it.

## Stub and threat review
No new placeholder data, stubs, endpoints, auth paths, file IO or network wrappers introduced. JSON keys are internal UI identity only; backend remains authoritative for source membership, alias evidence and ownership.

## Self-Check: PASSED
Both commit objects and new helper/test files verified to exist. Task code committed; this summary intentionally remains uncommitted for root integration.
