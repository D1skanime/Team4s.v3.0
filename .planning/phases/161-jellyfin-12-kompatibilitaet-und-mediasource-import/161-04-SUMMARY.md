---
phase: 161-jellyfin-12-kompatibilitaet-und-mediasource-import
plan: "04"
subsystem: api
tags: [jellyfin, mediasource, import, contracts, auth-regression]
requires:
  - phase: 161-02
    provides: Typed private Jellyfin source snapshot and selected-source resolver
provides:
  - Additive import and editor source selectors with JSON-inaccessible server hydration
  - Canonical and focused source contracts including existing import preview/apply operations
  - Reviewed item/source validation throughout the existing import builder
affects: [161-05, 161-06, 161-07, 161-08, 161-09]
tech-stack:
  added: []
  patterns: [OptionalString selector presence, source-scoped nullable tracks, parsed contract fragment parity]
key-files:
  created:
    - backend/internal/models/jellyfin_source_contract_test.go
  modified:
    - backend/internal/models/episode_import.go
    - backend/internal/models/episode_version.go
    - frontend/src/types/episodeImport.ts
    - frontend/src/types/episodeVersion.ts
    - shared/contracts/openapi.yaml
    - shared/contracts/admin-content.yaml
    - shared/contracts/episode-versions.yaml
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/episodeImportMapping.test.ts
    - frontend/src/app/admin/anime/[id]/episodes/import/useEpisodeImportBuilder.ts
key-decisions:
  - "Use optional source IDs for old/unresolved projections, complete=false and null tracks for incomplete metadata, and complete=true plus [] for known-empty tracks."
  - "Create/Patch hydration uses JellyfinSource, FileName, Container, VideoCodec and AudioCodec with json:-; FileName is independent of the operator Title."
  - "Seed a mapping selector only at preview normalization; apply never repairs a lost or changed reviewed selector."
  - "D-16 remains presentation-only: unknown audio display defaults to Japanisch, raw language stays null, subtitles receive no default."
requirements-completed: [P161-SOURCE, P161-METADATA, P161-REGRESSION]
duration: approximately 25min
completed: 2026-09-15
---

# Phase 161 Plan 04: Source contracts and reviewed import identity Summary

**Reviewed Jellyfin item/source pairs now survive builder editing and apply serialization, with private server hydration and matching API contracts.**

## Performance

- Tasks: 3/3.
- Files: 11 implementation/contract/test files plus this summary.
- Execution: canonical /home/d1sk/team4s through SSH; Go and frontend checks ran in the existing Compose services.
- No database, migration, dependency, environment, service recreation, provider-library or media mutation.

## Accomplishments

- Import candidates carry source ID, container, completeness, selected audio index and reusable typed audio/subtitle arrays. Rows retain item identity and separately carry their reviewed source ID.
- Admin version, scan and create DTOs gain optional source IDs; patch uses OptionalString to distinguish omission, null and a supplied selector. Internal stream selection has private source ID/snapshot fields.
- Create/Patch server-only JellyfinSource, FileName, Container, VideoCodec and AudioCodec cannot be populated by JSON. The selected filename remains separate from the editable release title.
- Canonical OpenAPI now describes the existing preview/apply operations and their source payloads; focused contracts match the additional fields. Source conflict is documented as 409, invalid input as 400 and unavailable/failed provider handling as 502/503.
- Public subtitle metadata retains exactly language, label, format, forced and default; format means codec. Raw languages remain nullable. Unknown audio DISPLAY alone defaults to Japanisch.
- Existing builder normalization, conflict detection and apply serialization share the reviewed-source check. Missing, changed, incomplete or duplicated item/source projections cannot become applicable confirmed selections. Skipped rows remain non-persistent. Parallel releases, episode targets and fansub chips remain intact.
- The central browser API/auth boundary is unchanged.

## Task Commits

1. Task 1 RED: `de3b2f9b` — specify reviewed source and private hydration contracts.
2. Task 1 GREEN: `4596c16b` — additive DTOs and server-only hydration.
3. Task 2 RED: `236817ae` — parsed API/TypeScript source parity requirements.
4. Task 2 GREEN: `40d971ad` — canonical and focused source contracts.
5. Task 3 RED: `25e1a727` — builder source preservation and rejection regressions.
6. Task 3 GREEN: `8ce89152` — reviewed source propagation and validation.
7. Contract review correction: `bc25a5b5` — nullable unresolved selectors across canonical/focused contracts.

The orchestrator's intervening state/evidence commits are outside this executor's ownership.

## Verification

- Each task's RED gate failed for the missing behavior before implementation.
- `docker exec -w /app team4sv30-backend go test ./internal/models -run JellyfinSource -count=1` — passed.
- `docker exec -w /app team4sv30-backend go test ./internal/models -run TestJellyfinSourceContract -count=1` — passed, including final nullable-selector correction.
- `docker exec -w /app team4sv30-backend go test ./internal/models -count=1` — passed.
- `docker exec -w /app team4sv30-backend go build ./...` — passed.
- `docker exec team4sv30-frontend npx vitest run 'src/app/admin/anime/[id]/episodes/import' src/lib/api.auth-refresh.test.ts src/lib/api.no-token-boundary.test.ts` — 85/85 passed across four files: 43 mapping, 1 row component, 32 auth refresh, 9 token-boundary checks.
- Targeted ESLint for the three builder files and two changed TypeScript DTO files — passed without diagnostics.
- `docker exec team4sv30-frontend npm run typecheck` — exactly the two established baseline errors in generated Next page types: admin anime edit's formatEditLoadError export and admin anime list PageProps. No new diagnostics.
- `git diff --check` — passed.
- Backend image-copied Go files were synchronized with docker cp before testing; shared contract and frontend type mounts supplied contract fixtures.

## Request and Ownership Evidence

- Added provider HTTP calls: 0. Added SQL queries: 0. This plan changes contracts and client serialization; it introduces no provider request loop.
- The 11eyes-shaped regression has three actual item rows, each with its own source ID, grouped under one episode; edits and JSON serialization retain all three pairs.
- Source A replaced with source B, selector removal/null/blank, incomplete projection and duplicate item identity fail closed.
- No source path, upstream URL or private source ID was added to public DTOs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing contract coverage] Existing import endpoints were absent from canonical OpenAPI.**
- Found during Task 2.
- Added the existing preview/apply operations and their supporting schemas to canonical OpenAPI and focused admin documentation.
- No runtime endpoint was added. Consumers remain the existing import API helpers.
- Commit: `40d971ad`.

**2. [Rule 1 - Contract parity] Unresolved source selector nullability initially differed between canonical and frontend/focused declarations.**
- Found during final contract review.
- Aligned optional nullable candidate/mapping selectors and extended explicit null assertions.
- Commit: `bc25a5b5`.

## Issues Encountered

- The legacy admin-content document contains unrelated non-YAML prose/syntax (first full-parser failure at line 1133 before additions). Per the plan, tests parse only affected type fragments; scalar annotations containing colon-space are quoted for parsing without changing their string semantics. The full canonical OpenAPI is parsed.
- Installed GSD wrapper uses legacy positional commands, so init/state were read with `./scripts/gsd-linux.sh init execute-phase 161` and `./scripts/gsd-linux.sh state load`. Root owns STATE/ROADMAP/REQUIREMENTS updates.
- No authentication gates occurred.

## Known Stubs

No placeholder implementation or new mock-backed production UI was found. The source DTOs intentionally prepare later runtime hydration: Plan 05 supplies complete import candidates and server revalidation, Plan 06 applies authorized editor relinking, and Plan 07 consumes private stream selection. Until Plan 05 supplies complete source projections, the builder correctly blocks confirmation of incomplete candidates.

## Deferred Issues and Evidence Limits

- Global frontend typecheck has the two unchanged baseline failures described above.
- The broader lint/CSS/full-production-build failures documented in checks-baseline.json and extended-checks-baseline.json remain outside this plan. Those broad failing gates were not rerun without cause.
- Contract status documentation describes the approved integrated behavior; server apply/relink conflict handling remains assigned to Plans 05/06.
- No application rows were written and no live import/UAT success is claimed. Integrated live and broad gates remain Plan 09.

## Next Phase Readiness

Ready for Plan 161-05. Populate media_source_id, streams_complete=true, selected_audio_index and source-coherent tracks from the existing resolver. A complete source with no subtitles must emit []; omitted/incomplete data remains null/false. Revalidate the reviewed selector server-side rather than trusting posted metadata. Plan 06 must add MediaSourceID to the runtime metadata-only authorization exclusion before source mutation is implemented; this plan marks that semantic in DTO comments and contracts.

## Self-Check: PASSED

All 11 implementation/contract/test files and all seven task/review commits were verified on the canonical host. No tracked deletions occurred in this executor's commits.
